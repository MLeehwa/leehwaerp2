import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import PalletSchedule from '../models/PalletSchedule';

const router = express.Router();

// MongoDB 연결 확인 미들웨어
const checkDBConnection = (req: Request, res: Response, next: any) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
  }
  next();
};

/**
 * GET /api/pallet-schedules
 * 파렛트 일정 목록 조회
 */
router.get('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const { projectId, palletProjectId, companyId, scheduleType, categoryId, startDate, endDate, status } = req.query;

    const query: any = {};
    if (projectId) query.project = projectId;
    if (palletProjectId) query.palletProject = palletProjectId;
    if (companyId) query.company = companyId;
    if (scheduleType) query.scheduleType = scheduleType;
    if (categoryId) query.category = categoryId;
    if (status) query.status = status;

    // 날짜 범위 필터링
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate as string);
      if (endDate) query.startDate.$lte = new Date(endDate as string);
    }

    const schedules = await PalletSchedule.find(query)
      .populate('project', 'projectCode projectName')
      .populate('palletProject', 'projectCode projectName')
      .populate('company', 'code name')
      .populate('category', 'code name type')
      .populate('assignedTo', 'username email')
      .populate('relatedContainer', 'containerNumber status')
      .populate('createdBy', 'username')
      .sort({ startDate: 1 });

    res.json(schedules);
  } catch (error: any) {
    console.error('Error fetching pallet schedules:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/pallet-schedules/:id
 * 파렛트 일정 상세 조회
 */
router.get('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await PalletSchedule.findById(req.params.id)
      .populate('project', 'projectCode projectName')
      .populate('palletProject', 'projectCode projectName')
      .populate('company', 'code name')
      .populate('category', 'code name type')
      .populate('assignedTo', 'username email')
      .populate('relatedContainer', 'containerNumber status eta atd ata')
      .populate('createdBy', 'username');

    if (!schedule) {
      return res.status(404).json({ message: '파렛트 일정을 찾을 수 없습니다' });
    }

    res.json(schedule);
  } catch (error: any) {
    console.error('Error fetching pallet schedule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/pallet-schedules
 * 파렛트 일정 생성
 */
router.post('/', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const {
      project,
      palletProject,
      company,
      scheduleType,
      category,
      title,
      description,
      startDate,
      endDate,
      allDay,
      palletCount,
      status,
      priority,
      assignedTo,
      location,
      relatedContainer,
      color,
    } = req.body;

    // 필수 필드 검증
    if (!title || !startDate) {
      return res.status(400).json({ message: '제목, 시작일은 필수입니다' });
    }

    // scheduleType에 따라 필수 필드 결정
    if (scheduleType === 'project' && !palletProject) {
      return res.status(400).json({ message: '프로젝트별 일정인 경우 프로젝트는 필수입니다' });
    }
    if (scheduleType === 'company' && !company) {
      return res.status(400).json({ message: '법인별 일정인 경우 법인은 필수입니다' });
    }

    const schedule = new PalletSchedule({
      project,
      palletProject,
      company,
      scheduleType: scheduleType || 'general',
      category,
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      allDay: allDay !== undefined ? allDay : false,
      palletCount,
      status: status || 'scheduled',
      priority: priority || 'medium',
      assignedTo,
      location,
      relatedContainer,
      color: color || '#1890ff',
    });

    await schedule.save();
    await schedule.populate('project', 'projectCode projectName');
    await schedule.populate('palletProject', 'projectCode projectName');
    await schedule.populate('company', 'code name');
    await schedule.populate('category', 'code name type');
    await schedule.populate('assignedTo', 'username email');
    await schedule.populate('relatedContainer', 'containerNumber status');

    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('Error creating pallet schedule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/pallet-schedules/:id
 * 파렛트 일정 수정
 */
router.put('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await PalletSchedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: '파렛트 일정을 찾을 수 없습니다' });
    }

    const {
      project,
      palletProject,
      company,
      scheduleType,
      category,
      title,
      description,
      startDate,
      endDate,
      allDay,
      palletCount,
      status,
      priority,
      assignedTo,
      location,
      relatedContainer,
      color,
    } = req.body;

    // scheduleType에 따라 필수 필드 검증
    if (scheduleType === 'project' && !palletProject) {
      return res.status(400).json({ message: '프로젝트별 일정인 경우 프로젝트는 필수입니다' });
    }
    if (scheduleType === 'company' && !company) {
      return res.status(400).json({ message: '법인별 일정인 경우 법인은 필수입니다' });
    }

    if (project !== undefined) schedule.project = project;
    if (palletProject !== undefined) schedule.palletProject = palletProject;
    if (company !== undefined) schedule.company = company;
    if (scheduleType !== undefined) schedule.scheduleType = scheduleType;
    if (category !== undefined) schedule.category = category;
    if (title !== undefined) schedule.title = title;
    if (description !== undefined) schedule.description = description;
    if (startDate !== undefined) schedule.startDate = new Date(startDate);
    if (endDate !== undefined) schedule.endDate = endDate ? new Date(endDate) : undefined;
    if (allDay !== undefined) schedule.allDay = allDay;
    if (palletCount !== undefined) schedule.palletCount = palletCount;
    if (status !== undefined) schedule.status = status;
    if (priority !== undefined) schedule.priority = priority;
    if (assignedTo !== undefined) schedule.assignedTo = assignedTo;
    if (location !== undefined) schedule.location = location;
    if (relatedContainer !== undefined) schedule.relatedContainer = relatedContainer;
    if (color !== undefined) schedule.color = color;

    await schedule.save();
    await schedule.populate('project', 'projectCode projectName');
    await schedule.populate('palletProject', 'projectCode projectName');
    await schedule.populate('company', 'code name');
    await schedule.populate('category', 'code name type');
    await schedule.populate('assignedTo', 'username email');
    await schedule.populate('relatedContainer', 'containerNumber status');

    res.json(schedule);
  } catch (error: any) {
    console.error('Error updating pallet schedule:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/pallet-schedules/:id
 * 파렛트 일정 삭제
 */
router.delete('/:id', checkDBConnection, async (req: Request, res: Response) => {
  try {
    const schedule = await PalletSchedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: '파렛트 일정을 찾을 수 없습니다' });
    }

    res.json({ message: '파렛트 일정이 삭제되었습니다' });
  } catch (error: any) {
    console.error('Error deleting pallet schedule:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

