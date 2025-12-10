import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category';

dotenv.config();

const seedCategories = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-system');
    console.log('MongoDB 연결 성공');

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

    let created = 0;
    let skipped = 0;

    for (const categoryData of categories) {
      const existing = await Category.findOne({ code: categoryData.code });
      
      if (existing) {
        console.log(`카테고리 ${categoryData.code}는 이미 존재합니다.`);
        skipped++;
      } else {
        const category = new Category(categoryData);
        await category.save();
        console.log(`카테고리 ${categoryData.code} (${categoryData.name}) 생성 완료`);
        created++;
      }
    }

    console.log('========================================');
    console.log(`카테고리 시드 완료: ${created}개 생성, ${skipped}개 건너뜀`);
    console.log('========================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('카테고리 시드 데이터 생성 실패:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedCategories();

