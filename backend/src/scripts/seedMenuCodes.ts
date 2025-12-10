import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MenuCode from '../models/MenuCode';

dotenv.config();

const seedMenuCodes = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/erp-system');
    console.log('MongoDB 연결 성공');

    const menuCodes = [
      // Sales
      {
        code: '0010',
        name: 'SALES 인보이스 관리',
        path: '/sales/invoices',
        section: 'sales',
        order: 10,
        description: '인보이스 생성 및 관리',
      },
      {
        code: '0020',
        name: 'SALES AR 현황',
        path: '/sales/ar',
        section: 'sales',
        order: 20,
        description: '매출채권 현황 조회',
      },
      {
        code: '0030',
        name: 'SALES 리포트',
        path: '/sales/reports',
        section: 'sales',
        order: 30,
        description: 'Sales 리포트',
      },
      // Accounting
      {
        code: '0100',
        name: 'ACCOUNTING 매입채무/지급 (AP)',
        path: '/accounting/accounts-payable',
        section: 'accounting',
        order: 100,
        description: '매입채무 및 지급 관리',
      },
      {
        code: '0110',
        name: 'ACCOUNTING 매출채권/수금 (AR)',
        path: '/accounting/accounts-receivable',
        section: 'accounting',
        order: 110,
        description: '매출채권 및 수금 관리',
      },
      {
        code: '0120',
        name: 'ACCOUNTING 리포트',
        path: '/accounting/reports',
        section: 'accounting',
        order: 120,
        description: 'Accounting 리포트',
      },
      // Purchase
      {
        code: '0200',
        name: 'PURCHASE 구매요청 (PR)',
        path: '/purchase/purchase-requests',
        section: 'purchase',
        order: 200,
        description: '구매요청서 관리',
      },
      {
        code: '0210',
        name: 'PURCHASE 구매주문 (PO)',
        path: '/purchase/purchase-orders',
        section: 'purchase',
        order: 210,
        description: '구매주문서 관리',
      },
      {
        code: '0220',
        name: 'PURCHASE 입고 관리',
        path: '/purchase/goods-receipt',
        section: 'purchase',
        order: 220,
        description: '입고 관리',
      },
      // Master Data
      {
        code: '1000',
        name: 'MASTER DATA 고객 관리',
        path: '/master-data/sales/customers',
        section: 'master-data',
        order: 1000,
        description: '고객 정보 관리',
      },
      {
        code: '1010',
        name: 'MASTER DATA 프로젝트 관리',
        path: '/master-data/sales/projects',
        section: 'master-data',
        order: 1010,
        description: '프로젝트 정보 관리',
      },
      {
        code: '1100',
        name: 'MASTER DATA 법인 관리',
        path: '/master-data/accounting/companies',
        section: 'master-data',
        order: 1100,
        description: '법인 정보 관리',
      },
      {
        code: '1110',
        name: 'MASTER DATA 로케이션 관리',
        path: '/master-data/accounting/locations',
        section: 'master-data',
        order: 1110,
        description: '로케이션 정보 관리',
      },
      // Admin
      {
        code: '9000',
        name: 'ADMIN 사용자 관리',
        path: '/admin/users',
        section: 'admin',
        order: 9000,
        description: '사용자 관리',
      },
      {
        code: '9010',
        name: 'ADMIN 데이터베이스 관리',
        path: '/admin/database',
        section: 'admin',
        order: 9010,
        description: '데이터베이스 관리',
      },
      {
        code: '9020',
        name: 'ADMIN 저장소 상태',
        path: '/admin/storage-status',
        section: 'admin',
        order: 9020,
        description: '저장소 상태 확인',
      },
    ];

    let created = 0;
    let skipped = 0;

    for (const menuCodeData of menuCodes) {
      const existing = await MenuCode.findOne({ code: menuCodeData.code });

      if (existing) {
        console.log(`메뉴 코드 ${menuCodeData.code}는 이미 존재합니다.`);
        skipped++;
      } else {
        const menuCode = new MenuCode(menuCodeData);
        await menuCode.save();
        console.log(`메뉴 코드 ${menuCodeData.code} (${menuCodeData.name}) 생성 완료`);
        created++;
      }
    }

    console.log('========================================');
    console.log(`메뉴 코드 시드 완료: ${created}개 생성, ${skipped}개 건너뜀`);
    console.log('========================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('메뉴 코드 시드 데이터 생성 실패:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedMenuCodes();

