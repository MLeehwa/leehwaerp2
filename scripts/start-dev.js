/**
 * 통합 개발 서버 시작 스크립트
 * 백엔드와 프론트엔드를 한 번에 실행
 */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const BACKEND_PORT = process.env.BACKEND_PORT || 5500;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const MAX_WAIT_ATTEMPTS = 60; // 최대 60초 대기
const RETRY_DELAY = 1000; // 1초마다 체크

let backendProcess = null;
let frontendProcess = null;

// 프로세스 종료 처리
function cleanup() {
  console.log('\n🛑 서버 종료 중...');
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
  }
  if (frontendProcess) {
    frontendProcess.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// 백엔드 Health Check
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// 백엔드 시작
function startBackend() {
  console.log('🚀 백엔드 서버 시작 중...');
  const backendPath = path.join(__dirname, '..', 'backend');
  
  backendProcess = spawn('npm', ['run', 'dev'], {
    cwd: backendPath,
    stdio: 'inherit',
    shell: true,
  });

  backendProcess.on('error', (error) => {
    console.error('❌ 백엔드 시작 실패:', error.message);
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️  백엔드 프로세스가 종료되었습니다 (코드: ${code})`);
    }
  });

  return backendProcess;
}

// 프론트엔드 시작
function startFrontend() {
  console.log('🚀 프론트엔드 서버 시작 중...');
  const frontendPath = path.join(__dirname, '..', 'frontend');
  
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendPath,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      VITE_API_URL: BACKEND_URL,
    },
  });

  frontendProcess.on('error', (error) => {
    console.error('❌ 프론트엔드 시작 실패:', error.message);
  });

  frontendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️  프론트엔드 프로세스가 종료되었습니다 (코드: ${code})`);
    }
  });

  return frontendProcess;
}

// 백엔드 대기 (선택적)
async function waitForBackend(required = false) {
  if (!required) {
    console.log('⏳ 백엔드 서버 대기 중... (선택적)');
  } else {
    console.log('⏳ 백엔드 서버 대기 중... (필수)');
  }

  for (let i = 0; i < MAX_WAIT_ATTEMPTS; i++) {
    const isReady = await checkBackend();
    if (isReady) {
      console.log('✅ 백엔드 서버가 준비되었습니다!');
      return true;
    }
    
    if (i < MAX_WAIT_ATTEMPTS - 1) {
      process.stdout.write(`\r   시도 ${i + 1}/${MAX_WAIT_ATTEMPTS}...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }

  if (required) {
    console.error(`\n❌ 백엔드 서버를 기다릴 수 없습니다. (${MAX_WAIT_ATTEMPTS}번 시도 실패)`);
    return false;
  } else {
    console.log(`\n⚠️  백엔드 서버가 아직 준비되지 않았지만 프론트엔드를 시작합니다.`);
    return false;
  }
}

// 메인 실행
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('   ERP 시스템 개발 서버 시작');
  console.log('═══════════════════════════════════════\n');

  // 백엔드 시작
  startBackend();

  // 백엔드 대기 (선택적 - 실패해도 프론트엔드는 시작)
  const backendReady = await waitForBackend(false);

  if (backendReady) {
    console.log(`\n✅ 백엔드: ${BACKEND_URL}`);
  } else {
    console.log(`\n⚠️  백엔드: ${BACKEND_URL} (연결 실패 - 나중에 재시도 가능)`);
  }

  // 프론트엔드 시작 (백엔드 상태와 무관하게 시작)
  startFrontend();

  console.log(`\n✅ 프론트엔드: http://localhost:${FRONTEND_PORT}`);
  console.log('\n💡 서버를 종료하려면 Ctrl+C를 누르세요.\n');
}

main().catch((error) => {
  console.error('❌ 시작 중 오류 발생:', error);
  cleanup();
});

