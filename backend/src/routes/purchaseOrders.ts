import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import PurchaseOrder from '../models/PurchaseOrder';
import PurchaseRequest from '../models/PurchaseRequest';
import AccountsPayable from '../models/AccountsPayable';
import Category from '../models/Category';
import User from '../models/User';
import mongoose from 'mongoose';

const router = express.Router();

// 모든 구매주문 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, supplier, startDate, endDate } = req.query;
    const query: any = {};

    if (status) query.status = status;
    if (supplier) query.supplier = supplier;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate as string);
      if (endDate) query.orderDate.$lte = new Date(endDate as string);
    }

    const purchaseOrders = await PurchaseOrder.find(query)
      .populate('supplier', 'name email phone')
      .populate('purchaseRequest', 'prNumber')
      .populate('createdBy', 'username firstName lastName')
      .populate('approvedBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.json(purchaseOrders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매주문 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone')
      .populate('purchaseRequest', 'prNumber')
      .populate('createdBy', 'username firstName lastName')
      .populate('approvedBy', 'username firstName lastName');

    if (!po) {
      return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
    }

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매주문 생성
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('supplier').notEmpty().withMessage('공급업체를 선택하세요.'),
    body('items').isArray({ min: 1 }).withMessage('최소 1개 이상의 항목이 필요합니다.'),
    body('items.*.description').trim().notEmpty().withMessage('항목 설명을 입력하세요.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('수량은 1 이상이어야 합니다.'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('단가는 0 이상이어야 합니다.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      console.log('구매주문 생성 요청:', {
        userId: req.userId,
        userRole: req.userRole,
        body: req.body,
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('검증 오류:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      // 카테고리 코드 검증
      if (req.body.items) {
        for (const item of req.body.items) {
          if (item.categoryCode) {
            const category = await Category.findOne({
              code: item.categoryCode.toUpperCase(),
              isActive: true,
            });
            if (!category) {
              return res.status(400).json({
                message: `유효하지 않은 카테고리 코드입니다: ${item.categoryCode}`,
              });
            }
          }
        }
      }

      // Pre-save hook handles poNumber, remainingAmount, calculations
      const subtotal = req.body.items.reduce((sum: number, item: any) => sum + (item.total || item.quantity * item.unitPrice), 0);
      const total = subtotal + (req.body.tax || 0) + (req.body.shippingCost || 0) - (req.body.discount || 0);

      const poData = {
        ...req.body,
        createdBy: req.userId,
        subtotal,
        total,
        orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
        currency: req.body.currency || 'USD',
        status: 'draft',
      };

      console.log('구매주문 데이터:', poData);

      const po = new PurchaseOrder(poData);
      await po.save();

      console.log('생성된 구매주문:', po);

      await po.populate('supplier', 'name email phone');
      await po.populate('purchaseRequest', 'prNumber');

      res.status(201).json(po);
    } catch (error: any) {
      console.error('구매주문 생성 오류:', error);
      res.status(500).json({ message: error.message || '구매주문 생성 중 오류가 발생했습니다.' });
    }
  }
);

// 구매주문 업데이트
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
    }

    if (po.status !== 'draft' && po.status !== 'cancelled') {
      return res.status(400).json({ message: '발송된 구매주문은 수정할 수 없습니다.' });
    }

    const updates = req.body;

    // if it was cancelled, we might want to revive it to draft if not explicitly set?
    // The frontend sends the whole object, likely preserving 'status' or not?
    // If the intention of 'Edit' on cancelled is to revive, we should ensure it goes back to draft.
    if (po.status === 'cancelled') {
      updates.status = 'draft';
      po.status = 'draft'; // Explicitly set for logic below

      // If this PO has a linked PR, re-claim it
      if (po.purchaseRequest) {
        const pr = await PurchaseRequest.findById(po.purchaseRequest);
        if (pr) {
          pr.convertedToPO = po._id as any;
          pr.status = 'converted';
          await pr.save();
        }
      }
    }

    Object.keys(updates).forEach(key => {
      // Safe update filtering could be here
      if (key !== '_id' && key !== 'poNumber' && key !== 'createdAt' && key !== 'updatedAt') {
        (po as any)[key] = updates[key];
      }
    });

    // 총액 재계산 done by pre-save
    await po.save();
    await po.populate('supplier', 'name email phone');

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매주문 승인
router.post('/:id/approve', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
    }

    if (po.status !== 'draft') {
      return res.status(400).json({ message: '초안 상태의 구매주문만 승인할 수 있습니다.' });
    }

    po.status = 'sent';
    po.approvedBy = req.userId as any;
    po.approvedAt = new Date();

    await po.save();

    // Auto Create AP in try-catch to prevent blocking PO approval on AP failure
    try {
      // Check for existing AP
      const existingAP = await AccountsPayable.findOne({ purchaseOrder: po._id });
      if (!existingAP && po.supplier) {
        // Default 30 days if no terms or specific logic
        const dueDate = new Date(po.orderDate || new Date());
        dueDate.setDate(dueDate.getDate() + 30);

        // Normalize Payment Method
        let paymentMethod: any = po.paymentMethod;
        const validMethods = ['cash', 'bank_transfer', 'check', 'credit_card'];
        if (!paymentMethod || !validMethods.includes(paymentMethod)) {
          paymentMethod = 'bank_transfer'; // Default fallback
        }

        const isCreditCard = paymentMethod === 'credit_card';
        const paidAmount = isCreditCard ? po.total : 0;
        const remainingAmount = isCreditCard ? 0 : po.total;
        const status = isCreditCard ? 'paid' : 'pending';
        const paymentStatus = isCreditCard ? 'paid' : 'unpaid';

        const payments = isCreditCard ? [{
          paymentDate: new Date(),
          amount: po.total,
          paymentMethod: 'credit_card',
          referenceNumber: `CC-${po.poNumber}`,
          notes: 'Credit Card Auto-Payment',
        }] : [];

        const ap = new AccountsPayable({
          purchaseOrder: po._id,
          supplier: po.supplier,
          subtotal: po.subtotal || 0,
          tax: po.tax || 0,
          discount: po.discount || 0,
          total: po.total || 0,
          paidAmount,
          remainingAmount,
          dueDate,
          paymentTerms: po.paymentTerms || 'Net 30',
          currency: po.currency || 'USD',
          paymentMethod,
          status,
          paymentStatus,
          createdBy: req.userId,
          payments,
        });

        await ap.save();
        console.log(`AP Auto-Created: ${ap.apNumber}`);
      } else if (existingAP && !existingAP.locationId && po.locationId) {
        // Repair "invisible" AP that was created without locationId
        existingAP.locationId = po.locationId;
        await existingAP.save();
        console.log(`AP Repaired (Added LocationId): ${existingAP.apNumber}`);
      }
    } catch (apError) {
      console.error('Failed to auto-create AP:', apError);
      // We do NOT return error here, to ensure PO approval succeeds even if AP fails
    }

    await po.populate('approvedBy', 'username firstName lastName');

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매주문 확인 (공급업체 확인)
router.post('/:id/confirm', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
    }

    if (po.status !== 'sent') {
      return res.status(400).json({ message: '발송된 구매주문만 확인할 수 있습니다.' });
    }

    po.status = 'confirmed';
    await po.save();

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매주문 취소
router.put(
  '/:id/cancel',
  authenticate,
  authorize('admin', 'manager'),
  async (req: AuthRequest, res: Response) => {
    try {
      const po = await PurchaseOrder.findById(req.params.id);
      if (!po) {
        return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
      }

      if (po.status === 'received' || po.status === 'invoiced' || po.status === 'paid') {
        return res.status(400).json({ message: '이미 처리된 주문은 취소할 수 없습니다.' });
      }

      po.status = 'cancelled';
      await po.save();

      // 연관된 PR이 있다면 다시 원복 (convertedToPO 해제)
      if (po.purchaseRequest) {
        const pr = await PurchaseRequest.findById(po.purchaseRequest);
        if (pr) {
          pr.convertedToPO = undefined; // undefined or null to unset
          // status가 'converted'였다면 'approved'로 되돌림 (다시 PO 생성 가능하도록)
          if (pr.status === 'converted' || pr.convertedToPO) { // check convertedToPO just in case
            pr.status = 'approved';
          }
          await pr.save();
        }
      }

      res.json(po);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 입고 처리
router.post(
  '/:id/receive',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('items').isArray().withMessage('입고 항목을 입력하세요.'),
    body('items.*.productId').notEmpty().withMessage('제품 ID가 필요합니다.'),
    body('items.*.receivedQuantity').isInt({ min: 0 }).withMessage('입고 수량을 입력하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, actualDeliveryDate } = req.body;
      const po = await PurchaseOrder.findById(req.params.id);

      if (!po) {
        return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
      }

      if (po.status === 'cancelled') {
        return res.status(400).json({ message: '취소된 구매주문은 입고할 수 없습니다.' });
      }

      // 입고 수량 업데이트
      po.items.forEach((poItem: any) => {
        const receivedItem = items.find(
          (ri: any) => String(poItem.product) === String(ri.productId) || String(poItem._id) === String(ri.productId)
        );

        if (receivedItem) {
          const newReceivedQty = (poItem.receivedQuantity || 0) + receivedItem.receivedQuantity;
          if (newReceivedQty > poItem.quantity) {
            throw new Error(`입고 수량이 주문 수량을 초과할 수 없습니다. (${poItem.description})`);
          }
          poItem.receivedQuantity = newReceivedQty;
        }
      });

      if (actualDeliveryDate) {
        po.actualDeliveryDate = new Date(actualDeliveryDate);
      }

      // The pre-save hook will update status to 'received' or 'partial'
      await po.save();

      // 입고 완료 확인 & AP 생성
      if (po.status === 'received') {
        // AP 자동 생성 (이미 생성되지 않은 경우)
        const existingAP = await AccountsPayable.findOne({ purchaseOrder: po._id });
        if (!existingAP) {
          const dueDate = new Date(po.orderDate);
          dueDate.setDate(dueDate.getDate() + 30); // 기본 30일 -> maybe use paymentTerms

          // 크레딧 카드 결제인 경우 자동으로 지급 완료 처리
          const isCreditCard = po.paymentMethod === 'credit_card';
          const paidAmount = isCreditCard ? po.total : 0;
          const remainingAmount = isCreditCard ? 0 : po.total;
          const status = isCreditCard ? 'paid' : 'pending';
          const paymentStatus = isCreditCard ? 'paid' : 'unpaid';

          const payments = isCreditCard ? [{
            paymentDate: new Date(),
            amount: po.total,
            paymentMethod: 'credit_card',
            referenceNumber: `CC-${po.poNumber}`,
            notes: '크레딧 카드 자동 지급',
            // receiptAttachments: po.receiptAttachments || [], // not in IAccountsPayable schema currently
          }] : [];

          const ap = new AccountsPayable({
            // apNumber handled by pre-save
            purchaseOrder: po._id,
            supplier: po.supplier,
            subtotal: po.subtotal,
            tax: po.tax,
            discount: po.discount,
            total: po.total,
            paidAmount,
            remainingAmount,
            dueDate,
            paymentTerms: po.paymentTerms,
            currency: po.currency,
            paymentMethod: po.paymentMethod as any, // Cast if needed
            status,
            paymentStatus,
            createdBy: req.userId,
            payments,
          });

          await ap.save();
        }
      }

      res.json(po);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 구매주문 취소
router.post('/:id/cancel', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const po = await PurchaseOrder.findById(req.params.id);

    if (!po) {
      return res.status(404).json({ message: '구매주문을 찾을 수 없습니다.' });
    }

    if (po.status === 'received' || po.status === 'cancelled') {
      return res.status(400).json({ message: '이미 입고되었거나 취소된 구매주문입니다.' });
    }

    po.status = 'cancelled';
    if (reason) {
      po.notes = (po.notes || '') + `\n취소 사유: ${reason}`;
    }
    await po.save();

    // 연관된 AP가 있다면 함께 취소
    const ap = await AccountsPayable.findOne({ purchaseOrder: po._id });
    if (ap) {
      // 이미 지급된 건은 취소 불가 (또는 경고) - 여기서는 강제 취소보다는 상태 동기화
      if (ap.paymentStatus === 'paid') {
        // Log warning or handle differently? 
        // User asked: "PO 취소시에는 카드 결제가 안되서 AP 자체가 안뜨게 하면 될것 같아"
        // If it was auto-paid by Credit Card, we should probably cancel it too since the transaction didn't happen potentially?
        // However, if it's a real accounting record, we shouldn't just delete.
        // Let's set status to cancelled.
        console.warn(`Warning: Cancelling AP ${ap.apNumber} which was marked as paid.`);
      }
      ap.status = 'cancelled';
      ap.notes = (ap.notes || '') + '\n구매주문 취소로 인한 자동 취소';
      await ap.save();
    }

    res.json(po);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
