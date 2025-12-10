import express, { Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { checkMongoDB } from '../middleware/checkMongoDB';
import User from '../models/User';
import Role from '../models/Role';
import { hashPassword } from '../utils/password';

const router = express.Router();

// 모든 사용자 조회 (관리자만)
router.get('/', checkMongoDB, authenticate, authorize('admin', 'manager'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('roles', 'name description')
      .lean();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 현재 사용자 정보 조회
router.get('/me', checkMongoDB, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('roles', 'name description permissions')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 정보 업데이트
router.put('/me', checkMongoDB, authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 생성 (관리자만)
router.post('/', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, firstName, lastName, role, roles, allowedMenus, isActive } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: '필수 필드가 누락되었습니다' });
    }

    // 중복 확인
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 사용자입니다' });
    }

    // roles가 제공되면 사용, 아니면 role 필드로 기본 역할 설정
    // 역할 관리가 설정되지 않았어도 기본 role 필드로 사용자 생성 가능
    let roleIds: string[] = [];
    if (roles && Array.isArray(roles) && roles.length > 0) {
      roleIds = roles;
    } else if (role) {
      // 기존 role 필드로 Role 찾기 (역할이 있으면)
      try {
        const defaultRole = await Role.findOne({ name: role });
        if (defaultRole) {
          roleIds = [defaultRole._id.toString()];
        }
        // 역할이 없어도 기본 role 필드로 사용자 생성 가능 (roles는 빈 배열)
      } catch (error) {
        // Role 모델이 없거나 에러가 발생해도 기본 role 필드로 계속 진행
        console.warn('역할을 찾을 수 없습니다. 기본 role 필드만 사용합니다:', error);
      }
    }

    // 비밀번호는 User 모델의 pre('save') 훅에서 자동으로 해싱됨
    const user = new User({
      username,
      email,
      password: password, // 평문 비밀번호 전달 (모델에서 자동 해싱)
      firstName,
      lastName,
      role: role || 'employee',
      roles: roleIds,
      allowedMenus: allowedMenus || [],
      isActive: isActive !== undefined ? isActive : true,
    });

    await user.save();

    const userObj = user.toObject();
    const { password: _, ...userWithoutPassword } = userObj;
    res.status(201).json(userWithoutPassword);
  } catch (error: any) {
    console.error('사용자 생성 오류:', error);
    // MongoDB 연결 오류인 경우
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      return res.status(503).json({ 
        message: '데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }
    // 중복 키 오류
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({ 
        message: `이미 존재하는 ${field === 'email' ? '이메일' : field === 'username' ? '아이디' : field}입니다.` 
      });
    }
    res.status(500).json({ 
      message: error.message || '사용자 생성 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// 사용자 정보 업데이트 (관리자만)
router.put('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, role, roles, allowedMenus, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (allowedMenus !== undefined) updateData.allowedMenus = allowedMenus;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // roles 업데이트
    if (roles !== undefined) {
      if (Array.isArray(roles) && roles.length > 0) {
        updateData.roles = roles;
      } else if (role) {
        // role 필드로 기본 역할 찾기
        const defaultRole = await Role.findOne({ name: role });
        if (defaultRole) {
          updateData.roles = [defaultRole._id];
        }
      } else {
        updateData.roles = [];
      }
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password').populate('roles', 'name description');
    
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 사용자 삭제 (관리자만)
router.delete('/:id', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 자기 자신은 삭제 불가
    if (user._id.toString() === req.userId) {
      return res.status(400).json({ message: '자기 자신은 삭제할 수 없습니다' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: '사용자가 삭제되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 비밀번호 재설정 (관리자만)
router.post('/:id/reset-password', checkMongoDB, authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: '비밀번호는 최소 6자 이상이어야 합니다' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    const hashedPassword = await hashPassword(password);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: '비밀번호가 변경되었습니다' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
