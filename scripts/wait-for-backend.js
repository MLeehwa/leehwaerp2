/**
 * 백엔드 서버가 준비될 때까지 대기하는 스크립트
 */
const http = require('http');

const MAX_ATTEMPTS = 30;
const RETRY_DELAY = 1000; // 1초
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5500';
const HEALTH_CHECK_PATH = '/api/health';

function checkBackend() {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${HEALTH_CHECK_PATH}`;
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Backend returned status ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(2000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function waitForBackend() {
  console.log(`⏳ 백엔드 서버 대기 중... (${BACKEND_URL})`);
  
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      await checkBackend();
      console.log('✅ 백엔드 서버가 준비되었습니다!');
      process.exit(0);
    } catch (error) {
      if (i < MAX_ATTEMPTS - 1) {
        process.stdout.write(`\r   시도 ${i + 1}/${MAX_ATTEMPTS}...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error(`\n❌ 백엔드 서버를 기다릴 수 없습니다. (${MAX_ATTEMPTS}번 시도 실패)`);
        console.error('   백엔드 서버가 실행 중인지 확인하세요.');
        process.exit(1);
      }
    }
  }
}

waitForBackend();

