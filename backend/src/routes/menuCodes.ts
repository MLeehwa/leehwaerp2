import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import MenuCode from '../models/MenuCode';

const router = express.Router();

/**
 * GET /api/menu-codes
 * 메뉴 코드 목록 조회
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { section, isActive, code } = req.query;
    
    let query: any = {};
    if (section) query.section = section;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (code) query.code = (code as string).toUpperCase();

    const menuCodes = await MenuCode.find(query)
      .sort({ section: 1, order: 1, code: 1 });

    res.json(menuCodes);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/menu-codes/:code
 * 특정 코드로 메뉴 경로 조회
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const code = req.params.code.toUpperCase();
    const menuCode = await MenuCode.findOne({ code, isActive: true });
    
    if (!menuCode) {
      return res.status(404).json({ message: '메뉴 코드를 찾을 수 없습니다' });
    }

    res.json(menuCode);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/menu-codes
 * 메뉴 코드 생성
 */
router.post(
  '/',
  [
    body('code').trim().notEmpty().withMessage('메뉴 코드를 입력하세요.'),
    body('name').trim().notEmpty().withMessage('메뉴 이름을 입력하세요.'),
    body('path').trim().notEmpty().withMessage('경로를 입력하세요.'),
    body('section').notEmpty().withMessage('섹션을 선택하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const existing = await MenuCode.findOne({ code: req.body.code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ message: '이미 존재하는 메뉴 코드입니다.' });
      }

      const menuCode = await MenuCode.create({
        ...req.body,
        code: req.body.code.toUpperCase(),
        section: req.body.section.toLowerCase(),
      });

      res.status(201).json(menuCode);
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ message: '이미 존재하는 메뉴 코드입니다.' });
      }
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * PUT /api/menu-codes/:id
 * 메뉴 코드 수정
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const menuCode = await MenuCode.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        code: req.body.code?.toUpperCase(),
        section: req.body.section?.toLowerCase(),
      },
      { new: true, runValidators: true }
    );

    if (!menuCode) {
      return res.status(404).json({ message: '메뉴 코드를 찾을 수 없습니다' });
    }

    res.json(menuCode);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/menu-codes/:id
 * 메뉴 코드 삭제
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const menuCode = await MenuCode.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!menuCode) {
      return res.status(404).json({ message: '메뉴 코드를 찾을 수 없습니다' });
    }

    res.json({ message: '메뉴 코드가 비활성화되었습니다', menuCode });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

