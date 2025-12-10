import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InvoiceRuleEngine } from '../services/InvoiceRuleEngine';
import Invoice from '../models/Invoice';
import InvoiceItem from '../models/InvoiceItem';
import Project from '../models/Project';
import Delivery from '../models/Delivery';
import LaborLog from '../models/LaborLog';
import ProjectBillingRule from '../models/ProjectBillingRule';
import AccountsReceivable from '../models/AccountsReceivable';
import { IInvoice } from '../models/Invoice';
import { IInvoiceItem } from '../models/InvoiceItem';

const router = express.Router();

/**
 * GET /api/invoices
 * Invoice 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, customerId, status, periodMonth } = req.query;

    let query: any = {};
    if (projectId) query.project = projectId;
    if (customerId) query.customer = customerId;
    if (status) query.status = status;
    if (periodMonth) query.periodMonth = periodMonth;

    const invoices = await Invoice.find(query)
      .populate('project', 'projectCode projectName')
      .populate('customer', 'name company email')
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email')
      .sort({ createdAt: -1 });

    // 각 Invoice의 Items 가져오기
    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => {
        const items = await InvoiceItem.find({ invoice: invoice._id }).sort({ lineNumber: 1 });
        return {
          ...invoice.toObject(),
          items,
        };
      })
    );

    res.json(invoicesWithDetails);
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/invoices/:id
 * Invoice 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('project', 'projectCode projectName')
      .populate('customer', 'name company email')
      .populate('createdBy', 'username email')
      .populate('approvedBy', 'username email');

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const items = await InvoiceItem.find({ invoice: invoice._id }).sort({ lineNumber: 1 });

    res.json({
      ...invoice.toObject(),
      items,
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/invoices/preview
 * Invoice 생성 전 미리보기 (실제 생성하지 않음)
 */
