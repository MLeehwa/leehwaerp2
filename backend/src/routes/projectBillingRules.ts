import express, { Request, Response } from 'express';
import ProjectBillingRule from '../models/ProjectBillingRule';
import Project from '../models/Project';

const router = express.Router();

/**
 * GET /api/project-billing-rules
 * Billing Rule 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId, isActive } = req.query;

    let query: any = {};
    if (projectId) query.project = projectId;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const rules = await ProjectBillingRule.find(query)
      .populate('project', 'projectCode projectName')
      .sort({ priority: -1 });

    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/project-billing-rules/:id
 * Billing Rule 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const rule = await ProjectBillingRule.findById(req.params.id)
      .populate('project', 'projectCode projectName');

    if (!rule) {
      return res.status(404).json({ message: 'Billing rule not found' });
    }

    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/project-billing-rules
 * Billing Rule 생성
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const ruleData = req.body;

    // config 기본값 설정
    if (!ruleData.config) {
      ruleData.config = {};
    }

    const rule = new ProjectBillingRule(ruleData);
    await rule.save();
    res.status(201).json(rule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/project-billing-rules/:id
 * Billing Rule 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const rule = await ProjectBillingRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) {
      return res.status(404).json({ message: 'Billing rule not found' });
    }
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/project-billing-rules/:id
 * Billing Rule 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await ProjectBillingRule.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Billing rule not found' });
    }
    res.json({ message: 'Billing rule deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
