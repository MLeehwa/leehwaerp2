/**
 * 서버 및 데이터베이스 상태 확인 스크립트
 */
const http = require('http');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5500';

function checkStatus() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('요청 타임아웃'));
    });
  });
}

function checkDBStatus() {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BACKEND_URL}/api/health/db`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: json });
        } catch (error) {
          reject(new Error('응답 파싱 실패'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('요청 타임아웃'));
    });
  });
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('   ERP 시스템 상태 확인');
  console.log('═══════════════════════════════════════\n');

  // 서버 상태 확인
  try {
    console.log('🔍 서버 상태 확인 중...');
    const serverStatus = await checkStatus();
    
    if (serverStatus.statusCode === 200) {
      console.log('✅ 서버: 실행 중');
      console.log(`   포트: ${serverStatus.data.server?.port || 'N/A'}`);
      console.log(`   업타임: ${Math.floor(serverStatus.data.server?.uptime || 0)}초`);
      
      // 데이터베이스 상태
      const db = serverStatus.data.database;
      if (db.status === 'connected') {
        console.log('\n✅ 데이터베이스: 연결됨');
        console.log(`   상태: ${db.state}`);
        if (db.database) {
          console.log(`   데이터베이스: ${db.database}`);
          console.log(`   호스트: ${db.host}:${db.port}`);
        }
      } else {
        console.log('\n⚠️  데이터베이스: 연결 안 됨');
        console.log(`   상태: ${db.state || 'disconnected'}`);
        console.log(`   ReadyState: ${db.readyState || 'N/A'}`);
      }
    } else {
      console.log('❌ 서버: 응답 오류');
    }
  } catch (error) {
    console.log('❌ 서버: 연결 실패');
    console.log(`   오류: ${error.message}`);
    console.log(`   백엔드 서버가 실행 중인지 확인하세요: ${BACKEND_URL}`);
    process.exit(1);
  }

  // 상세 DB 상태 확인
  try {
    console.log('\n🔍 데이터베이스 상세 상태 확인 중...');
    const dbStatus = await checkDBStatus();
    
    if (dbStatus.data.connected) {
      console.log('✅ MongoDB 연결: 정상');
      if (dbStatus.data.details) {
        console.log(`   데이터베이스: ${dbStatus.data.details.database}`);
        console.log(`   호스트: ${dbStatus.data.details.host}:${dbStatus.data.details.port}`);
      }
    } else {
      console.log('❌ MongoDB 연결: 실패');
      console.log(`   상태: ${dbStatus.data.state}`);
      if (dbStatus.data.details?.suggestion) {
        console.log(`   💡 ${dbStatus.data.details.suggestion}`);
      }
    }
  } catch (error) {
    console.log('⚠️  데이터베이스 상태 확인 실패');
    console.log(`   오류: ${error.message}`);
  }

  console.log('\n═══════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('오류 발생:', error);
  process.exit(1);
});

