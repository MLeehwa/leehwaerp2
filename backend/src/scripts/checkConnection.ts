import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:your_secure_password_here@localhost:27017/erp-system?authSource=admin';

async function checkConnection() {
  try {
    console.log('MongoDB 연결 테스트 중...');
    console.log(`연결 URI: ${MONGODB_URI.replace(/:[^:@]+@/, ':****@')}`); // 비밀번호 숨김
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ MongoDB 연결 성공!');
    console.log(`   데이터베이스: ${mongoose.connection.db?.databaseName}`);
    console.log(`   호스트: ${mongoose.connection.host}`);
    console.log(`   포트: ${mongoose.connection.port}`);
    
    // 컬렉션 목록 확인
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log(`\n컬렉션 목록 (${collections?.length || 0}개):`);
    collections?.forEach((col) => {
      console.log(`   - ${col.name}`);
    });

    await mongoose.disconnect();
    console.log('\n연결 테스트 완료');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    console.error('\n확인 사항:');
    console.error('1. Docker 컨테이너가 실행 중인지 확인: docker ps');
    console.error('2. MongoDB URI가 올바른지 확인: .env 파일의 MONGODB_URI');
    console.error('3. 방화벽 설정 확인');
    process.exit(1);
  }
}

checkConnection();
