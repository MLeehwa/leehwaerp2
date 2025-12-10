/**
 * Invoice 시스템 샘플 데이터 생성 스크립트
 * 
 * 사용법: ts-node src/scripts/seedInvoiceData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from '../models/Customer';
import Project from '../models/Project';
import ProjectBillingRule from '../models/ProjectBillingRule';
import Delivery from '../models/Delivery';
import LaborLog from '../models/LaborLog';

dotenv.config();

async function seedInvoiceData() {
  console.log('🌱 Invoice 시스템 샘플 데이터 생성 시작...\n');

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/erp-system');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }

  // 1. 고객 생성
  console.log('1. 고객 생성 중...');
  const customer1 = new Customer({
    name: 'Volkswagen',
    company: 'VW Group',
    email: 'contact@vw.com',
    phone: '+49-123-456-7890',
    isActive: true,
  });
  await customer1.save();
  console.log(`   ✅ 고객 생성: ${customer1.name} (ID: ${customer1._id})\n`);

  const customer2 = new Customer({
    name: 'Kia Motors',
    company: 'Kia Corporation',
    email: 'contact@kia.com',
    phone: '+82-2-1234-5678',
    isActive: true,
  });
  await customer2.save();
  console.log(`   ✅ 고객 생성: ${customer2.name} (ID: ${customer2._id})\n`);

  // 2. 프로젝트 생성
  console.log('2. 프로젝트 생성 중...');

  const project1 = new Project({
    projectCode: 'VW-CKD',
    projectName: 'Volkswagen CKD Project',
    customer: customer1._id,
    startDate: new Date('2024-01-01'),
    status: 'active',
    poNumber: 'PO-VW-2024-001',
    currency: 'USD',
    isActive: true,
  });
  await project1.save();
  console.log(`   ✅ 프로젝트 생성: ${project1.projectCode} (ID: ${project1._id})\n`);

  const project2 = new Project({
    projectCode: 'VW-TM',
    projectName: 'Volkswagen TM Project',
    customer: customer1._id,
    startDate: new Date('2024-01-01'),
    status: 'active',
    poNumber: 'PO-VW-2024-002',
    currency: 'USD',
    isActive: true,
  });
  await project2.save();
  console.log(`   ✅ 프로젝트 생성: ${project2.projectCode} (ID: ${project2._id})\n`);

  const project3 = new Project({
    projectCode: 'KMX',
    projectName: 'Kia Motors Production',
    customer: customer2._id,
    startDate: new Date('2024-01-01'),
    status: 'active',
    poNumber: 'PO-KMX-2024-001',
    currency: 'USD',
    isActive: true,
  });
  await project3.save();
  console.log(`   ✅ 프로젝트 생성: ${project3.projectCode} (ID: ${project3._id})\n`);

  const project4 = new Project({
    projectCode: 'BSA',
    projectName: 'BSA Fixed Monthly Service',
    customer: customer1._id,
    startDate: new Date('2024-01-01'),
    status: 'active',
    poNumber: 'PO-BSA-2024-001',
    currency: 'USD',
    isActive: true,
  });
  await project4.save();
  console.log(`   ✅ 프로젝트 생성: ${project4.projectCode} (ID: ${project4._id})\n`);

  // 3. Billing Rules 생성
  console.log('3. Billing Rules 생성 중...');

  // VW-CKD: EA 기준
  const rule1 = new ProjectBillingRule({
    project: project1._id,
    ruleName: 'VW CKD - Part Billing',
    ruleType: 'EA',
    unitBasis: 'EA',
    priceSource: 'price_list',
    groupingKey: 'part_no',
    description: '부품별 EA 단가 청구',
    config: {
      unitPrice: 0.14,
      groupBy: ['partNo'],
    },
    priority: 1,
    isActive: true,
  });
  await rule1.save();
  console.log(`   ✅ Rule 생성: ${rule1.ruleName} (ID: ${rule1._id})\n`);

  // VW-TM: 팔레트 기준
  const rule2 = new ProjectBillingRule({
    project: project2._id,
    ruleName: 'VW TM - Pallet Billing',
    ruleType: 'PALLET',
    unitBasis: 'Pallet',
    priceSource: 'pallet_rate',
    groupingKey: 'pallet_no',
    description: '팔레트별 청구',
    config: {
      unitPrice: 22,
      groupBy: ['palletNo'],
    },
    priority: 1,
    isActive: true,
  });
  await rule2.save();
  console.log(`   ✅ Rule 생성: ${rule2.ruleName} (ID: ${rule2._id})\n`);

  // KMX: 노무 기준
  const rule3 = new ProjectBillingRule({
    project: project3._id,
    ruleName: 'KMX - Labor Billing',
    ruleType: 'LABOR',
    unitBasis: 'Hour',
    priceSource: 'labor_rate',
    groupingKey: 'work_type',
    description: '작업 유형별 노무 시간 청구',
    config: {
      unitPrice: 18,
      groupBy: ['workType'],
    },
    priority: 1,
    isActive: true,
  });
  await rule3.save();
  console.log(`   ✅ Rule 생성: ${rule3.ruleName} (ID: ${rule3._id})\n`);

  // BSA: 고정 월비
  const rule4 = new ProjectBillingRule({
    project: project4._id,
    ruleName: 'BSA - Fixed Monthly Fee',
    ruleType: 'FIXED',
    unitBasis: 'Month',
    priceSource: 'fixed_price',
    groupingKey: 'none',
    description: '고정 월비',
    config: {
      unitPrice: 5000,
    },
    priority: 1,
    isActive: true,
  });
  await rule4.save();
  console.log(`   ✅ Rule 생성: ${rule4.ruleName} (ID: ${rule4._id})\n`);

  // 4. 출하 실적 데이터 생성 (VW-CKD)
  console.log('4. 출하 실적 데이터 생성 중...');

  const delivery1 = new Delivery({
    project: project1._id,
    customer: customer1._id,
    deliveryDate: new Date('2024-01-15'),
    partNo: 'F100',
    partName: 'Front Bumper',
    quantity: 562,
    unit: 'EA',
    status: 'delivered',
    invoiced: false,
  });
  await delivery1.save();
  console.log(`   ✅ 출하 생성: ${delivery1.partNo} - ${delivery1.quantity} EA\n`);

  const delivery2 = new Delivery({
    project: project1._id,
    customer: customer1._id,
    deliveryDate: new Date('2024-01-20'),
    partNo: 'F200',
    partName: 'Rear Bumper',
    quantity: 300,
    unit: 'EA',
    status: 'delivered',
    invoiced: false,
  });
  await delivery2.save();
  console.log(`   ✅ 출하 생성: ${delivery2.partNo} - ${delivery2.quantity} EA\n`);

  // VW-TM 팔레트 출하
  const delivery3 = new Delivery({
    project: project2._id,
    customer: customer1._id,
    deliveryDate: new Date('2024-01-18'),
    palletNo: 'PAL-001',
    palletType: '6500lb',
    palletCount: 1,
    quantity: 50,
    unit: 'EA',
    status: 'delivered',
    invoiced: false,
  });
  await delivery3.save();
  console.log(`   ✅ 출하 생성: ${delivery3.palletNo} - ${delivery3.palletCount} Pallet\n`);

  const delivery4 = new Delivery({
    project: project2._id,
    customer: customer1._id,
    deliveryDate: new Date('2024-01-22'),
    palletNo: 'PAL-002',
    palletType: '6500lb',
    palletCount: 1,
    quantity: 55,
    unit: 'EA',
    status: 'delivered',
    invoiced: false,
  });
  await delivery4.save();
  console.log(`   ✅ 출하 생성: ${delivery4.palletNo} - ${delivery4.palletCount} Pallet\n`);

  // 5. 노무 실적 데이터 생성 (KMX)
  console.log('5. 노무 실적 데이터 생성 중...');

  const labor1 = new LaborLog({
    project: project3._id,
    customer: customer2._id,
    workDate: new Date('2024-01-15'),
    workType: 'Packing',
    workDescription: 'Product packaging work',
    hours: 42,
    laborRate: 18,
    status: 'completed',
    invoiced: false,
  });
  await labor1.save();
  console.log(`   ✅ 노무 로그 생성: ${labor1.workType} - ${labor1.hours} Hours\n`);

  const labor2 = new LaborLog({
    project: project3._id,
    customer: customer2._id,
    workDate: new Date('2024-01-20'),
    workType: 'Assembly',
    workDescription: 'Product assembly work',
    hours: 35,
    laborRate: 20,
    status: 'completed',
    invoiced: false,
  });
  await labor2.save();
  console.log(`   ✅ 노무 로그 생성: ${labor2.workType} - ${labor2.hours} Hours\n`);

  console.log('✅ 샘플 데이터 생성 완료!\n');

  await mongoose.disconnect();
}

// 실행
seedInvoiceData().catch(console.error);
