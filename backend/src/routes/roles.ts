import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkMongoDB } from '../middleware/checkMongoDB';
import Role from '../models/Role';
import Permission from '../models/Permission';
import User from '../models/User';

const router = express.Router();

// 모든 역할 조회
router.get('/', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const roles = await Role.find({})
      .populate('parentRole', 'name')
      .populate('permissions', 'code name category')
      .sort({ createdAt: -1 })
      .lean();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 단일 역할 조회
router.get('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('parentRole', 'name description')
      .populate('permissions', 'code name description category')
      .lean();
    
    if (!role) {
      return res.status(404).json({ message: '역할을 찾을 수 없습니다' });
    }
    
    // 상속된 권한 계산 (상위 역할의 권한 포함)
    let allPermissions = [...(role.permissions || [])];
    if (role.parentRole) {
      const parentRole = await Role.findById(role.parentRole)
        .populate('permissions', 'code name description category')
        .lean();
      if (parentRole && parentRole.permissions) {
        // 중복 제거
        const existingCodes = new Set(allPermissions.map((p: any) => p.code));
        parentRole.permissions.forEach((p: any) => {
          if (!existingCodes.has(p.code)) {
            allPermissions.push(p);
          }
        });
      }
    }
    
    res.json({
      ...role,
      allPermissions, // 직접 권한 + 상속된 권한
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 역할 생성
router.post(
  '/',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('역할 이름을 입력하세요'),
    body('description').optional().trim(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description, parentRole, permissions, isSystem } = req.body;

      // 중복 확인
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({ message: '이미 존재하는 역할입니다' });
      }

      const role = new Role({
        name,
        description,
        parentRole: parentRole || null,
        permissions: permissions || [],
        isSystem: isSystem || false,
      });

      await role.save();
      await role.populate('parentRole', 'name');
      await role.populate('permissions', 'code name category');

      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 역할 수정
router.put(
  '/:id',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, parentRole, permissions } = req.body;
      const role = await Role.findById(req.params.id);

      if (!role) {
        return res.status(404).json({ message: '역할을 찾을 수 없습니다' });
      }

      // 시스템 역할은 이름 변경 불가
      if (role.isSystem && name && name !== role.name) {
        return res.status(400).json({ message: '시스템 역할의 이름은 변경할 수 없습니다' });
      }

      if (name) role.name = name;
      if (description !== undefined) role.description = description;
      if (parentRole !== undefined) role.parentRole = parentRole || null;
      if (permissions !== undefined) role.permissions = permissions;

      await role.save();
      await role.populate('parentRole', 'name');
      await role.populate('permissions', 'code name category');

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

// 역할 삭제
router.delete('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: '역할을 찾을 수 없습니다' });
    }

    // 시스템 역할은 삭제 불가
    if (role.isSystem) {
      return res.status(400).json({ message: '시스템 역할은 삭제할 수 없습니다' });
    }

    // 이 역할을 사용하는 사용자 확인
    const usersWithRole = await User.find({ roles: role._id });
    if (usersWithRole.length > 0) {
      return res.status(400).json({ 
        message: `이 역할을 사용하는 사용자가 ${usersWithRole.length}명 있습니다. 먼저 사용자에게서 역할을 제거하세요.` 
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: '역할이 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 역할에 권한 추가/제거
router.post(
  '/:id/permissions',
  checkMongoDB,
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { permissionIds, action } = req.body; // action: 'add' | 'remove'
      const role = await Role.findById(req.params.id);

      if (!role) {
        return res.status(404).json({ message: '역할을 찾을 수 없습니다' });
      }

      if (action === 'add') {
        // 중복 제거하면서 추가
        const newPermissions = [...new Set([...role.permissions.map((p: any) => p.toString()), ...permissionIds])];
        role.permissions = newPermissions;
      } else if (action === 'remove') {
        role.permissions = role.permissions.filter(
          (p: any) => !permissionIds.includes(p.toString())
        );
      } else {
        // 전체 교체
        role.permissions = permissionIds || [];
      }

      await role.save();
      await role.populate('permissions', 'code name category');

      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;

