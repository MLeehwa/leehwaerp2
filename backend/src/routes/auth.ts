import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import { hashPassword, comparePassword } from '../utils/password';
import { checkMongoDB } from '../middleware/checkMongoDB';

const router = express.Router();

// 테스트 라우트
router.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Auth router is working!', path: req.path });
});

router.post('/test', (req: Request, res: Response) => {
  res.json({ message: 'POST to auth router is working!', body: req.body });
});

// 회원가입
router.post(
  '/register',
  checkMongoDB, // MongoDB 연결 확인 미들웨어 추가
  [
    body('username').trim().isLength({ min: 3 }).withMessage('사용자명은 최소 3자 이상이어야 합니다.'),
    body('email').isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다.'),
    body('firstName').trim().notEmpty().withMessage('이름을 입력하세요.'),
    body('lastName').trim().notEmpty().withMessage('성을 입력하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('🔵 회원가입 요청 받음:', req.method, req.path, req.body);
      
      // checkMongoDB 미들웨어가 이미 연결 상태를 확인했으므로 여기서는 바로 진행
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, firstName, lastName, role, allowedMenus } = req.body;

      // 중복 확인
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
      }

      // 비밀번호는 User 모델의 pre('save') 훅에서 자동으로 해싱됨
      const user = new User({
        username,
        email,
        password: password, // 평문 비밀번호 전달 (모델에서 자동 해싱)
        firstName,
        lastName,
        role: role || 'employee',
        roles: [], // 기본적으로 빈 배열
        isActive: true,
        allowedMenus: allowedMenus || [],
      });

      await user.save();

      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      console.log('✅ 회원가입 성공:', email, username);
      res.status(201).json({
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          allowedMenus: user.allowedMenus || [],
        },
      });
    } catch (error: any) {
      console.error('❌ 회원가입 오류:', error);
      console.error('오류 상세:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // MongoDB 연결 오류
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
          message: '데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.',
          error: 'DATABASE_CONNECTION_ERROR'
        });
      }
      
      // MongoDB 관련 오류인 경우
      if (error.name === 'MongoServerError' || error.name === 'MongooseError' || error.name === 'MongoError') {
        return res.status(503).json({ 
          message: '데이터베이스 오류가 발생했습니다. MongoDB 연결을 확인하세요.',
          error: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        message: error.message || '회원가입 중 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// 로그인
router.post(
  '/login',
  checkMongoDB, // MongoDB 연결 확인 미들웨어 추가
  [
    body('email').optional().isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('username').optional().isLength({ min: 3 }).withMessage('아이디는 최소 3자 이상이어야 합니다.'),
    body('password').notEmpty().withMessage('비밀번호를 입력하세요.'),
  ],
  async (req: Request, res: Response) => {
    try {
      console.log('🔵 로그인 요청 받음:', req.method, req.path, req.body);
      
      // checkMongoDB 미들웨어가 이미 연결 상태를 확인했으므로 여기서는 바로 진행
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // 이메일 또는 아이디 중 하나는 필수
      const { email, username, password } = req.body;
      if (!email && !username) {
        return res.status(400).json({ message: '이메일 또는 아이디를 입력하세요.' });
      }
      
      const loginId = email || username; // 이메일 또는 아이디

      // 이메일 또는 아이디로 사용자 찾기
      const user = await User.findOne({ 
        $or: [
          { email: loginId },
          { username: loginId }
        ]
      });
      if (!user || !user.isActive) {
        return res.status(401).json({ message: '잘못된 이메일/아이디 또는 비밀번호입니다.' });
      }

      // 비밀번호 확인
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: '잘못된 이메일 또는 비밀번호입니다.' });
      }

      const token = jwt.sign(
        { userId: user._id.toString(), role: user.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      console.log('✅ 로그인 성공:', user.email, user.username);
      res.json({
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          allowedMenus: user.allowedMenus || [],
        },
      });
    } catch (error: any) {
      console.error('❌ 로그인 오류:', error);
      console.error('오류 상세:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // MongoDB 연결 오류
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ 
          message: '데이터베이스에 연결할 수 없습니다. MongoDB가 실행 중인지 확인하세요.',
          error: 'DATABASE_CONNECTION_ERROR'
        });
      }
      
      // MongoDB 관련 오류인 경우
      if (error.name === 'MongoServerError' || error.name === 'MongooseError' || error.name === 'MongoError') {
        return res.status(503).json({ 
          message: '데이터베이스 오류가 발생했습니다. MongoDB 연결을 확인하세요.',
          error: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      
      res.status(500).json({ 
        message: error.message || '서버 오류가 발생했습니다.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

export default router;

