import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import AccountsPayable from '../models/AccountsPayable';
import PurchaseOrder from '../models/PurchaseOrder';
import Supplier from '../models/Supplier';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// 모든 매입채무 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, paymentStatus, supplier, overdue } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (supplier) query.supplier = supplier;

    // 만료된 항목 필터링 (DB Level where possible)
    if (overdue === 'true') {
      // Complex condition: status=overdue OR (dueDate < now AND paymentStatus != paid)
      query.$or = [
        { status: 'overdue' },
        {
          dueDate: { $lt: new Date() },
          paymentStatus: { $ne: 'paid' }
        }
      ];
    }

    const payables = await AccountsPayable.find(query)
      .populate('supplier', 'name email phone')
      .populate('purchaseOrder', 'poNumber orderDate')
      .populate('createdBy', 'username firstName lastName')
      .sort({ dueDate: 1 });

    res.json(payables);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 매입채무 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ap = await AccountsPayable.findById(req.params.id)
      .populate('supplier', 'name email phone')
      .populate('purchaseOrder', 'poNumber orderDate')
      .populate('createdBy', 'username firstName lastName');

    if (!ap) {
      return res.status(404).json({ message: '매입채무를 찾을 수 없습니다.' });
    }

    res.json(ap);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 매입채무 생성 (수동)
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('purchaseOrder').notEmpty().withMessage('구매주문을 선택하세요.'),
    body('supplier').notEmpty().withMessage('공급업체를 선택하세요.'),
    body('total').isFloat({ min: 0 }).withMessage('총액은 0 이상이어야 합니다.'),
    body('dueDate').isISO8601().withMessage('만료일을 입력하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 중복 확인
      const existingAP = await AccountsPayable.findOne({ purchaseOrder: req.body.purchaseOrder });
      if (existingAP) {
        return res.status(400).json({ message: '이 구매주문에 대한 매입채무가 이미 존재합니다.' });
      }

      // Remaining Amount, Status handled by Pre-Save Hook

      const ap = new AccountsPayable({
        ...req.body,
        createdBy: req.userId,
        currency: req.body.currency || 'USD',
      });

      await ap.save();

      await ap.populate('supplier', 'name email phone');
      await ap.populate('purchaseOrder', 'poNumber');

      res.status(201).json(ap);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 지급 처리
router.post(
  '/:id/pay',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('지급 금액을 입력하세요.'),
    body('paymentDate').isISO8601().withMessage('지급일을 입력하세요.'),
    body('paymentMethod').isIn(['cash', 'bank_transfer', 'check', 'credit_card']).withMessage('지급 방법을 선택하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { amount, paymentDate, paymentMethod, referenceNumber, notes, receiptAttachments } = req.body;
      const ap = await AccountsPayable.findById(req.params.id);

      if (!ap) {
        return res.status(404).json({ message: '매입채무를 찾을 수 없습니다.' });
      }

      if (ap.paymentStatus === 'paid') {
        return res.status(400).json({ message: '이미 전액 지급된 항목입니다.' });
      }

      const newPaidAmount = (ap.paidAmount || 0) + amount;
      if (newPaidAmount > ap.total) {
        return res.status(400).json({ message: '지급 금액이 총액을 초과할 수 없습니다.' });
      }

      // 지급 기록 추가
      ap.payments.push({
        paymentDate: new Date(paymentDate),
        amount,
        paymentMethod,
        referenceNumber,
        notes,
        // receiptAttachments // assuming schema supports this, seemingly not in viewed schema but passed in logic?
        // In the existing code it passed receiptAttachments but schema view didn't show it explicitly in PaymentSchema?
        // Checked step 161: PaymentSchema doesn't have receiptAttachments. I will omit it to avoid error or assume it needs schema update later.
        // Actually the user's code passed it to db.create/update, so it might have been unstructured.
        // I will omit for now to respect schema.
      });

      ap.paidAmount = newPaidAmount;

      // Status update logic is in pre-save hook
      await ap.save();

      await ap.populate('supplier', 'name email phone');
      await ap.populate('purchaseOrder', 'poNumber');

      res.json(ap);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 매입채무 업데이트
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const ap = await AccountsPayable.findById(req.params.id);

    if (!ap) {
      return res.status(404).json({ message: '매입채무를 찾을 수 없습니다.' });
    }

    if (ap.paymentStatus === 'paid') {
      return res.status(400).json({ message: '전액 지급된 항목은 수정할 수 없습니다.' });
    }

    // paidAmount는 직접 수정 불가
    const { paidAmount, ...updateData } = req.body;

    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== 'apNumber' && key !== 'createdAt' && key !== 'updatedAt') {
        (ap as any)[key] = updateData[key];
      }
    });

    await ap.save();

    await ap.populate('supplier', 'name email phone');
    await ap.populate('purchaseOrder', 'poNumber');

    res.json(ap);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 매입채무 취소
