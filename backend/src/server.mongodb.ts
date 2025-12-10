import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';

// MongoDB 연결
import { connectDB } from './db/mongodb';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import inventoryRoutes from './routes/inventory';
import customerRoutes from './routes/customers';
import companyRoutes from './routes/companies';
import locationRoutes from './routes/locations';
import supplierRoutes from './routes/suppliers';
import purchaseRequestRoutes from './routes/purchaseRequests';
import purchaseOrderRoutes from './routes/purchaseOrders';
import accountsPayableRoutes from './routes/accountsPayable';
import categoryRoutes from './routes/categories';
import shippingAddressRoutes from './routes/shippingAddresses';
import projectRoutes from './routes/projects';
import projectBillingRuleRoutes from './routes/projectBillingRules';
import masterBillingRuleRoutes from './routes/masterBillingRules';
import invoiceRoutes from './routes/invoices';
import deliveryRoutes from './routes/deliveries';
import laborLogRoutes from './routes/laborLogs';
import projectSourceFileRoutes from './routes/projectSourceFiles';
import projectMonthlyClosingRoutes from './routes/projectMonthlyClosings';
import accountsReceivableRoutes from './routes/accountsReceivable';
import databaseAdminRoutes from './routes/admin/database';
import storageStatusRoutes from './routes/admin/storage-status';
import menuCodeRoutes from './routes/menuCodes';
import notificationRoutes from './routes/notifications';
import vwckdArnRoutes from './routes/vwckd/arn';
import vwckdShippingRoutes from './routes/vwckd/shipping';
import vwckdInventoryRoutes from './routes/vwckd/inventory';
import vwckdRelocationRoutes from './routes/vwckd/relocation';
import vwckdRackRoutes from './routes/vwckd/rack';
import vwckdMasterRoutes from './routes/vwckd/master';
import vwckdReportsRoutes from './routes/vwckd/reports';
import maintenanceEquipmentRoutes from './routes/maintenance/equipment';
import maintenanceScheduleRoutes from './routes/maintenance/schedules';
import maintenanceReportRoutes from './routes/maintenance/reports';
import maintenanceEquipmentTypeRoutes from './routes/maintenance/equipmentTypes';
import maintenanceRepairRoutes from './routes/maintenance/repairs';
import palletScheduleRoutes from './routes/palletSchedules';
import containerRoutes from './routes/containers';
import palletProjectRoutes from './routes/palletProjects';
import roleRoutes from './routes/roles';
import permissionRoutes from './routes/permissions';
import resourceRoutes from './routes/resources';
import aiRoutes from './routes/ai';
import setupRoutes from './routes/setup';

