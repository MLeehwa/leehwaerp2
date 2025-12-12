import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Category from '../models/Category';

const router = express.Router();

// 모든 카테고리 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // MongoDB 연결 확인
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const { type, isActive, search } = req.query;
    let query: any = {};

    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      const searchLower = (search as string).toLowerCase();
      query.$or = [
        { code: { $regex: searchLower, $options: 'i' } },
        { name: { $regex: searchLower, $options: 'i' } },
        { description: { $regex: searchLower, $options: 'i' } },
      ];
    }

    const categories = await Category.find(query).populate('parentCategory').sort({ code: 1 });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 카테고리 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const category = await Category.findById(req.params.id).populate('parentCategory');
    if (!category) {
      return res.status(404).json({ message: '카테고리를 찾을 수 없습니다.' });
    }
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 코드로 카테고리 조회
router.get('/code/:code', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const category = await Category.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    }).populate('parentCategory');

    if (!category) {
      return res.status(404).json({ message: '카테고리를 찾을 수 없습니다.' });
    }

    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 카테고리 생성
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('code').trim().notEmpty().withMessage('카테고리 코드를 입력하세요.'),
    body('name').trim().notEmpty().withMessage('카테고리명을 입력하세요.'),
    body('type').isIn(['purchase', 'logistics', 'expense', 'other']).withMessage('유효한 카테고리 유형을 선택하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
      }

      const { code, ...rest } = req.body;
      const existing = await Category.findOne({ code: code.toUpperCase().trim() });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 카테고리 코드입니다.' });
      }

      const category = await Category.create({
        ...rest,
        code: code.toUpperCase().trim(),
        isActive: true,
      });

      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 카테고리 업데이트
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const { code, ...updateData } = req.body;
    const update: any = { ...updateData };

    if (code) {
      const existing = await Category.findOne({ code: code.toUpperCase().trim() });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(400).json({ message: '이미 존재하는 카테고리 코드입니다.' });
      }
      update.code = code.toUpperCase().trim();
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) {
      return res.status(404).json({ message: '카테고리를 찾을 수 없습니다.' });
    }

    res.json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 카테고리 삭제 (소프트 삭제)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: '카테고리를 찾을 수 없습니다.' });
    }

    res.json({ message: '카테고리가 삭제되었습니다.', category });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 카테고리별 통계
router.get('/stats/usage', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: '데이터베이스에 연결할 수 없습니다' });
    }

    // 통계는 나중에 구현 (PurchaseRequest, PurchaseOrder 모델 필요)
    const categories = await Category.find({ isActive: true });
    const stats = categories.map((category) => ({
      category: {
        id: category._id,
        code: category.code,
        name: category.name,
        type: category.type,
      },
      usage: {
        purchaseRequests: 0,
        purchaseOrders: 0,
        total: 0,
      },
    }));

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
