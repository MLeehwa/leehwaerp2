import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { checkMongoDB } from '../middleware/checkMongoDB';
import Project from '../models/Project';
import Company from '../models/Company';

const router = express.Router();

/**
 * GET /api/projects
 * 프로젝트 목록 조회
 */
router.get('/', checkMongoDB, async (req: Request, res: Response) => {
  try {

    const { customerId, status, isActive } = req.query;

    let query: any = {};
    if (customerId) query.customer = customerId;
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const projects = await Project.find(query)
      .populate('customer', 'name company email')
      .populate('company', 'code name')
      .populate('invoiceCategory', 'code name type')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/projects/:id
 * 프로젝트 상세 조회
 */
router.get('/:id', checkMongoDB, async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('customer')
      .populate('company')
      .populate('invoiceCategory', 'code name type')
      .lean();

    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' });
    }

    // Billing Rules는 별도로 조회 (필요한 경우)
    // const billingRules = await ProjectBillingRule.find({ project: req.params.id });

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/projects
 * 프로젝트 생성 (PO 번호 자동 생성)
 */
router.post(
  '/',
  checkMongoDB,
  [
    body('projectCode').trim().notEmpty().withMessage('프로젝트 코드를 입력하세요.'),
    body('projectName').trim().notEmpty().withMessage('프로젝트명을 입력하세요.'),
    body('customer').notEmpty().withMessage('고객을 선택하세요.'),
    body('company').notEmpty().withMessage('법인을 선택하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { company, projectCode } = req.body;

      // 법인 정보 가져오기
      const companyData = await Company.findById(company);
      if (!companyData) {
        return res.status(404).json({ message: '법인을 찾을 수 없습니다' });
      }

      // 프로젝트 코드 중복 확인
      const existingProject = await Project.findOne({ projectCode: projectCode.toUpperCase() });
      if (existingProject) {
        return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다.' });
      }

      // PO 번호 자동 생성: {법인코드}-PO-{YYYYMM}-{순번}
      const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '');
      const existingPOs = await Project.find({ company });
      const poCount = existingPOs.filter((p: any) => {
        if (!p.poNumber) return false;
        const poYearMonth = p.poNumber.split('-').slice(-2, -1)[0];
        return poYearMonth === yearMonth;
      }).length;

      const companyCode = companyData.code || companyData.name.substring(0, 3).toUpperCase();
      const poNumber = `${companyCode}-PO-${yearMonth}-${String(poCount + 1).padStart(3, '0')}`;

      const project = await Project.create({
        ...req.body,
        projectCode: projectCode.toUpperCase(),
        poNumber,
        status: req.body.status || 'active',
        currency: req.body.currency || 'USD',
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });

      const populatedProject = await Project.findById(project._id)
        .populate('customer', 'name company email')
        .populate('company', 'code name')
        .populate('invoiceCategory', 'code name type');

      res.status(201).json(populatedProject);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다.' });
      }
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/projects/:id
 * 프로젝트 수정
 */
router.put('/:id', checkMongoDB, async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        projectCode: req.body.projectCode?.toUpperCase(),
      },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name company email')
      .populate('company', 'code name')
      .populate('invoiceCategory', 'code name type');

    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' });
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/projects/:id
 * 프로젝트 삭제 (실제로는 isActive를 false로 변경)
 */
router.delete('/:id', checkMongoDB, async (req: Request, res: Response) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ message: '프로젝트를 찾을 수 없습니다' });
    }

    res.json({ message: '프로젝트가 비활성화되었습니다', project });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
