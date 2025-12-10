import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import MasterBillingRule from '../models/MasterBillingRule';

const router = express.Router();

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
  }
  next();
};

/**
 * GET /api/master-billing-rules
 * 마스터 청구 규칙 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { projectId, isActive } = req.query;
    
    let query: any = {};
    if (projectId) query.project = projectId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rules = await MasterBillingRule.find(query)
      .populate('project', 'projectCode projectName')
      .sort({ createdAt: -1 });

    res.json(rules);
  } catch (error: any) {
    console.error('Error fetching master billing rules:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/master-billing-rules/:id
 * 마스터 청구 규칙 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const rule = await MasterBillingRule.findById(req.params.id)
      .populate('project', 'projectCode projectName');
    if (!rule) {
      return res.status(404).json({ message: 'Master billing rule not found' });
    }
    res.json(rule);
  } catch (error: any) {
    console.error('Error fetching master billing rule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/master-billing-rules
 * 마스터 청구 규칙 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { project, description, items, isActive } = req.body;

    if (!project) {
      return res.status(400).json({ message: '프로젝트는 필수입니다.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '항목은 필수입니다.' });
    }

    const rule = new MasterBillingRule({
      project,
      description,
      items,
      isActive: isActive !== undefined ? isActive : true,
    });
    await rule.save();
    await rule.populate('project', 'projectCode projectName');
    res.status(201).json(rule);
  } catch (error: any) {
    console.error('Error creating master billing rule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/master-billing-rules/:id
 * 마스터 청구 규칙 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { project, description, items, isActive } = req.body;

    if (!project) {
      return res.status(400).json({ message: '프로젝트는 필수입니다.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: '항목은 필수입니다.' });
    }

    const rule = await MasterBillingRule.findByIdAndUpdate(
      req.params.id,
      { project, description, items, isActive },
      { new: true, runValidators: true }
    ).populate('project', 'projectCode projectName');
    if (!rule) {
      return res.status(404).json({ message: 'Master billing rule not found' });
    }
    res.json(rule);
  } catch (error: any) {
    console.error('Error updating master billing rule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/master-billing-rules/:id
 * 마스터 청구 규칙 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const rule = await MasterBillingRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Master billing rule not found' });
    }
    res.json({ message: 'Master billing rule deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting master billing rule:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

