import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:your_secure_password_here@localhost:27017/erp-system?authSource=admin';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected && mongoose.connection.readyState === 1) {
    console.log('MongoDB는 이미 연결되어 있습니다.');
    return;
  }

  try {
    const options: mongoose.ConnectOptions = {
      // MongoDB 7.0+ 호환성
      serverSelectionTimeoutMS: 2000, // 더 짧은 타임아웃
      socketTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    };

    await mongoose.connect(MONGODB_URI, options);

    isConnected = true;
    console.log('✅ MongoDB 연결 성공');
    console.log(`   데이터베이스: ${mongoose.connection.db?.databaseName}`);
    console.log(`   호스트: ${mongoose.connection.host}`);

    // 연결 이벤트 리스너
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB 연결 오류:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  MongoDB 연결이 끊어졌습니다.');
      isConnected = false;
      // 자동 재연결 시도 (5초 후)
      setTimeout(() => {
        if (!isConnected) {
          console.log('🔄 MongoDB 재연결 시도 중...');
          connectDB().catch(() => {
            console.log('❌ 재연결 실패. MongoDB가 실행 중인지 확인하세요.');
          });
        }
      }, 5000);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB 재연결 성공');
      isConnected = true;
    });

  } catch (error: any) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    console.error('💡 MongoDB 연결 정보를 확인하세요:');
    console.error(`   URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`);
    console.error('💡 MongoDB가 실행 중인지 확인: npm run check:db');
    console.error('⚠️  서버는 계속 실행되지만 데이터베이스 기능은 사용할 수 없습니다.');
    isConnected = false;
    // 연결 실패해도 서버는 계속 실행 (나중에 재연결 시도 가능)
    // 10초 후 재연결 시도
    setTimeout(() => {
      if (!isConnected) {
        console.log('🔄 MongoDB 재연결 시도 중...');
        connectDB().catch(() => {
          // 재연결 실패는 조용히 처리 (무한 재시도 방지)
        });
      }
    }, 10000);
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

