# NAS 배포 가이드

## 개요
이 ERP 시스템을 NAS에 배포하여 내부 네트워크의 다른 사용자들이 접근할 수 있도록 설정하는 방법입니다.

## 사전 준비사항

1. **NAS 요구사항**
   - Node.js 설치 (v18 이상 권장)
   - MongoDB 설치 및 실행 (또는 MongoDB Atlas 사용)
   - 포트 접근 권한 (기본: 5500, 5173)

2. **네트워크 설정**
   - NAS의 내부 IP 주소 확인 (예: 192.168.1.100)
   - 방화벽에서 필요한 포트 열기

## 배포 단계

### 1. 프로젝트 파일을 NAS에 복사

```bash
# NAS에 프로젝트 폴더 전체를 복사
# 예: /volume1/erp-system 또는 /mnt/erp-system
```

### 2. 백엔드 설정

#### 2.1 환경 변수 설정
`backend/.env` 파일 생성:

```env
PORT=5500
NODE_ENV=production
JWT_SECRET=your-secret-key-here
MONGODB_URI=mongodb://localhost:27017/erp-system
# 또는 MongoDB Atlas 사용 시:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/erp-system
```

#### 2.2 백엔드 빌드 및 실행

```bash
cd backend
npm install
npm run build
npm start
```

또는 PM2를 사용하여 백그라운드 실행:

```bash
# PM2 설치
npm install -g pm2

# 백엔드 실행
cd backend
npm install
npm run build
pm2 start dist/server.js --name erp-backend
pm2 save
pm2 startup  # 시스템 재시작 시 자동 시작 설정
```

### 3. 프론트엔드 설정

#### 3.1 API 엔드포인트 설정
`frontend/src/utils/api.ts` 파일에서 백엔드 주소를 NAS IP로 변경:

```typescript
// 개발 환경
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.1.100:5500';

// 또는 환경 변수 사용 (.env 파일)
// VITE_API_URL=http://192.168.1.100:5500
```

#### 3.2 프론트엔드 빌드

```bash
cd frontend
npm install
npm run build
```

빌드된 파일은 `frontend/dist` 폴더에 생성됩니다.

### 4. 웹 서버 설정 (옵션 1: Nginx 사용)

Nginx를 사용하여 프론트엔드를 서빙하는 방법:

#### 4.1 Nginx 설정 파일 생성
`/etc/nginx/sites-available/erp-system`:

```nginx
server {
    listen 80;
    server_name 192.168.1.100;  # NAS IP 주소

    # 프론트엔드 정적 파일
    location / {
        root /volume1/erp-system/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 백엔드 API 프록시
    location /api {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4.2 Nginx 활성화

```bash
sudo ln -s /etc/nginx/sites-available/erp-system /etc/nginx/sites-enabled/
sudo nginx -t  # 설정 테스트
sudo systemctl reload nginx
```

### 5. 웹 서버 설정 (옵션 2: Node.js Express 사용)

프론트엔드를 서빙하는 간단한 Express 서버 생성:

`frontend/server.js`:

```javascript
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// 정적 파일 서빙
app.use(express.static(join(__dirname, 'dist')));

// 모든 경로를 index.html로 리다이렉트 (SPA 라우팅)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server running on http://0.0.0.0:${PORT}`);
});
```

실행:

```bash
cd frontend
node server.js
```

또는 PM2로 실행:

```bash
pm2 start frontend/server.js --name erp-frontend
pm2 save
```

### 6. 방화벽 설정

NAS의 방화벽에서 다음 포트를 열어야 합니다:

- **포트 5500**: 백엔드 API
- **포트 3000 또는 80**: 프론트엔드 (Nginx 사용 시 80)
- **포트 27017**: MongoDB (로컬 MongoDB 사용 시)

```bash
# 예: UFW 사용 시
sudo ufw allow 5500/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
```

### 7. 접근 방법

같은 네트워크의 다른 컴퓨터에서 브라우저로 접근:

- **Nginx 사용 시**: `http://192.168.1.100`
- **Express 서버 사용 시**: `http://192.168.1.100:3000`

## 자동 시작 설정

### systemd 서비스 생성 (Linux NAS)

`/etc/systemd/system/erp-backend.service`:

```ini
[Unit]
Description=ERP Backend Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/volume1/erp-system/backend
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

활성화:

```bash
sudo systemctl enable erp-backend
sudo systemctl start erp-backend
```

## 문제 해결

### 1. 연결이 안 될 때
- NAS의 IP 주소가 올바른지 확인
- 방화벽 설정 확인
- 백엔드 서버가 실행 중인지 확인: `curl http://localhost:5500/api/health`

### 2. CORS 오류
백엔드의 CORS 설정 확인 (`backend/src/server.ts`):

```typescript
app.use(cors({
  origin: ['http://192.168.1.100', 'http://192.168.1.100:3000'],
  credentials: true
}));
```

### 3. MongoDB 연결 오류
- MongoDB가 실행 중인지 확인
- `MONGODB_URI` 환경 변수가 올바른지 확인
- 방화벽에서 MongoDB 포트가 열려있는지 확인

## 보안 고려사항

1. **HTTPS 사용** (권장)
   - Let's Encrypt로 무료 SSL 인증서 발급
   - Nginx에서 HTTPS 설정

2. **방화벽 규칙**
   - 필요한 포트만 열기
   - 외부 접근 차단 (내부 네트워크만 허용)

3. **인증**
   - 기본 관리자 비밀번호 변경
   - JWT_SECRET 강력한 키로 변경

## 모니터링

PM2를 사용한 모니터링:

```bash
pm2 list          # 실행 중인 프로세스 확인
pm2 logs          # 로그 확인
pm2 monit         # 실시간 모니터링
```

## 업데이트 방법

1. 코드 업데이트 후:
```bash
cd backend
npm install
npm run build
pm2 restart erp-backend

cd ../frontend
npm install
npm run build
pm2 restart erp-frontend
```

## 참고사항

- NAS의 종류에 따라 설정 방법이 다를 수 있습니다 (Synology, QNAP, U-NAS 등)
- Docker를 사용하는 경우 `docker-compose.yml` 파일을 활용할 수 있습니다
- MongoDB Atlas를 사용하면 로컬 MongoDB 설치가 필요 없습니다

