import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import PurchaseRequest from '../models/PurchaseRequest';
import User from '../models/User';
import PurchaseOrder from '../models/PurchaseOrder';
import mongoose from 'mongoose';
import { db } from '../db/memoryDB'; // keeping temporarily for lookup tables if needed, or remove if all are models

const router = express.Router();

// 모든 구매요청 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, department, requestedBy } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.department = department;
    if (requestedBy) query.requestedBy = requestedBy;

    // 일반 직원은 자신의 요청만 조회 가능
    if (req.userRole !== 'admin' && req.userRole !== 'manager') {
      query.requestedBy = req.userId;
    }

    const purchaseRequests = await PurchaseRequest.find(query)
      .populate('requestedBy', 'username firstName lastName')
      .populate('approvedBy', 'username firstName lastName')
      .populate('company', 'code name')
      //.populate('project', 'projectCode projectName') // Project model might not be fully ready, but standard populate
      .sort({ createdAt: -1 });
    res.json(purchaseRequests);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매요청 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id)
      .populate('requestedBy', 'username firstName lastName email')
      .populate('approvedBy', 'username firstName lastName')
      .populate('convertedToPO', 'poNumber status')
      .populate('company', 'code name');

    if (!pr) {
      return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
    }

    // 권한 확인
    if (req.userRole !== 'admin' && req.userRole !== 'manager' && String(pr.requestedBy._id) !== String(req.userId)) {
      return res.status(403).json({ message: '접근 권한이 없습니다.' });
    }

    res.json(pr);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매요청 생성
