/**
 * 데이터베이스 초기화 스크립트
 * 모든 기본 데이터를 한 번에 생성합니다.
 * 
 * 사용법: npm run init:db
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Category from '../models/Category';
import { hashPassword } from '../utils/password';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:your_secure_password_here@localhost:27017/erp-system?authSource=admin';

async function initDatabase() {
  try {
    console.log('═══════════════════════════════════════');
    console.log('   ERP 시스템 데이터베이스 초기화');
    console.log('═══════════════════════════════════════\n');

    // MongoDB 연결
    console.log('🔄 MongoDB 연결 중...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ MongoDB 연결 성공\n');

    let totalCreated = 0;
    let totalSkipped = 0;

    // 1. 관리자 계정 생성
    console.log('1️⃣  관리자 계정 생성 중...');
    try {
      const existingAdmin = await User.findOne({ email: 'admin@erp.com' });
      
      if (existingAdmin) {
        console.log('   ⏭️  관리자 계정이 이미 존재합니다.');
        totalSkipped++;
      } else {
        const hashedPassword = await hashPassword('admin123');
        const admin = new User({
          username: 'admin',
          email: 'admin@erp.com',
          password: hashedPassword,
          firstName: '관리자',
          lastName: '시스템',
          role: 'admin',
          isActive: true,
        });
        await admin.save();
        console.log('   ✅ 관리자 계정 생성 완료');
        console.log('      이메일: admin@erp.com');
        console.log('      비밀번호: admin123');
        totalCreated++;
      }
    } catch (error: any) {
      console.error('   ❌ 관리자 계정 생성 실패:', error.message);
    }
    console.log('');

    // 2. 카테고리 생성
    console.log('2️⃣  카테고리 생성 중...');
    const categories = [
      {
        code: 'PURCHASE',
        name: '일반 구매',
        type: 'purchase',
        description: '일반적인 구매 항목',
      },
      {
        code: 'LOGISTICS',
        name: '물류비',
        type: 'logistics',
        description: '운송 및 물류 관련 비용',
      },
      {
        code: 'EXPENSE',
        name: '경비',
        type: 'expense',
        description: '기타 경비 항목',
      },
      {
        code: 'OFFICE',
        name: '사무용품',
        type: 'purchase',
        description: '사무용품 및 소모품',
      },
      {
        code: 'MAINTENANCE',
        name: '유지보수',
        type: 'expense',
        description: '장비 및 시설 유지보수',
      },
    ];

    let categoryCreated = 0;
    let categorySkipped = 0;

    for (const categoryData of categories) {
      try {
        const existing = await Category.findOne({ code: categoryData.code });
        
        if (existing) {
          categorySkipped++;
        } else {
          const category = new Category(categoryData);
          await category.save();
          console.log(`   ✅ ${categoryData.code} (${categoryData.name}) 생성`);
          categoryCreated++;
        }
      } catch (error: any) {
        console.error(`   ❌ ${categoryData.code} 생성 실패:`, error.message);
      }
    }

    totalCreated += categoryCreated;
    totalSkipped += categorySkipped;
    console.log(`   📊 카테고리: ${categoryCreated}개 생성, ${categorySkipped}개 건너뜀\n`);

    // 완료 메시지
    console.log('═══════════════════════════════════════');
    console.log('   ✅ 데이터베이스 초기화 완료!');
    console.log('═══════════════════════════════════════');
    console.log(`   생성: ${totalCreated}개`);
    console.log(`   건너뜀: ${totalSkipped}개`);
    console.log('═══════════════════════════════════════\n');

    console.log('📋 기본 로그인 정보:');
    console.log('   이메일: admin@erp.com');
    console.log('   비밀번호: admin123');
    console.log('   ⚠️  보안을 위해 로그인 후 비밀번호를 변경하세요!\n');

    await mongoose.disconnect();
    console.log('✅ MongoDB 연결 종료');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 데이터베이스 초기화 실패:', error.message);
    console.error('\n확인 사항:');
    console.error('1. MongoDB가 실행 중인지 확인: npm run check:db');
    console.error('2. MongoDB URI가 올바른지 확인: backend/.env 파일');
    console.error('3. 네트워크 연결 확인\n');
    
    try {
      await mongoose.disconnect();
    } catch (e) {
      // 무시
    }
    process.exit(1);
  }
}

initDatabase();

