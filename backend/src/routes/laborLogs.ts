import express, { Request, Response } from 'express';
import LaborLog from '../models/LaborLog';
import mongoose from 'mongoose';

const router = express.Router();

/**
 * GET /api/labor-logs
 * 노무 로그 목록 조회
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
      query.workDate = {};
      if (startDate) query.workDate.$gte = new Date(startDate as string);
      if (endDate) query.workDate.$lte = new Date(endDate as string);
    }

    const laborLogs = await LaborLog.find(query)
      .populate('project', 'projectCode projectName')
      .populate('customer', 'name company');

    res.json(laborLogs);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/labor-logs
 * 노무 로그 생성
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const laborLog = new LaborLog(req.body);
    await laborLog.save();
    res.status(201).json(laborLog);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/labor-logs/:id
 * 노무 로그 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const laborLog = await LaborLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!laborLog) {
      return res.status(404).json({ message: 'Labor log not found' });
    }
    res.json(laborLog);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/labor-logs/:id
 * 노무 로그 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await LaborLog.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Labor log not found' });
    }
    res.json({ message: 'Labor log deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