router.post(
  '/',
  authenticate,
  [
    body('items').isArray({ min: 1 }).withMessage('최소 1개 이상의 항목이 필요합니다.'),
    body('items.*.description').trim().notEmpty().withMessage('항목 설명을 입력하세요.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('수량은 1 이상이어야 합니다.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 카테고리 코드 검증 - skipping for now or assume valid, or implement flexible validation

      const pr = new PurchaseRequest({
        ...req.body,
        requestedBy: req.userId,
        status: 'draft',
        requestedDate: new Date(),
      });

      await pr.save();

      // Populate for response
      await pr.populate('requestedBy', 'username firstName lastName');

      res.status(201).json(pr);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 구매요청 업데이트
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
    }

    if (String(pr.requestedBy) !== String(req.userId)) {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }

    if (pr.status !== 'draft') {
      return res.status(400).json({ message: '제출된 구매요청은 수정할 수 없습니다.' });
    }

    // Update fields
    const allowedUpdates = ['items', 'priority', 'department', 'requiredDate', 'reason', 'notes', 'project', 'company', 'locationId'];
    allowedUpdates.forEach((update) => {
      if (req.body[update] !== undefined) {
        (pr as any)[update] = req.body[update];
      }
    });

    // 총액 재계산 (via pre-save hook automatically, but explicit set might be needed if items changed)
    // The pre-save hook in model handles totalAmount calculation based on items.

    await pr.save();
    await pr.populate('requestedBy', 'username firstName lastName');

    res.json(pr);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매요청 제출
router.post('/:id/submit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
    }

    if (String(pr.requestedBy) !== String(req.userId)) {
      return res.status(403).json({ message: '제출 권한이 없습니다.' });
    }

    if (pr.status !== 'draft') {
      return res.status(400).json({ message: '이미 제출된 구매요청입니다.' });
    }

    pr.status = 'submitted';
    await pr.save();

    res.json(pr);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매요청 승인/거부
router.post(
  '/:id/approve',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('action').isIn(['approve', 'reject']).withMessage('action은 approve 또는 reject여야 합니다.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { action, rejectionReason } = req.body;
      const pr = await PurchaseRequest.findById(req.params.id);

      if (!pr) {
        return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
      }

      if (pr.status !== 'submitted') {
        return res.status(400).json({ message: '제출된 구매요청만 승인/거부할 수 있습니다.' });
      }

      if (action === 'approve') {
        pr.status = 'approved';
        pr.approvedBy = req.userId as any; // Cast as any or ObjectId if needed
        pr.approvedAt = new Date();
      } else {
        pr.status = 'rejected';
        pr.rejectionReason = rejectionReason;
      }

      await pr.save();
      res.json(pr);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 구매요청을 구매주문으로 변환
router.post('/:id/convert-to-po', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const { supplier, paymentTerms, expectedDeliveryDate, items } = req.body;
    const pr = await PurchaseRequest.findById(req.params.id);

    if (!pr) {
      return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
    }

    if (pr.status !== 'approved') {
      return res.status(400).json({ message: '승인된 구매요청만 구매주문으로 변환할 수 있습니다.' });
    }

    if (!supplier) {
      return res.status(400).json({ message: '공급업체를 선택해야 합니다.' });
    }

    // items가 제공되면 사용하고, 없으면 PR의 items 사용 (금액 조정 가능)
    const poItems = items && items.length > 0
      ? items.map((item: any) => ({
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        total: item.total || (item.unitPrice || 0) * item.quantity,
        categoryCode: item.categoryCode,
      }))
      : pr.items.map((item: any) => ({
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        total: item.estimatedTotal || (item.unitPrice || 0) * item.quantity,
        categoryCode: item.categoryCode,
      }));

    // 총액 계산 (items가 제공된 경우 조정된 금액 사용)
    const subtotal = items && items.length > 0
      ? poItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
      : pr.totalAmount;

    // Create PO using Model
    const po = new PurchaseOrder({
      // poNumber handled by pre-save
      supplier,
      purchaseRequest: pr._id,
      items: poItems,
      subtotal,
      tax: 0,
      shippingCost: 0,
      discount: 0,
      total: subtotal,
      paymentTerms: paymentTerms || 'Net 30',
      expectedDeliveryDate: expectedDeliveryDate || pr.requiredDate,
      createdBy: new mongoose.Types.ObjectId(req.userId),
      status: 'draft',
      orderDate: new Date(),
      currency: 'USD',
    });

    await po.save();

    // PR 상태 업데이트
    pr.status = 'converted';
    pr.convertedToPO = po._id as any;
    await pr.save();

    await po.populate('supplier', 'name email phone');
    res.status(201).json({
      ...po.toObject(),
      purchaseRequestData: { prNumber: pr.prNumber },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 기존 구매 이력에서 MODEL NO로 검색 (스펙 자동완성용)
router.get('/search/items', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { modelNo, description, supplier } = req.query;

    if (!modelNo && !description) {
      return res.status(400).json({ message: 'modelNo 또는 description을 입력하세요' });
    }

    const results: any[] = [];

    // Build Regex
    const modelRegex = modelNo ? new RegExp(modelNo as string, 'i') : null;
    const descRegex = description ? new RegExp(description as string, 'i') : null;

    // 1. Search in PurchaseRequests
    const prQuery: any = {};
    if (supplier) prQuery.supplier = supplier;

    const prs = await PurchaseRequest.find(prQuery).sort({ createdAt: -1 }).limit(100);

    for (const pr of prs) {
      for (const item of pr.items) {
        const matchModel = modelRegex ? modelRegex.test(item.modelNo || '') : false;
        const matchDesc = descRegex ? descRegex.test(item.description || '') : false;

        if ((modelRegex && matchModel) || (descRegex && matchDesc)) {
          const supplierId = (pr as any).supplier || '';

          // Check duplicates
          const exists = results.some(r =>
            r.modelNo === item.modelNo &&
            r.spec === item.spec &&
            r.description === item.description
          );

          if (!exists) {
            results.push({
              modelNo: item.modelNo || '',
              spec: item.spec || '',
              description: item.description || '',
              categoryCode: item.categoryCode || '',
              unitPrice: item.estimatedTotal && item.quantity ? (item.estimatedTotal / item.quantity) : 0,
              supplier: supplierId
            });
          }
        }
      }
    }

    // 2. Search in PurchaseOrders
    const poQuery: any = {};
    if (supplier) poQuery.supplier = supplier;

    const pos = await PurchaseOrder.find(poQuery).sort({ orderDate: -1 }).limit(100);

    for (const po of pos) {
      for (const item of po.items) {
        const matchModel = modelRegex ? modelRegex.test(item.modelNo || '') : false;
        const matchDesc = descRegex ? descRegex.test(item.description || '') : false;

        if ((modelRegex && matchModel) || (descRegex && matchDesc)) {
          // Check duplicates
          const exists = results.some(r =>
            r.modelNo === item.modelNo &&
            r.description === item.description &&
            String(r.supplier) === String(po.supplier)
          );

          if (!exists) {
            results.push({
              modelNo: item.modelNo || '',
              spec: item.spec || '',
              description: item.description || '',
              categoryCode: item.categoryCode || '',
              unitPrice: item.unitPrice,
              supplier: po.supplier
            });
          }
        }
      }
    }

    res.json(results.slice(0, 20));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 구매요청 삭제
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pr = await PurchaseRequest.findById(req.params.id);
    if (!pr) {
      return res.status(404).json({ message: '구매요청을 찾을 수 없습니다.' });
    }

    if (String(pr.requestedBy) !== String(req.userId) && req.userRole !== 'admin') {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    if (pr.status !== 'draft') {
      return res.status(400).json({ message: '제출된 구매요청은 삭제할 수 없습니다.' });
    }

    await PurchaseRequest.findByIdAndDelete(req.params.id);
    res.json({ message: '구매요청이 삭제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
