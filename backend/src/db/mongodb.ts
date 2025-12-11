import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:your_secure_password_here@localhost:27017/erp-system?authSource=admin';

// MongoDB 연결 상태 캐싱 (Serverless 환경 대응)
// 전역 변수로 연결 상태를 유지하여 Hot Reload/Lambda 재사용 시 연결 재사용
let cachedClient: typeof mongoose | null = null;
let cachedPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async (): Promise<boolean> => {
  if (cachedClient && mongoose.connection.readyState === 1) {
    // console.log('✅ MongoDB 연결 재사용');
    return true;
  }

  if (cachedPromise) {
    // 이미 연결 시도 중이면 그 Promise를 반환 (동시 요청 처리)
    await cachedPromise;
    return true;
  }

  try {
    const options: mongoose.ConnectOptions = {
      // MongoDB 7.0+ 호환성
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      bufferCommands: false, // 연결되지 않았을 때 버퍼링하지 않고 즉시 에러 발생 (Serverless에서 중요)
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

