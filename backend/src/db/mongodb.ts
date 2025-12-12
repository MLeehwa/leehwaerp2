import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:your_secure_password_here@localhost:27017/erp-system?authSource=admin';

// MongoDB 연결 상태 캐싱 (Serverless 환경 대응)
// 전역 변수로 연결 상태를 유지하여 Hot Reload/Lambda 재사용 시 연결 재사용
let isConnected = false;
let cachedClient: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<boolean> => {
  if (cachedClient && mongoose.connection.readyState === 1) {
    // console.log('✅ MongoDB 연결 재사용');
    return true;
  }

  if (cachedPromise) {
    // 이미 연결 시도 중이면 그 Promise를 반환 (동시 요청 처리)
    try {
      await cachedPromise;
      return true;
    } catch (e) {
      return false;
    }
  }

  try {
    const options: mongoose.ConnectOptions = {
      // Serverless 환경 최적화: Vercel Function은 개별적으로 실행되므로 PoolSize를 1로 제한해야 함
      // (10으로 설정하면 함수 50개 실행 시 연결 500개가 되어 금방 DB가 죽음)
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000, // 빨리 실패하고 재시도하도록 5초로 단축
      socketTimeoutMS: 45000,
      family: 4, // IPv4 강제 (일부 환경 연결 지연 방지)
    };

    console.log('🔄 MongoDB 새로운 연결 시도...');
    cachedPromise = mongoose.connect(MONGODB_URI, options);

    cachedClient = await cachedPromise;
    isConnected = true;

    console.log('✅ MongoDB 연결 성공');
    console.log(`   데이터베이스: ${mongoose.connection.db?.databaseName}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 연결 오류:', err);
      isConnected = false;
      cachedClient = null;
      cachedPromise = null;
    });

    return true;

  } catch (error: any) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    cachedPromise = null;
    cachedClient = null;
    isConnected = false;
    return false;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('MongoDB 연결 종료');
  } catch (error: any) {
    console.error('MongoDB 연결 종료 실패:', error.message);
  }
};

export const getConnectionStatus = (): boolean => {
  return isConnected && mongoose.connection.readyState === 1;
};

