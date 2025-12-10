import express, { Request, Response } from 'express';
import Delivery from '../models/Delivery';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /api/deliveries
 * 출하 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, customerId, invoiced, startDate, endDate } = req.query;

    let query: any = {};
    if (projectId) query.project = projectId;
    if (customerId) query.customer = customerId;
    if (invoiced !== undefined) query.invoiced = invoiced === 'true';

    // 날짜 필터링
    if (startDate || endDate) {
      query.deliveryDate = {};
      if (startDate) query.deliveryDate.$gte = new Date(startDate as string);
      if (endDate) query.deliveryDate.$lte = new Date(endDate as string);
    }

    const deliveries = await Delivery.find(query)
      .populate('project', 'projectCode projectName')
      .populate('customer', 'name company')
      .sort({ deliveryDate: -1 });

    res.json(deliveries);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/deliveries
 * 출하 생성
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const delivery = new Delivery(req.body);
    await delivery.save();
    res.status(201).json(delivery);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/deliveries/:id
 * 출하 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    res.json(delivery);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/deliveries/:id
 * 출하 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await Delivery.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Delivery not found' });
    }
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
