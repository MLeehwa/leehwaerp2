import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkMongoDB } from '../middleware/checkMongoDB';
import Permission from '../models/Permission';
import Resource from '../models/Resource';

const router = express.Router();

// 모든 권한 조회
router.get('/', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const filter: any = {};
    if (category) {
      filter.category = category;
    }

    const permissions = await Permission.find(filter)
      .populate('resource', 'name path type')
      .sort({ category: 1, code: 1 })
      .lean();
    res.json(permissions);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 카테고리별 권한 조회
router.get('/by-category', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const permissions = await Permission.find({})
      .populate('resource', 'name path type')
      .sort({ category: 1, code: 1 })
      .lean();

    // 카테고리별로 그룹화
    const grouped: Record<string, any[]> = {};
    permissions.forEach((perm: any) => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });

    res.json(grouped);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 단일 권한 조회
router.get('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const permission = await Permission.findById(req.params.id)
      .populate('resource', 'name path type')
      .lean();
    
    if (!permission) {
      return res.status(404).json({ message: '권한을 찾을 수 없습니다' });
    }
    
    res.json(permission);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 권한 생성
router.post(
  '/',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  [
    body('code').trim().notEmpty().withMessage('권한 코드를 입력하세요'),
    body('name').trim().notEmpty().withMessage('권한 이름을 입력하세요'),
    body('category').trim().notEmpty().withMessage('카테고리를 입력하세요'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { code, name, description, category, resource } = req.body;

      // 중복 확인
      const existingPermission = await Permission.findOne({ code });
      if (existingPermission) {
        return res.status(400).json({ message: '이미 존재하는 권한 코드입니다' });
      }

      const permission = new Permission({
        code,
        name,
        description,
        category,
        resource: resource || null,
      });

      await permission.save();
      await permission.populate('resource', 'name path type');

      res.status(201).json(permission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 권한 수정
router.put(
  '/:id',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, category, resource } = req.body;
      const permission = await Permission.findById(req.params.id);

      if (!permission) {
        return res.status(404).json({ message: '권한을 찾을 수 없습니다' });
      }

      if (name) permission.name = name;
      if (description !== undefined) permission.description = description;
      if (category) permission.category = category;
      if (resource !== undefined) permission.resource = resource || null;

      await permission.save();
      await permission.populate('resource', 'name path type');

      res.json(permission);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 권한 삭제
router.delete('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ message: '권한을 찾을 수 없습니다' });
    }

    // 이 권한을 사용하는 역할 확인
    const Role = (await import('../models/Role')).default;
    const rolesWithPermission = await Role.find({ permissions: permission._id });
    if (rolesWithPermission.length > 0) {
      return res.status(400).json({ 
        message: `이 권한을 사용하는 역할이 ${rolesWithPermission.length}개 있습니다. 먼저 역할에서 권한을 제거하세요.` 
      });
    }

    await Permission.findByIdAndDelete(req.params.id);
    res.json({ message: '권한이 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

