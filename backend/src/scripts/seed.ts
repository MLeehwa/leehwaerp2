import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const seedAdmin = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-system');
    console.log('MongoDB 연결 성공');

    // 기존 관리자 확인
    const existingAdmin = await User.findOne({ email: 'admin@erp.com' });
    
    if (existingAdmin) {
      console.log('기본 관리자 계정이 이미 존재합니다.');
      console.log('이메일: admin@erp.com');
      console.log('비밀번호: admin123');
      await mongoose.disconnect();
      return;
    }

    // 기본 관리자 계정 생성
    const admin = new User({
      username: 'admin',
      email: 'admin@erp.com',
      password: 'admin123',
      firstName: '관리자',
      lastName: '시스템',
      role: 'admin',
      isActive: true,
    });

    await admin.save();

    console.log('========================================');
    console.log('기본 관리자 계정이 생성되었습니다.');
    console.log('========================================');
    console.log('이메일: admin@erp.com');
    console.log('비밀번호: admin123');
    console.log('========================================');
    console.log('⚠️  보안을 위해 로그인 후 비밀번호를 변경하세요!');
    console.log('========================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('시드 데이터 생성 실패:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();

