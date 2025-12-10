import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import supplierRoutes from './routes/suppliers';
import purchaseRequestRoutes from './routes/purchaseRequests';
import purchaseOrderRoutes from './routes/purchaseOrders';
import accountsPayableRoutes from './routes/accountsPayable';
import categoryRoutes from './routes/categories';
import shippingAddressRoutes from './routes/shippingAddresses';
import projectRoutes from './routes/projects';
import projectBillingRuleRoutes from './routes/projectBillingRules';
import masterBillingRuleRoutes from './routes/masterBillingRules';
import palletScheduleRoutes from './routes/palletSchedules';
import containerRoutes from './routes/containers';
import palletProjectRoutes from './routes/palletProjects';
import invoiceRoutes from './routes/invoices';
import deliveryRoutes from './routes/deliveries';
import laborLogRoutes from './routes/laborLogs';
import projectSourceFileRoutes from './routes/projectSourceFiles';
import projectMonthlyClosingRoutes from './routes/projectMonthlyClosings';
import accountsReceivableRoutes from './routes/accountsReceivable';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import resourceRoutes from './routes/resources';
import aiRoutes from './routes/ai';

dotenv.config();

// MongoDB 연결
import { connectDB } from './db/mongodb';

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 저장소 디렉토리 생성
import fs from 'fs';
import path from 'path';
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created');
}

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('✅ MongoDB Connected');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/accounts-payable', accountsPayableRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shipping-addresses', shippingAddressRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/pallet-schedules', palletScheduleRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/pallet-projects', palletProjectRoutes);
app.use('/api/project-billing-rules', projectBillingRuleRoutes);
app.use('/api/master-billing-rules', masterBillingRuleRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/labor-logs', laborLogRoutes);
app.use('/api/project-source-files', projectSourceFileRoutes);
app.use('/api/project-monthly-closings', projectMonthlyClosingRoutes);
app.use('/api/accounts-receivable', accountsReceivableRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/resources', resourceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'ERP System API is running',
    database: 'mongodb'
  });
});

// 에러 핸들링 미들웨어
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('에러 발생:', err);
  res.status(err.status || 500).json({
    message: err.message || '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});



app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

