# NAS Docker MongoDB 설정 가이드

이 가이드는 NAS에서 Docker를 사용하여 MongoDB를 설정하고 ERP 시스템에 연결하는 방법을 설명합니다.

## 📋 목차

1. [사전 준비사항](#사전-준비사항)
2. [Docker Compose 설정](#docker-compose-설정)
3. [NAS별 설정 방법](#nas별-설정-방법)
4. [백엔드 설정](#백엔드-설정)
5. [데이터 마이그레이션](#데이터-마이그레이션)
6. [문제 해결](#문제-해결)

---

## 사전 준비사항

### 필요한 것
- NAS (Synology, QNAP, 또는 Docker 지원 NAS)
- Docker 설치 (또는 Container Station)
- 최소 2GB 여유 메모리
- 최소 10GB 여유 디스크 공간

---

## Docker Compose 설정

### 1. docker-compose.yml 파일 수정

프로젝트 루트의 `docker-compose.yml` 파일을 열고 다음을 수정하세요:

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: your_secure_password_here  # ⚠️ 반드시 변경하세요!
```

**보안을 위해 강력한 비밀번호를 설정하세요!**

### 2. 볼륨 경로 설정

NAS의 실제 경로에 맞게 볼륨 경로를 수정하세요:

**Synology NAS 예시:**
```yaml
volumes:
  - /volume1/docker/erp-mongodb:/data/db
```

**QNAP NAS 예시:**
```yaml
volumes:
  - /share/Container/erp-mongodb:/data/db
```

**일반 Linux NAS:**
```yaml
volumes:
  - ./data/mongodb:/data/db
```

---

## NAS별 설정 방법

### Synology NAS (DSM)

#### 방법 1: Docker 패키지 사용

1. **Docker 설치**
   - 패키지 센터에서 "Docker" 검색 및 설치

2. **SSH 접속** (또는 터미널)
   - 제어판 > 터미널 및 SNMP > SSH 서비스 활성화
   - SSH 클라이언트로 접속

3. **프로젝트 폴더로 이동**
   ```bash
   cd /volume1/docker/erp-system  # 또는 프로젝트 위치
   ```

4. **Docker Compose 실행**
   ```bash
   docker-compose up -d
   ```

#### 방법 2: Docker Compose UI 사용

1. **Docker Compose UI 설치** (선택사항)
   - 패키지 센터에서 "Docker Compose" 검색

2. **docker-compose.yml 파일 업로드**
   - File Station에서 프로젝트 폴더에 업로드

3. **컨테이너 실행**
   - Docker 앱에서 "컨테이너" > "작성" > "docker-compose.yml" 선택

### QNAP NAS

1. **Container Station 설치**
   - App Center에서 "Container Station" 설치

2. **프로젝트 폴더 준비**
   - File Station에서 프로젝트 폴더 생성

3. **docker-compose.yml 업로드**
   - File Station을 통해 업로드

4. **컨테이너 실행**
   - Container Station > "작성" > "docker-compose.yml" 선택
   - 또는 SSH로 접속하여 `docker-compose up -d` 실행

### 일반 Linux NAS

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

---

## 백엔드 설정

### 1. MongoDB 패키지 설치

```bash
cd backend
npm install mongoose
npm install --save-dev @types/mongoose
```

### 2. 환경 변수 설정

`backend/.env` 파일 생성 (또는 루트의 `.env`):

```env
# Server Configuration
PORT=5500
NODE_ENV=development

# MongoDB Configuration
# 로컬에서 실행하는 경우 (NAS의 MongoDB에 연결)
MONGODB_URI=mongodb://admin:your_secure_password_here@NAS_IP:27017/erp-system?authSource=admin

# 예시:
# MONGODB_URI=mongodb://admin:MySecurePass123!@192.168.1.100:27017/erp-system?authSource=admin

# JWT Secret
JWT_SECRET=your_jwt_secret_key_here_change_in_production
```

**⚠️ 중요:**
- `NAS_IP`를 실제 NAS의 IP 주소로 변경하세요
- `your_secure_password_here`를 docker-compose.yml에서 설정한 비밀번호로 변경하세요

### 3. server.ts 수정

`backend/src/server.ts` 파일을 수정하여 MongoDB를 사용하도록 변경:

```typescript
// 기존 메모리 DB 대신 MongoDB 사용
import { connectDB } from './db/mongodb';

// 서버 시작 전 MongoDB 연결
(async () => {
  try {
    await connectDB();
    
    // 기본 관리자 계정 생성 (MongoDB 사용)
    const User = require('./models/User').default;
    const existingAdmin = await User.findOne({ email: 'admin@erp.com' });
    if (!existingAdmin) {
      const { hashPassword } = require('./utils/password');
      const hashedPassword = await hashPassword('admin123');
      await User.create({
        username: 'admin',
        email: 'admin@erp.com',
        password: hashedPassword,
        firstName: '관리자',
        lastName: '시스템',
        role: 'admin',
        isActive: true,
      });
      console.log('✅ 기본 관리자 계정 생성 완료');
    }
  } catch (error) {
    console.error('MongoDB 초기화 실패:', error);
    process.exit(1);
  }
})();
```

### 4. 연결 테스트

```bash
cd backend
npm run check:db
```

성공 메시지가 표시되면 연결이 정상입니다!

---

## 데이터 마이그레이션

### 기존 메모리 DB 데이터를 MongoDB로 마이그레이션

1. **마이그레이션 스크립트 실행** (추후 제공)
2. **또는 수동으로 데이터 입력**
   - Master Data 메뉴에서 데이터 입력
   - 또는 MongoDB Express를 통해 직접 입력

---

## 문제 해결

### 1. MongoDB 연결 실패

**증상:** `MongoDB 연결 실패` 오류

**해결 방법:**
```bash
# Docker 컨테이너 상태 확인
docker ps

# MongoDB 컨테이너 로그 확인
docker logs erp-mongodb

# 컨테이너 재시작
docker-compose restart mongodb
```

### 2. 포트 충돌

**증상:** `Port 27017 is already in use`

**해결 방법:**
- docker-compose.yml에서 포트 변경:
  ```yaml
  ports:
    - "27018:27017"  # 외부 포트 변경
  ```
- .env 파일의 MONGODB_URI도 포트 변경:
  ```env
  MONGODB_URI=mongodb://admin:password@NAS_IP:27018/erp-system?authSource=admin
  ```

### 3. 권한 오류

**증상:** `Authentication failed`

**해결 방법:**
- docker-compose.yml과 .env 파일의 비밀번호가 일치하는지 확인
- MongoDB 컨테이너 재생성:
  ```bash
  docker-compose down
  docker-compose up -d
  ```

### 4. 볼륨 마운트 오류

**증상:** `Permission denied` 또는 데이터가 저장되지 않음

**해결 방법:**
- NAS의 폴더 권한 확인
- Docker 사용자에게 읽기/쓰기 권한 부여

---

## MongoDB Express 접속

웹 브라우저에서 다음 주소로 접속:

```
http://NAS_IP:8081
```

**로그인 정보:**
- Username: `admin`
- Password: `admin123` (docker-compose.yml에서 설정한 값)

---

## 보안 권장사항

1. **강력한 비밀번호 사용**
   - MongoDB root 비밀번호
   - JWT Secret
   - MongoDB Express 비밀번호

2. **방화벽 설정**
   - 필요한 포트만 열기 (27017, 8081)
   - 외부 접근 제한 (VPN 사용 권장)

3. **정기 백업**
   ```bash
   # MongoDB 백업
   docker exec erp-mongodb mongodump --out /backup
   ```

---

## 다음 단계

1. ✅ Docker Compose 실행
2. ✅ MongoDB 연결 테스트
3. ✅ 백엔드 코드 수정 (메모리 DB → MongoDB)
4. ✅ 초기 데이터 입력
5. ✅ 애플리케이션 테스트

문제가 발생하면 이슈를 등록하거나 로그를 확인하세요!

