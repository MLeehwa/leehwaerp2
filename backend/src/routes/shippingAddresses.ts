import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import ShippingAddress from '../models/ShippingAddress';

const router = express.Router();

// 모든 배송지 조회
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.query;
    let query: any = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const addresses = await ShippingAddress.find(query).sort({ isDefault: -1, name: 1 });

    res.json(addresses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 배송지 상세 조회
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const address = await ShippingAddress.findById(req.params.id);
    if (!address) {
      return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
    }
    res.json(address);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 배송지 생성
router.post(
  '/',
  authenticate,
  [
    body('name').trim().notEmpty().withMessage('배송지 이름을 입력하세요.'),
    body('street').trim().notEmpty().withMessage('도로명 주소를 입력하세요.'),
    body('city').trim().notEmpty().withMessage('도시를 입력하세요.'),
    body('country').trim().notEmpty().withMessage('국가를 입력하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 기본 주소로 설정하면 다른 주소들의 기본 주소 해제
      if (req.body.isDefault) {
        await ShippingAddress.updateMany({ isDefault: true }, { isDefault: false });
      }

      const address = new ShippingAddress({
        ...req.body,
        createdBy: req.userId,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        isDefault: req.body.isDefault || false,
      });

      await address.save();
      res.status(201).json(address);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 배송지 업데이트
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('배송지 이름을 입력하세요.'),
    body('street').optional().trim().notEmpty().withMessage('도로명 주소를 입력하세요.'),
    body('city').optional().trim().notEmpty().withMessage('도시를 입력하세요.'),
    body('country').optional().trim().notEmpty().withMessage('국가를 입력하세요.'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const address = await ShippingAddress.findById(req.params.id);
      if (!address) {
        return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
      }

      // 기본 주소로 설정하면 다른 주소들의 기본 주소 해제
      if (req.body.isDefault && !address.isDefault) {
        await ShippingAddress.updateMany(
          { _id: { $ne: req.params.id }, isDefault: true },
          { isDefault: false }
        );
      }

      const updated = await ShippingAddress.findByIdAndUpdate(req.params.id, req.body, { new: true });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 배송지 삭제
router.delete('/:id', authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const address = await ShippingAddress.findByIdAndDelete(req.params.id);
    if (!address) {
      return res.status(404).json({ message: '배송지를 찾을 수 없습니다.' });
    }

    res.json({ message: '배송지가 삭제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
