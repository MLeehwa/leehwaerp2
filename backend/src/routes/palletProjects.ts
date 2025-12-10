import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import PalletProject from '../models/PalletProject';

const router = express.Router();

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
  }
  next();
};

/**
 * GET /api/pallet-projects
 * 팔렛트 프로젝트 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { status, isActive, search } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // 검색 필터링
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { projectCode: searchRegex },
        { projectName: searchRegex },
        { description: searchRegex },
      ];
    }

    const projects = await PalletProject.find(query)
      .populate('customer', 'name company email')
      .populate('manager', 'username email')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error: any) {
    console.error('Error fetching pallet projects:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/pallet-projects/:id
 * 팔렛트 프로젝트 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const project = await PalletProject.findById(req.params.id)
      .populate('customer', 'name company email')
      .populate('manager', 'username email')
      .populate('createdBy', 'username');

    if (!project) {
      return res.status(404).json({ message: '팔렛트 프로젝트를 찾을 수 없습니다' });
    }

    res.json(project);
  } catch (error: any) {
    console.error('Error fetching pallet project:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/pallet-projects
 * 팔렛트 프로젝트 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      projectCode,
      projectName,
      description,
      customer,
      status,
      manager,
      isActive,
    } = req.body;

    // 필수 필드 검증
    if (!projectCode || !projectName) {
      return res.status(400).json({ message: '프로젝트 코드와 프로젝트명은 필수입니다' });
    }

    // 중복 체크
    const existing = await PalletProject.findOne({ projectCode: projectCode.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다' });
    }

    const project = new PalletProject({
      projectCode: projectCode.toUpperCase(),
      projectName,
      description,
      customer,
      status: status || 'active',
      manager,
      isActive: isActive !== undefined ? isActive : true,
    });

    await project.save();
    await project.populate('customer', 'name company email');
    await project.populate('manager', 'username email');

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating pallet project:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다' });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/pallet-projects/:id
 * 팔렛트 프로젝트 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const project = await PalletProject.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: '팔렛트 프로젝트를 찾을 수 없습니다' });
    }

    const {
      projectCode,
      projectName,
      description,
      customer,
      status,
      manager,
      isActive,
    } = req.body;

    if (projectCode !== undefined && projectCode !== project.projectCode) {
      // 중복 체크
      const existing = await PalletProject.findOne({
        projectCode: projectCode.toUpperCase(),
        _id: { $ne: project._id }
      });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다' });
      }
      project.projectCode = projectCode.toUpperCase();
    }
    if (projectName !== undefined) project.projectName = projectName;
    if (description !== undefined) project.description = description;
    if (customer !== undefined) project.customer = customer;
    if (status !== undefined) project.status = status;
    if (manager !== undefined) project.manager = manager;
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();
    await project.populate('customer', 'name company email');
    await project.populate('manager', 'username email');

    res.json(project);
  } catch (error: any) {
    console.error('Error updating pallet project:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 프로젝트 코드입니다' });
    }
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/pallet-projects/:id
 * 팔렛트 프로젝트 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const project = await PalletProject.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({ message: '팔렛트 프로젝트를 찾을 수 없습니다' });
    }

    res.json({ message: '팔렛트 프로젝트가 삭제되었습니다' });
  } catch (error: any) {
    console.error('Error deleting pallet project:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

