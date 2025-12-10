import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkMongoDB } from '../middleware/checkMongoDB';
import Resource from '../models/Resource';
import Permission from '../models/Permission';

const router = express.Router();

// 모든 리소스 조회 (트리 구조)
router.get('/', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const resources = await Resource.find({})
      .populate('parent', 'name path')
      .populate('permissions', 'code name category')
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // 트리 구조로 변환
    const buildTree = (items: any[], parentId: any = null): any[] => {
      return items
        .filter((item: any) => {
          const itemParent = item.parent?._id?.toString() || item.parent?.toString() || null;
          return itemParent === parentId;
        })
        .map((item: any) => ({
          ...item,
          children: buildTree(items, item._id.toString()),
        }));
    };

    const tree = buildTree(resources);
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 플랫 리스트 (트리 구조 아님)
router.get('/flat', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const resources = await Resource.find({})
      .populate('parent', 'name path')
      .populate('permissions', 'code name category')
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json(resources);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 단일 리소스 조회
router.get('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('parent', 'name path type')
      .populate('permissions', 'code name description category')
      .lean();
    
    if (!resource) {
      return res.status(404).json({ message: '리소스를 찾을 수 없습니다' });
    }
    
    res.json(resource);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 리소스 생성
router.post(
  '/',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('리소스 이름을 입력하세요'),
    body('path').trim().notEmpty().withMessage('리소스 경로를 입력하세요'),
    body('type').isIn(['menu', 'page', 'api', 'action']).withMessage('올바른 리소스 타입을 선택하세요'),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, path, type, icon, parent, order, permissions, isActive } = req.body;

      const resource = new Resource({
        name,
        path,
        type,
        icon: icon || null,
        parent: parent || null,
        order: order || 0,
        permissions: permissions || [],
        isActive: isActive !== undefined ? isActive : true,
      });

      await resource.save();
      await resource.populate('parent', 'name path');
      await resource.populate('permissions', 'code name category');

      res.status(201).json(resource);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 리소스 수정
router.put(
  '/:id',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, path, type, icon, parent, order, permissions, isActive } = req.body;
      const resource = await Resource.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({ message: '리소스를 찾을 수 없습니다' });
      }

      if (name) resource.name = name;
      if (path) resource.path = path;
      if (type) resource.type = type;
      if (icon !== undefined) resource.icon = icon;
      if (parent !== undefined) resource.parent = parent || null;
      if (order !== undefined) resource.order = order;
      if (permissions !== undefined) resource.permissions = permissions;
      if (isActive !== undefined) resource.isActive = isActive;

      await resource.save();
      await resource.populate('parent', 'name path');
      await resource.populate('permissions', 'code name category');

      res.json(resource);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 리소스 삭제
router.delete('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({ message: '리소스를 찾을 수 없습니다' });
    }

    // 하위 리소스 확인
    const childResources = await Resource.find({ parent: resource._id });
    if (childResources.length > 0) {
      return res.status(400).json({ 
        message: `하위 리소스가 ${childResources.length}개 있습니다. 먼저 하위 리소스를 삭제하세요.` 
      });
    }

    await Resource.findByIdAndDelete(req.params.id);
    res.json({ message: '리소스가 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

