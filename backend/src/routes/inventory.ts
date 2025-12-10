import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import Product from '../models/Product';

const router = express.Router();

// 모든 제품 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, search, lowStock } = req.query;
    const query: any = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex }
      ];
    }

    if (lowStock === 'true') {
      // Mongoose query for stock <= minStock requires $expr or simple iteration if minStock is static.
      // Since minStock is a field in document, we use $expr
      query.$expr = { $lte: ["$stock", "$minStock"] };
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 제품 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 제품 생성
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  [
    body('name').trim().notEmpty().withMessage('제품명을 입력하세요.'),
    body('sku').trim().notEmpty().withMessage('SKU를 입력하세요.'),
    body('category').trim().notEmpty().withMessage('카테고리를 입력하세요.'),
    body('price').isFloat({ min: 0 }).withMessage('가격은 0 이상이어야 합니다.'),
    body('cost').isFloat({ min: 0 }).withMessage('원가는 0 이상이어야 합니다.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const existing = await Product.findOne({ sku: req.body.sku });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 SKU입니다.' });
      }

      const product = new Product({
        ...req.body,
        stock: req.body.stock || 0,
        isActive: true,
      });

      await product.save();
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 제품 업데이트
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
    }
    res.json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 제품 삭제 (소프트 삭제)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
    }
    res.json({ message: '제품이 삭제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 재고 조정
router.patch(
  '/:id/stock',
  authenticate,
  authorize('admin', 'manager'),
  [body('quantity').isInt().withMessage('수량은 정수여야 합니다.')],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quantity } = req.body;
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({ message: '제품을 찾을 수 없습니다.' });
      }

      const newStock = product.stock + quantity;
      if (newStock < 0) {
        return res.status(400).json({ message: '재고가 부족합니다.' });
      }

      product.stock = newStock;
      await product.save();

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