router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { projectId, periodStart, periodEnd } = req.body;

    if (!projectId || !periodStart || !periodEnd) {
      return res.status(400).json({
        message: 'projectId, periodStart, periodEnd are required'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    endDate.setHours(23, 59, 59, 999); // 종료일 포함

    // 미인보이스 Delivery 가져오기
    const deliveries = await Delivery.find({
      project: projectId,
      invoiced: { $ne: true },
      deliveryDate: { $gte: startDate, $lte: endDate },
    }).lean();

    // 미인보이스 LaborLog 가져오기
    const laborLogs = await LaborLog.find({
      project: projectId,
      invoiced: { $ne: true },
      workDate: { $gte: startDate, $lte: endDate },
    }).lean();

    // 활성 Billing Rules 가져오기
    const activeRules = await ProjectBillingRule.find({
      project: projectId,
      isActive: true,
    })
      .sort({ priority: -1 })
      .lean();

    // 간단한 Invoice Line 생성
    const invoiceLines: any[] = [];

    // EA 기준 라인 생성
    const eaRules = activeRules.filter((r: any) => r.ruleType === 'EA');
    if (eaRules.length > 0 && deliveries.length > 0) {
      const rule = eaRules[0];
      const unitPrice = rule.config?.unitPrice || 0;
      const totalQuantity = deliveries.reduce((sum: number, d: any) => sum + (d.quantity || 0), 0);
      if (totalQuantity > 0) {
        invoiceLines.push({
          description: `Parts Delivery - ${deliveries.length} items`,
          quantity: totalQuantity,
          unit: 'EA',
          unitPrice,
          amount: totalQuantity * unitPrice,
          ruleId: rule._id?.toString(),
          ruleType: 'EA',
        });
      }
    }

    // LABOR 기준 라인 생성
    const laborRules = activeRules.filter((r: any) => r.ruleType === 'LABOR');
    if (laborRules.length > 0 && laborLogs.length > 0) {
      const rule = laborRules[0];
      const unitPrice = rule.config?.unitPrice || 0;
      const totalHours = laborLogs.reduce((sum: number, l: any) => sum + (l.hours || 0), 0);
      if (totalHours > 0) {
        invoiceLines.push({
          description: `Labor - ${laborLogs.length} logs`,
          quantity: totalHours,
          unit: 'Hour',
          unitPrice,
          amount: totalHours * unitPrice,
          ruleId: rule._id?.toString(),
          ruleType: 'LABOR',
        });
      }
    }

    // FIXED 기준 라인 생성
    const fixedRules = activeRules.filter((r: any) => r.ruleType === 'FIXED');
    fixedRules.forEach((rule: any) => {
      const unitPrice = rule.config?.unitPrice || 0;
      if (unitPrice > 0) {
        invoiceLines.push({
          description: rule.ruleName || rule.description || 'Fixed Charge',
          quantity: 1,
          unit: 'Month',
          unitPrice,
          amount: unitPrice,
          ruleId: rule._id?.toString(),
          ruleType: 'FIXED',
        });
      }
    });

    // Invoice 총액 계산
    const subtotal = invoiceLines.reduce((sum, line) => sum + line.amount, 0);
    const tax = subtotal * 0.1; // 10% 세금
    const totalAmount = subtotal + tax;

    res.json({
      project: {
        _id: project._id.toString(),
        projectCode: project.projectCode,
        projectName: project.projectName,
      },
      periodStart: startDate,
      periodEnd: endDate,
      invoiceLines,
      summary: {
        subtotal,
        tax,
        totalAmount,
        lineCount: invoiceLines.length,
      },
      performanceData: {
        deliveryCount: deliveries.length,
        laborLogCount: laborLogs.length,
        deliveries: deliveries.map((d: any) => ({
          _id: d._id.toString(),
          deliveryNumber: d.deliveryNumber,
          deliveryDate: d.deliveryDate,
          partNo: d.partNo,
          partName: d.partName,
          quantity: d.quantity,
          unit: d.unit,
        })),
        laborLogs: laborLogs.map((l: any) => ({
          _id: l._id.toString(),
          logNumber: l.logNumber,
          workDate: l.workDate,
          workType: l.workType,
          workDescription: l.workDescription,
          hours: l.hours,
          laborRate: l.laborRate,
        })),
      },
      activeRules: activeRules.map((r: any) => ({
        _id: r._id.toString(),
        ruleName: r.ruleName,
        ruleType: r.ruleType,
        unitBasis: r.unitBasis,
        priceSource: r.priceSource,
        priority: r.priority,
        isActive: r.isActive,
      })),
    });
  } catch (error: any) {
    console.error('Invoice preview error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/invoices/generate
 * 프로젝트별 Invoice 수동 생성 (마스터 청구 규칙 기반)
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { projectId, periodMonth, periodStart, periodEnd, userId, items } = req.body;

    if (!projectId || !periodMonth || !periodStart || !periodEnd || !items || !Array.isArray(items)) {
      return res.status(400).json({
        message: 'projectId, periodMonth, periodStart, periodEnd, items are required'
      });
    }

    const project = await Project.findById(projectId)
      .populate('customer', 'name company email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 이미 생성된 Invoice가 있는지 확인
    const existingInvoice = await Invoice.findOne({
      project: projectId,
      periodMonth,
    });

    if (existingInvoice) {
      return res.status(400).json({
        message: `Invoice already exists for project ${projectId} and period ${periodMonth}`
      });
    }

    // Invoice 총액 계산
    const subtotal = items.reduce((sum: number, item: any) => {
      const amount = item.isFixed ? item.unitPrice : (item.quantity * item.unitPrice);
      return sum + amount;
    }, 0);
    const tax = subtotal * 0.1; // 10% 세금
    const totalAmount = subtotal + tax;

    // Invoice 생성
    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);
    const dueDate = new Date(endDate);
    dueDate.setDate(dueDate.getDate() + 30); // 30일 후 만기

    // createdBy 처리
    let createdById: mongoose.Types.ObjectId;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      createdById = new mongoose.Types.ObjectId(userId);
    } else {
      createdById = new mongoose.Types.ObjectId('000000000000000000000000'); // 임시 or system user
    }

    const invoice = new Invoice({
      project: projectId,
      customer: project.customer instanceof mongoose.Types.ObjectId ? project.customer : (project.customer as any)._id,
      periodMonth,
      periodStart: startDate,
      periodEnd: endDate,
      poNumber: project.poNumber,
      subtotal,
      tax,
      discount: 0,
      totalAmount,
      currency: project.currency || 'USD',
      status: 'draft',
      paymentStatus: 'pending',
      invoiceDate: new Date(),
      dueDate,
      createdBy: createdById,
      sourceData: {
        generatedFrom: 'manual',
      },
    });

    await invoice.save();

    // Invoice Items 생성
    const createdItems = [];
    for (let i = 0; i < items.length; i++) {
      const itemData = items[i];
      const amount = itemData.isFixed ? itemData.unitPrice : (itemData.quantity * itemData.unitPrice);

      const item = new InvoiceItem({
        invoice: invoice._id,
        lineNumber: i + 1,
        description: itemData.itemName,
        quantity: itemData.isFixed ? 1 : itemData.quantity,
        unit: itemData.unit || 'EA',
        unitPrice: itemData.unitPrice,
        amount: amount,
      });

      await item.save();
      createdItems.push(item);
    }

    const savedInvoice = await Invoice.findById(invoice._id)
      .populate('project', 'projectCode projectName')
      .populate('customer', 'name company email')
      .populate('createdBy', 'username email');

    res.status(201).json({
      ...savedInvoice?.toObject(),
      items: createdItems,
    });
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/invoices
 * 수동 Invoice 생성
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const invoiceData = req.body;

    // Ensure IDs are ObjectIds
    if (invoiceData.project && mongoose.Types.ObjectId.isValid(invoiceData.project)) {
      invoiceData.project = new mongoose.Types.ObjectId(invoiceData.project);
    }
    // ... similarly for others. Mongoose schema validation handles most string->ObjectId casts automatically if format is correct.

    const invoice = new Invoice({
      ...invoiceData,
      status: invoiceData.status || 'draft',
      paymentStatus: invoiceData.paymentStatus || 'pending',
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/invoices/:id
 * Invoice 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/invoices/:id/approve
 * Invoice 승인 (AR 자동 생성)
 */
router.patch('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    invoice.status = 'approved';
    invoice.approvedBy = userId;
    invoice.approvedAt = new Date();
    await invoice.save();

    // AR 자동 생성 (이미 생성되지 않은 경우)
    const existingAR = await AccountsReceivable.findOne({ invoice: req.params.id });
    if (!existingAR) {
      try {
        const ar = new AccountsReceivable({
          // arNumber generated by pre-save
          invoice: req.params.id,
          customer: invoice.customer,
          project: invoice.project,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.invoiceDate,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          discount: invoice.discount || 0,
          totalAmount: invoice.totalAmount,
          receivedAmount: 0,
          remainingAmount: invoice.totalAmount,
          status: 'pending',
          paymentStatus: 'unpaid',
          currency: invoice.currency,
          receipts: [],
          createdBy: userId || invoice.createdBy,
        });

        await ar.save();
      } catch (arError: any) {
        console.error('AR 자동 생성 오류:', arError);
        // AR 생성 실패해도 Invoice 승인은 진행
      }
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/invoices/:id/send
 * Invoice 발송
 */
router.patch('/:id/send', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status: 'sent' },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/invoices/:id/pay
 * Invoice 결제 처리
 */
router.patch('/:id/pay', async (req: Request, res: Response) => {
  try {
    const { amount, paymentDate } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const paidAmount = amount || invoice.totalAmount;
    const newPaymentStatus = paidAmount >= invoice.totalAmount ? 'paid' : 'partial';

    invoice.paymentStatus = newPaymentStatus;
    if (newPaymentStatus === 'paid') {
      invoice.status = 'paid';
      invoice.paidDate = paymentDate ? new Date(paymentDate) : new Date();
    }

    await invoice.save();

    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/invoices/:id
 * Invoice 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Invoice Items도 함께 삭제
    await InvoiceItem.deleteMany({ invoice: req.params.id });

    // 실적 데이터의 Invoice 연결 해제
    if (invoice.sourceData?.sourceRecords) {
      // Assuming sourceRecords are ObjectIds
      await Delivery.updateMany(
        { _id: { $in: invoice.sourceData.sourceRecords } },
        {
          invoiced: false,
          invoiceId: undefined, // undefined to unset in Mongoose usually works or use $unset
          invoiceItemId: undefined
        }
      );
      // To correctly unset:
      await Delivery.updateMany(
        { _id: { $in: invoice.sourceData.sourceRecords } },
        { $unset: { invoiceId: 1, invoiceItemId: 1 }, invoiced: false }
      );

      await LaborLog.updateMany(
        { _id: { $in: invoice.sourceData.sourceRecords } },
        { $unset: { invoiceId: 1, invoiceItemId: 1 }, invoiced: false }
      );
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