router.post('/:id/cancel', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const ap = await AccountsPayable.findById(req.params.id);

    if (!ap) {
      return res.status(404).json({ message: '매입채무를 찾을 수 없습니다.' });
    }

    if (ap.paidAmount > 0) {
      return res.status(400).json({ message: '지급이 발생한 항목은 취소할 수 없습니다.' });
    }

    ap.status = 'cancelled';
    if (reason) {
      ap.notes = (ap.notes || '') + `\n취소 사유: ${reason}`;
    }

    await ap.save();
    res.json(ap);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 지급 내역 조회
router.get('/:id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const ap = await AccountsPayable.findById(req.params.id);

    if (!ap) {
      return res.status(404).json({ message: '매입채무를 찾을 수 없습니다.' });
    }

    res.json(ap.payments || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 지급 일정 조회 (예정된 지급)
router.get('/payment-schedule', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, supplier } = req.query;
    const query: any = {
      paymentStatus: { $ne: 'paid' }
    };

    if (supplier) query.supplier = supplier;
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate as string);
      if (endDate) query.dueDate.$lte = new Date(endDate as string);
    }

    const schedule = await AccountsPayable.find(query)
      .populate('supplier', 'name email phone')
      .populate('purchaseOrder', 'poNumber')
      .sort({ dueDate: 1 });

    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 기간별 지급 내역 조회
router.get('/payment-history', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, paymentMethod, supplier } = req.query;

    // Aggregate to unwind payments and filter
    const pipeline: any[] = [
      { $unwind: '$payments' }
    ];

    const match: any = {};
    if (supplier) match.supplier = new mongoose.Types.ObjectId(supplier as string);
    if (paymentMethod) match['payments.paymentMethod'] = paymentMethod;
    if (startDate || endDate) {
      match['payments.paymentDate'] = {};
      if (startDate) match['payments.paymentDate'].$gte = new Date(startDate as string);
      if (endDate) match['payments.paymentDate'].$lte = new Date(endDate as string);
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({ $sort: { 'payments.paymentDate': -1 } });

    // Lookup supplier
    pipeline.push({
      $lookup: {
        from: 'suppliers',
        localField: 'supplier',
        foreignField: '_id',
        as: 'supplierData'
      }
    });
    pipeline.push({ $unwind: { path: '$supplierData', preserveNullAndEmptyArrays: true } });

    // Lookup PO
    pipeline.push({
      $lookup: {
        from: 'purchaseorders',
        localField: 'purchaseOrder',
        foreignField: '_id',
        as: 'purchaseOrderData'
      }
    });
    pipeline.push({ $unwind: { path: '$purchaseOrderData', preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $project: {
        apNumber: 1,
        supplierData: { name: 1, email: 1, phone: 1 },
        purchaseOrderData: { poNumber: 1 },
        paymentDate: '$payments.paymentDate',
        amount: '$payments.amount',
        paymentMethod: '$payments.paymentMethod',
        referenceNumber: '$payments.referenceNumber',
        notes: '$payments.notes'
      }
    });

    const paymentHistory = await AccountsPayable.aggregate(pipeline);
    res.json(paymentHistory);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 공급업체별 지급 현황
router.get('/supplier-summary', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const summary = await AccountsPayable.aggregate([
      {
        $group: {
          _id: '$supplier',
          totalAmount: { $sum: '$total' },
          paidAmount: { $sum: '$paidAmount' },
          remainingAmount: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
          paidCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] }
          },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$paymentStatus', 'paid'] }
                  ]
                }, 1, 0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          supplierId: '$_id',
          supplierName: '$supplier.name',
          supplierEmail: '$supplier.email',
          totalAmount: 1,
          paidAmount: 1,
          remainingAmount: 1,
          count: 1,
          paidCount: 1,
          overdueCount: 1
        }
      },
      { $sort: { remainingAmount: -1 } }
    ]);

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 지급 방법별 통계
router.get('/payment-method-stats', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const match: any = {};
    if (startDate || endDate) {
      match['payments.paymentDate'] = {};
      if (startDate) match['payments.paymentDate'].$gte = new Date(startDate as string);
      if (endDate) match['payments.paymentDate'].$lte = new Date(endDate as string);
    }

    const stats = await AccountsPayable.aggregate([
      { $unwind: '$payments' },
      { $match: match },
      {
        $group: {
          _id: '$payments.paymentMethod',
          totalAmount: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 대시보드 통계
router.get('/dashboard/stats', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const match: any = {};
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate as string);
      if (endDate) match.createdAt.$lte = new Date(endDate as string);
    }

    // Parallel execution for dashboard stats
    const [summaryResult, statusCounts, paymentStatusCounts] = await Promise.all([
      AccountsPayable.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$total' },
            paidAmount: { $sum: '$paidAmount' },
            remainingAmount: { $sum: '$remainingAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      AccountsPayable.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            amount: { $sum: '$remainingAmount' }
          }
        }
      ]),
      AccountsPayable.aggregate([
        { $match: match },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            amount: { $sum: '$remainingAmount' }
          }
        }
      ])
    ]);

    const summary = summaryResult.length > 0 ? summaryResult[0] : { totalAmount: 0, paidAmount: 0, remainingAmount: 0, count: 0 };

    // Overdue
    const overdueResult = await AccountsPayable.aggregate([
      {
        $match: {
          dueDate: { $lt: new Date() },
          paymentStatus: { $ne: 'paid' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$remainingAmount' }
        }
      }
    ]);
    const overdue = overdueResult.length > 0 ? { count: overdueResult[0].count, amount: overdueResult[0].amount } : { count: 0, amount: 0 };


    // This Month Due
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthDueResult = await AccountsPayable.aggregate([
      {
        $match: {
          dueDate: { $gte: thisMonthStart, $lte: thisMonthEnd },
          paymentStatus: { $ne: 'paid' }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: '$remainingAmount' }
        }
      }
    ]);
    const thisMonthDue = thisMonthDueResult.length > 0 ? { count: thisMonthDueResult[0].count, amount: thisMonthDueResult[0].amount } : { count: 0, amount: 0 };

    // Recent Payments (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPaymentsResult = await AccountsPayable.aggregate([
      { $unwind: '$payments' },
      {
        $match: {
          'payments.paymentDate': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$payments.amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    const recentPayments = recentPaymentsResult.length > 0 ? { totalPaid: recentPaymentsResult[0].totalPaid, count: recentPaymentsResult[0].count } : { totalPaid: 0, count: 0 };

    res.json({
      summary,
      statusCounts,
      paymentStatusCounts,
      overdue,
      thisMonthDue,
      recentPayments,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
