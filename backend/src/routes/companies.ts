import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import Company from '../models/Company';

const router = express.Router();

/**
 * GET /api/companies
 * 법인 목록 조회
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

    const { isActive, search } = req.query;

    let query: any = {};
    if (isActive !== undefined) {
      // 문자열 'true'/'false'를 boolean으로 변환
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { code: { $regex: search as string, $options: 'i' } },
      ];
    }

    const companies = await Company.find(query).sort({ code: 1 });
    res.json(companies);
  } catch (error: any) {
    console.error('Companies 조회 오류:', error);
    res.status(500).json({ message: error.message || '법인 목록을 불러오는데 실패했습니다.' });
  }
});

/**
 * GET /api/companies/:id
 * 법인 상세 조회
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: '법인을 찾을 수 없습니다' });
    }
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/companies
 * 법인 생성
 */
router.post(
  '/',
  [
    body('code').trim().notEmpty().withMessage('법인 코드를 입력하세요.'),
    body('name').trim().notEmpty().withMessage('법인명을 입력하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 중복 확인
      const existing = await Company.findOne({ code: req.body.code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 법인 코드입니다.' });
      }

      const company = await Company.create({
        ...req.body,
        code: req.body.code.toUpperCase(),
      });

      res.status(201).json(company);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ message: '이미 존재하는 법인 코드입니다.' });
      }
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/companies/:id
 * 법인 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { ...req.body, code: req.body.code?.toUpperCase() },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: '법인을 찾을 수 없습니다' });
    }

    res.json(company);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/companies/:id
 * 법인 삭제 (실제로는 isActive를 false로 변경)
 */
// DELETE /api/companies/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({ message: '법인을 찾을 수 없습니다' });
    }

    res.json({ message: '법인이 삭제되었습니다', company });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

