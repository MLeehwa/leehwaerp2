/**
 * 역할과 권한 초기화 스크립트
 * 
 * 사용법:
 *   npm run init:roles
 * 
 * 또는:
 *   ts-node src/scripts/initRolesAndPermissions.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from '../db/mongodb';
import Role from '../models/Role';
import Permission from '../models/Permission';
import Resource from '../models/Resource';

dotenv.config();

// 기본 권한 정의
const defaultPermissions = [
  // 사용자 관리
  { code: 'user.read', name: '사용자 조회', category: 'User Management', description: '사용자 목록 및 정보 조회' },
  { code: 'user.create', name: '사용자 생성', category: 'User Management', description: '새 사용자 생성' },
  { code: 'user.update', name: '사용자 수정', category: 'User Management', description: '사용자 정보 수정' },
  { code: 'user.delete', name: '사용자 삭제', category: 'User Management', description: '사용자 삭제' },
  
  // 역할 관리
  { code: 'role.read', name: '역할 조회', category: 'Role Management', description: '역할 목록 및 정보 조회' },
  { code: 'role.create', name: '역할 생성', category: 'Role Management', description: '새 역할 생성' },
  { code: 'role.update', name: '역할 수정', category: 'Role Management', description: '역할 정보 수정' },
  { code: 'role.delete', name: '역할 삭제', category: 'Role Management', description: '역할 삭제' },
  
  // 권한 관리
  { code: 'permission.read', name: '권한 조회', category: 'Permission Management', description: '권한 목록 및 정보 조회' },
  { code: 'permission.create', name: '권한 생성', category: 'Permission Management', description: '새 권한 생성' },
  { code: 'permission.update', name: '권한 수정', category: 'Permission Management', description: '권한 정보 수정' },
  { code: 'permission.delete', name: '권한 삭제', category: 'Permission Management', description: '권한 삭제' },
  
  // 구매 관리
  { code: 'purchase.request.read', name: '구매요청 조회', category: 'Purchase', description: '구매요청 목록 및 정보 조회' },
  { code: 'purchase.request.create', name: '구매요청 생성', category: 'Purchase', description: '새 구매요청 생성' },
  { code: 'purchase.request.update', name: '구매요청 수정', category: 'Purchase', description: '구매요청 정보 수정' },
  { code: 'purchase.request.approve', name: '구매요청 승인', category: 'Purchase', description: '구매요청 승인/거부' },
  { code: 'purchase.order.read', name: '구매주문 조회', category: 'Purchase', description: '구매주문 목록 및 정보 조회' },
  { code: 'purchase.order.create', name: '구매주문 생성', category: 'Purchase', description: '새 구매주문 생성' },
  { code: 'purchase.order.update', name: '구매주문 수정', category: 'Purchase', description: '구매주문 정보 수정' },
  
  // 판매 관리
  { code: 'sales.project.read', name: '프로젝트 조회', category: 'Sales', description: '프로젝트 목록 및 정보 조회' },
  { code: 'sales.project.create', name: '프로젝트 생성', category: 'Sales', description: '새 프로젝트 생성' },
  { code: 'sales.project.update', name: '프로젝트 수정', category: 'Sales', description: '프로젝트 정보 수정' },
  { code: 'sales.invoice.read', name: '인보이스 조회', category: 'Sales', description: '인보이스 목록 및 정보 조회' },
  { code: 'sales.invoice.create', name: '인보이스 생성', category: 'Sales', description: '새 인보이스 생성' },
  
  // 회계 관리
  { code: 'accounting.ap.read', name: '매입채무 조회', category: 'Accounting', description: '매입채무 목록 및 정보 조회' },
  { code: 'accounting.ar.read', name: '매출채권 조회', category: 'Accounting', description: '매출채권 목록 및 정보 조회' },
  
  // 마스터 데이터
  { code: 'master.customer.read', name: '고객 조회', category: 'Master Data', description: '고객 목록 및 정보 조회' },
  { code: 'master.customer.create', name: '고객 생성', category: 'Master Data', description: '새 고객 생성' },
  { code: 'master.supplier.read', name: '공급업체 조회', category: 'Master Data', description: '공급업체 목록 및 정보 조회' },
  { code: 'master.supplier.create', name: '공급업체 생성', category: 'Master Data', description: '새 공급업체 생성' },
  { code: 'master.company.read', name: '법인 조회', category: 'Master Data', description: '법인 목록 및 정보 조회' },
  { code: 'master.company.create', name: '법인 생성', category: 'Master Data', description: '새 법인 생성' },
];

// 기본 리소스 정의 (메뉴 구조)
const defaultResources = [
  // 시스템 관리
  { name: '시스템 관리', path: '/system-admin', type: 'menu' as const, order: 1000, isActive: true },
  { name: '사용자 관리', path: '/system-admin/users', type: 'page' as const, order: 1001, isActive: true, parent: null },
  { name: '역할 관리', path: '/system-admin/roles', type: 'page' as const, order: 1002, isActive: true, parent: null },
  { name: '권한 관리', path: '/system-admin/permissions', type: 'page' as const, order: 1003, isActive: true, parent: null },
  
  // 구매 관리
  { name: '구매 관리', path: '/purchase', type: 'menu' as const, order: 2000, isActive: true },
  { name: '구매요청', path: '/purchase/purchase-requests', type: 'page' as const, order: 2001, isActive: true, parent: null },
  { name: '구매주문', path: '/purchase/purchase-orders', type: 'page' as const, order: 2002, isActive: true, parent: null },
  
  // 판매 관리
  { name: '판매 관리', path: '/sales', type: 'menu' as const, order: 3000, isActive: true },
  { name: '프로젝트 관리', path: '/sales/projects', type: 'page' as const, order: 3001, isActive: true, parent: null },
  { name: '인보이스', path: '/sales/invoices', type: 'page' as const, order: 3002, isActive: true, parent: null },
];

async function initRolesAndPermissions() {
  try {
    console.log('🔄 MongoDB 연결 중...');
    await connectDB();
    
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB 연결에 실패했습니다.');
    }
    
    console.log('✅ MongoDB 연결 성공\n');
    
    // 1. 권한 생성
    console.log('📝 기본 권한 생성 중...');
    const permissionMap: Record<string, mongoose.Types.ObjectId> = {};
    
    for (const permData of defaultPermissions) {
      const existing = await Permission.findOne({ code: permData.code });
      if (existing) {
        console.log(`   ⏭️  권한 "${permData.name}" 이미 존재 (건너뜀)`);
        permissionMap[permData.code] = existing._id;
      } else {
        const permission = await Permission.create(permData);
        console.log(`   ✅ 권한 생성: ${permission.name} (${permission.code})`);
        permissionMap[permData.code] = permission._id;
      }
    }
    
    console.log(`\n✅ 총 ${Object.keys(permissionMap).length}개의 권한 준비 완료\n`);
    
    // 2. 리소스 생성 (간단한 버전, parent 관계는 나중에 설정 가능)
    console.log('📁 기본 리소스 생성 중...');
    for (const resData of defaultResources) {
      const existing = await Resource.findOne({ path: resData.path });
      if (existing) {
        console.log(`   ⏭️  리소스 "${resData.name}" 이미 존재 (건너뜀)`);
      } else {
        await Resource.create(resData);
        console.log(`   ✅ 리소스 생성: ${resData.name} (${resData.path})`);
      }
    }
    
    console.log(`\n✅ 리소스 생성 완료\n`);
    
    // 3. 기본 역할 생성
    console.log('👥 기본 역할 생성 중...');
    
    // 관리자 역할 (모든 권한)
    const adminPermissions = Object.values(permissionMap);
    const adminRole = await Role.findOneAndUpdate(
      { name: '관리자' },
      {
        name: '관리자',
        description: '시스템 전체 관리 권한을 가진 역할',
        isSystem: true,
        permissions: adminPermissions,
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ 역할 생성/업데이트: ${adminRole.name} (${adminPermissions.length}개 권한)`);
    
    // 매니저 역할 (일부 권한)
    const managerPermissions = [
      permissionMap['user.read'],
      permissionMap['purchase.request.read'],
      permissionMap['purchase.request.approve'],
      permissionMap['purchase.order.read'],
      permissionMap['purchase.order.create'],
      permissionMap['sales.project.read'],
      permissionMap['sales.project.create'],
      permissionMap['sales.invoice.read'],
      permissionMap['accounting.ap.read'],
      permissionMap['accounting.ar.read'],
      permissionMap['master.customer.read'],
      permissionMap['master.supplier.read'],
    ].filter(Boolean) as mongoose.Types.ObjectId[];
    
    const managerRole = await Role.findOneAndUpdate(
      { name: '매니저' },
      {
        name: '매니저',
        description: '일반 관리 권한을 가진 역할',
        isSystem: true,
        permissions: managerPermissions,
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ 역할 생성/업데이트: ${managerRole.name} (${managerPermissions.length}개 권한)`);
    
    // 직원 역할 (읽기 권한만)
    const employeePermissions = [
      permissionMap['purchase.request.read'],
      permissionMap['purchase.request.create'],
      permissionMap['purchase.order.read'],
      permissionMap['sales.project.read'],
      permissionMap['sales.invoice.read'],
      permissionMap['master.customer.read'],
      permissionMap['master.supplier.read'],
    ].filter(Boolean) as mongoose.Types.ObjectId[];
    
    const employeeRole = await Role.findOneAndUpdate(
      { name: '직원' },
      {
        name: '직원',
        description: '기본 조회 및 생성 권한을 가진 역할',
        isSystem: true,
        permissions: employeePermissions,
      },
      { upsert: true, new: true }
    );
    console.log(`   ✅ 역할 생성/업데이트: ${employeeRole.name} (${employeePermissions.length}개 권한)`);
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ 역할과 권한 초기화 완료!');
    console.log('═══════════════════════════════════════\n');
    console.log('📋 생성된 역할:');
    console.log('   1. 관리자 - 모든 권한');
    console.log('   2. 매니저 - 일반 관리 권한');
    console.log('   3. 직원 - 기본 조회/생성 권한');
    console.log('\n💡 다음 단계:');
    console.log('   1. /system-admin/roles 페이지에서 역할을 확인하세요');
    console.log('   2. /system-admin/permissions 페이지에서 권한을 확인하세요');
    console.log('   3. /admin/users 페이지에서 사용자에게 역할을 할당하세요\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  initRolesAndPermissions();
}

export default initRolesAndPermissions;

