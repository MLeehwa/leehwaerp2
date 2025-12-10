import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Customer from '../models/Customer';

const router = express.Router();

// 모든 고객 조회
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

    const { search, isActive } = req.query;
    
    let query: any = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { name: { $regex: search as string, $options: 'i' } },
        { email: { $regex: search as string, $options: 'i' } },
        { company: { $regex: search as string, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ name: 1 });
    res.json(customers);
  } catch (error: any) {
    console.error('Customers 조회 오류:', error);
    res.status(500).json({ message: error.message || '고객 목록을 불러오는데 실패했습니다.' });
  }
});

// 고객 상세 조회
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: '고객을 찾을 수 없습니다.' });
    }
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 고객 생성
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('고객명을 입력하세요.'),
    body('email').optional().isEmail().withMessage('유효한 이메일을 입력하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const customer = await Customer.create({
        ...req.body,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });
      
      res.status(201).json(customer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 고객 업데이트
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!customer) {
      return res.status(404).json({ message: '고객을 찾을 수 없습니다.' });
    }
    
    res.json(customer);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 고객 삭제 (소프트 삭제)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!customer) {
      return res.status(404).json({ message: '고객을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '고객이 비활성화되었습니다.', customer });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
