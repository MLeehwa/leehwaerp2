# 🚀 빠른 시작 가이드 - NAS Docker MongoDB

## 1단계: Docker Compose 설정

### docker-compose.yml 파일 수정

```yaml
# 비밀번호 변경 (반드시!)
MONGO_INITDB_ROOT_PASSWORD: MySecurePassword123!  # ⚠️ 변경하세요
ME_CONFIG_MONGODB_ADMINPASSWORD: MySecurePassword123!  # ⚠️ 변경하세요
```

### NAS 경로 설정 (선택사항)

Synology NAS의 경우:
```yaml
volumes:
  - /volume1/docker/erp-mongodb:/data/db
```

## 2단계: Docker 컨테이너 실행

### SSH로 NAS 접속 후:

```bash
# 프로젝트 폴더로 이동
cd /path/to/erp-system

# Docker Compose 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mongodb
```

### 또는 Synology Docker GUI에서:

1. Docker 앱 열기
2. "컨테이너" > "작성"
3. "docker-compose.yml" 파일 선택
4. "실행" 클릭

## 3단계: 백엔드 설정

### 1. 패키지 설치

```bash
cd backend
npm install
```

### 2. 환경 변수 설정

`backend/.env` 파일 생성:

```env
PORT=5500
NODE_ENV=development

# NAS의 IP 주소로 변경하세요!
MONGODB_URI=mongodb://admin:MySecurePassword123!@192.168.1.100:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

**⚠️ 중요:**
- `192.168.1.100`을 실제 NAS IP로 변경
- `MySecurePassword123!`을 docker-compose.yml에서 설정한 비밀번호로 변경

### 3. 연결 테스트

```bash
npm run check:db
```

성공 메시지가 나오면 연결 완료! ✅

## 4단계: 서버 실행 (MongoDB 버전)

### 옵션 1: MongoDB 버전 서버 실행

```bash
# server.mongodb.ts를 사용하여 실행
npx nodemon src/server.mongodb.ts
```

### 옵션 2: package.json 수정

`backend/package.json`의 scripts 수정:

```json
{
  "scripts": {
    "dev": "nodemon src/server.mongodb.ts",
    "dev:memory": "nodemon src/server.ts",  // 메모리 DB 버전 (백업용)
    "start": "node dist/server.js"
  }
}
```

그 다음:
```bash
npm run dev
```

## 5단계: 확인

1. **MongoDB Express 접속**
   - 브라우저에서: `http://NAS_IP:8081`
   - 로그인: admin / admin123

2. **API Health Check**
   - 브라우저에서: `http://localhost:5500/api/health`
   - 응답: `{"status":"OK","database":"mongodb"}`

3. **프론트엔드 연결**
   - 프론트엔드는 그대로 실행하면 됩니다
   - 백엔드가 MongoDB에 연결되어 있으면 자동으로 작동합니다

## 문제 해결

### MongoDB 연결 실패

```bash
# 컨테이너 상태 확인
docker ps

# 컨테이너 재시작
docker-compose restart mongodb

# 로그 확인
docker-compose logs mongodb
```

### 포트 충돌

docker-compose.yml에서 포트 변경:
```yaml
ports:
  - "27018:27017"  # 외부 포트 변경
```

.env 파일도 포트 변경:
```env
MONGODB_URI=mongodb://admin:password@NAS_IP:27018/erp-system?authSource=admin
```

## 다음 단계

1. ✅ Docker 실행 확인
2. ✅ MongoDB 연결 확인
3. ✅ 백엔드 서버 실행
4. ✅ 프론트엔드 연결 테스트
5. ✅ 데이터 입력 및 테스트

자세한 내용은 `DOCKER_SETUP_GUIDE.md`를 참고하세요!

