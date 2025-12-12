import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Location from '../models/Location';

const router = express.Router();

/**
 * GET /api/locations
 * 로케이션 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // MongoDB 연결 확인
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({
        message: '데이터베이스에 연결할 수 없습니다.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }

    const { isActive, company, search } = req.query;

    // Query Parameter Debugging
    console.log(`[GET /locations] Query Params:`, req.query);

    let query: any = {};
    if (isActive) {
      // Handle potential array or different types by converting to string
      query.isActive = String(isActive) === 'true';
    }

    console.log(`[GET /locations] MongoDB Query:`, JSON.stringify(query));
    if (company) {
      query.company = company;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { code: { $regex: search as string, $options: 'i' } },
      ];
    }

    const locations = await Location.find(query)
      .populate('company', 'code name')
      .sort({ code: 1 });

    res.json(locations);
  } catch (error: any) {
    console.error('Locations 조회 오류:', error);
    res.status(500).json({ message: error.message || '로케이션 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * GET /api/locations/:id
 * 로케이션 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('company', 'code name');

    if (!location) {
      return res.status(404).json({ message: '로케이션을 찾을 수 없습니다' });
    }

    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/locations
 * 로케이션 생성
 */
router.post(
  '/',
  [
    body('code').trim().notEmpty().withMessage('로케이션 코드를 입력하세요.'),
    body('name').trim().notEmpty().withMessage('로케이션명을 입력하세요.'),
    body('company').notEmpty().withMessage('법인을 선택하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const location = await Location.create({
        ...req.body,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });

      const populatedLocation = await Location.findById(location._id)
        .populate('company', 'code name');

      res.status(201).json(populatedLocation);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/locations/:id
 * 로케이션 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('company', 'code name');

    if (!location) {
      return res.status(404).json({ message: '로케이션을 찾을 수 없습니다' });
    }

    res.json(location);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/locations/:id
 * 로케이션 삭제 (실제로는 isActive를 false로 변경)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);

    if (!location) {
      return res.status(404).json({ message: '로케이션을 찾을 수 없습니다' });
    }

    res.json({ message: '로케이션이 삭제되었습니다', location });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