// Models (동적 import로 변경하여 MongoDB 연결 실패 시에도 서버가 시작되도록)
// import User from './models/User';
// import { hashPassword } from './utils/password';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 디버깅: 모든 요청 로깅
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`);
  next();
});

// Routes - MongoDB 연결 전에 등록 (라우트는 비동기 연결과 무관하게 등록 가능)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/accounts-payable', accountsPayableRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/shipping-addresses', shippingAddressRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-billing-rules', projectBillingRuleRoutes);
app.use('/api/master-billing-rules', masterBillingRuleRoutes);
app.use('/api/pallet-schedules', palletScheduleRoutes);
app.use('/api/containers', containerRoutes);
app.use('/api/pallet-projects', palletProjectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/labor-logs', laborLogRoutes);
app.use('/api/project-source-files', projectSourceFileRoutes);
app.use('/api/project-monthly-closings', projectMonthlyClosingRoutes);
app.use('/api/accounts-receivable', accountsReceivableRoutes);
app.use('/api/admin/database', databaseAdminRoutes);
app.use('/api/admin/storage-status', storageStatusRoutes);
app.use('/api/menu-codes', menuCodeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/vwckd/arn', vwckdArnRoutes);
app.use('/api/vwckd/shipping', vwckdShippingRoutes);
app.use('/api/vwckd/inventory', vwckdInventoryRoutes);
app.use('/api/vwckd/relocation', vwckdRelocationRoutes);
app.use('/api/vwckd/rack', vwckdRackRoutes);
app.use('/api/vwckd/master', vwckdMasterRoutes);
app.use('/api/vwckd/reports', vwckdReportsRoutes);
app.use('/api/maintenance/equipment', maintenanceEquipmentRoutes);
app.use('/api/maintenance/equipment-types', maintenanceEquipmentTypeRoutes);
app.use('/api/maintenance/schedules', maintenanceScheduleRoutes);
app.use('/api/maintenance/reports', maintenanceReportRoutes);
app.use('/api/maintenance/repairs', maintenanceRepairRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/setup', setupRoutes);

console.log('✅ 모든 라우트 등록 완료');

// -------------------------------------------------------------------------
// [Unified Deployment] 프론트엔드 정적 파일 서빙 설정
// -------------------------------------------------------------------------

// 1. API 404 처리 (API 요청인데 없는 주소면 JSON 에러 리턴)
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'API 엔드포인트를 찾을 수 없습니다.',
    path: req.originalUrl
  });
});

// 2. 프론트엔드 빌드 결과물 서빙 (Monolithic Deployment)
// backend/public 폴더에 미리 빌드된 프론트엔드 파일이 있다고 가정합니다.
// Vercel 환경에서는 process.cwd()가 프로젝트 루트(backend 폴더)를 가리킵니다.
const frontendBuildPath = path.join(process.cwd(), 'public');

// 정적 파일 미들웨어 (이미지, JS, CSS 등)
app.use(express.static(frontendBuildPath));

// 3. SPA Fallback (그 외 모든 요청은 index.html로 보내서 React가 라우팅 처리하게 함)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      // 프론트엔드 빌드가 아직 안 되었거나 경로가 틀린 경우
      let debugInfo = '';
      try {
        const fs = await import('fs');
        const rootFiles = fs.readdirSync(process.cwd());
        debugInfo = `Root Files (${process.cwd()}): [${rootFiles.join(', ')}]`;
        if (rootFiles.includes('public')) {
          const publicFiles = fs.readdirSync(path.join(process.cwd(), 'public'));
          debugInfo += ` | Public Files: [${publicFiles.join(', ')}]`;
        }
      } catch (e: any) { debugInfo = `List Error: ${e.message}`; }

      res.status(500).send(`Server Error: Frontend build not found. Searched at: ${frontendBuildPath}. Debug: ${debugInfo}`);
    }
  });
});

// 공통 에러 핸들러 (모든 라우트 이후에 등록)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 에러 발생:', err);
  console.error('요청 경로:', req.path);
  console.error('에러 스택:', err.stack);

  // MongoDB 연결 오류인 경우
  if (err.message && err.message.includes('MongoServerError') || err.message.includes('MongooseError')) {
    return res.status(503).json({
      message: '데이터베이스 연결 오류가 발생했습니다',
      error: 'DATABASE_ERROR'
    });
  }

  res.status(err.status || 500).json({
    message: err.message || '서버 오류가 발생했습니다',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// MongoDB 연결 및 초기화 (완전히 비동기, 서버 시작을 절대 막지 않음)
setTimeout(async () => {
  try {
    console.log('🔄 MongoDB 연결 시도 중...');

    // MongoDB 연결 시도 (타임아웃 짧게 설정)
    try {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MongoDB 연결 타임아웃')), 10000)
        )
      ]);
    } catch (connectError: any) {
      console.log('⚠️  MongoDB 연결 실패 또는 타임아웃:', connectError.message);
      console.log('💡 서버는 계속 실행됩니다. MongoDB가 필요하면 나중에 연결할 수 있습니다.');
      return;
    }

    // MongoDB 연결 확인
    try {
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState === 1) {
        // 기본 관리자 계정 생성 (동적 import)
        try {
          const User = (await import('./models/User')).default;
          const { hashPassword } = await import('./utils/password');

          const existingAdmin = await User.findOne({ email: 'admin@erp.com' });
          if (!existingAdmin) {
            // 비밀번호는 User 모델의 pre('save') 훅에서 자동으로 해싱됨
            await User.create({
              username: 'admin',
              email: 'admin@erp.com',
              password: 'admin123', // 평문 비밀번호 전달 (모델에서 자동 해싱)
              firstName: '관리자',
              lastName: '시스템',
              role: 'admin',
              roles: [], // 기본적으로 빈 배열
              isActive: true,
            });
            console.log('✅ 기본 관리자 계정 생성 완료 (admin@erp.com / admin123)');
          } else {
            console.log('✅ 기본 관리자 계정이 이미 존재합니다');
          }
          console.log('✅ MongoDB 기반 데이터베이스 초기화 완료');
        } catch (dbError: any) {
          console.error('⚠️  데이터베이스 초기화 중 오류:', dbError.message);
        }
      } else {
        console.log('⚠️  MongoDB가 연결되지 않았습니다.');
      }
    } catch (modelError: any) {
      console.error('⚠️  MongoDB 모델 사용 중 오류:', modelError.message);
    }
  } catch (error: any) {
    console.error('⚠️  MongoDB 초기화 실패:', error.message);
    console.error('💡 서버는 계속 실행됩니다.');
  }
}, 100); // 서버 시작 후 100ms 후에 MongoDB 연결 시도

// Health check - 상세한 상태 정보 제공
app.get('/api/health', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const { getConnectionStatus } = await import('./db/mongodb');
    const dbStatus = getConnectionStatus();

    const connectionState = mongoose.default.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const dbInfo: any = {
      status: dbStatus ? 'connected' : 'disconnected',
      state: connectionStates[connectionState as keyof typeof connectionStates] || 'unknown',
      readyState: connectionState,
    };

    if (dbStatus && mongoose.default.connection.db) {
      dbInfo.database = mongoose.default.connection.db.databaseName;
      dbInfo.host = mongoose.default.connection.host;
      dbInfo.port = mongoose.default.connection.port;
    }

    res.json({
      status: 'OK',
      message: 'ERP System API is running',
      server: {
        port: PORT,
        uptime: process.uptime(),
      },
      database: dbInfo,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // 서버는 실행 중이지만 DB 연결이 안 된 경우
    res.json({
      status: 'OK',
      message: 'ERP System API is running (DB disconnected)',
      server: {
        port: PORT,
        uptime: process.uptime(),
      },
      database: {
        status: 'disconnected',
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// MongoDB 연결 상태 확인 전용 엔드포인트
app.get('/api/health/db', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const { getConnectionStatus } = await import('./db/mongodb');

    const connectionState = mongoose.default.connection.readyState;
    const connectionStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const isConnected = getConnectionStatus();
    const state = connectionStates[connectionState as keyof typeof connectionStates] || 'unknown';

    const response: any = {
      connected: isConnected,
      state: state,
      readyState: connectionState,
      message: isConnected ? 'MongoDB에 연결되어 있습니다.' : 'MongoDB에 연결되어 있지 않습니다.',
    };

    if (isConnected && mongoose.default.connection.db) {
      response.details = {
        database: mongoose.default.connection.db.databaseName,
        host: mongoose.default.connection.host,
        port: mongoose.default.connection.port,
      };
    } else {
      response.details = {
        message: 'MongoDB 연결 정보를 확인할 수 없습니다.',
        suggestion: 'MongoDB가 실행 중인지 확인하거나 backend/.env 파일의 MONGODB_URI를 확인하세요.',
      };
    }

    res.status(isConnected ? 200 : 503).json(response);
  } catch (error: any) {
    res.status(503).json({
      connected: false,
      state: 'error',
      message: 'MongoDB 연결 상태를 확인할 수 없습니다.',
      error: error.message,
    });
  }
});

// 에러 핸들링 미들웨어
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('에러 발생:', err);
  res.status(err.status || 500).json({
    message: err.message || '서버 오류가 발생했습니다.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM 신호 수신, 서버 종료 중...');
  const { disconnectDB } = await import('./db/mongodb');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT 신호 수신, 서버 종료 중...');
  const { disconnectDB } = await import('./db/mongodb');
  await disconnectDB();
  process.exit(0);
});

// 서버 시작 (에러 핸들링 추가)
// Vercel Serverless 환경을 위한 export
export default app;

// 로컬 환경이나 독립형 서버로 실행될 때만 listen 수행
// Vercel은 export된 app을 가져와서 처리하므로 listen이 필요 없음
if (!process.env.VERCEL) {
  console.log(`🚀 서버 시작 시도 중... (포트: ${PORT})`);
  const server = app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(`✅ 백엔드 서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    console.log(`   API Base URL: http://localhost:${PORT}/api`);
    console.log('═══════════════════════════════════════\n');
  });

  // 서버 에러 핸들링
  server.on('error', (error: any) => {
    if ((error as any).code === 'EADDRINUSE') {
      console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다.`);
      console.error('💡 다른 포트를 사용하거나 실행 중인 프로세스를 종료하세요.');
    } else {
      console.error('❌ 서버 시작 중 오류 발생:', error);
    }
    process.exit(1);
  });
}

// 프로세스 에러 핸들링 (서버 크래시 방지)
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  console.error('스택:', error.stack);
  // 서버는 계속 실행 (중요한 오류가 아닐 수 있음)
  // 하지만 치명적인 오류인 경우를 대비해 로깅
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  // 서버는 계속 실행
  // MongoDB 연결 실패 등은 여기서 처리됨
});

