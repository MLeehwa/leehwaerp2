# 🚀 UGREEN NAS 빠른 시작 가이드

## 3단계로 MongoDB 설치하기

### 1단계: Docker 설치 확인

#### 방법 A: 웹 인터페이스
1. UGREEN NAS 웹 인터페이스 접속 (`http://NAS_IP`)
2. "앱 센터" 또는 "App Center" 열기
3. "Docker" 또는 "Container Station" 검색 및 설치

#### 방법 B: SSH 접속
```bash
ssh admin@NAS_IP

# Docker 확인
docker --version

# 없으면 설치 (Entware 사용)
opkg update
opkg install docker docker-compose
```

### 2단계: 프로젝트 파일 준비

#### File Station 사용:
1. File Station에서 프로젝트 폴더 생성 (예: `/share/erp-system`)
2. 다음 파일들을 업로드:
   - `docker-compose.yml`
   - `install-ugreen.sh` (선택사항)

#### SSH 사용:
```bash
# 프로젝트 폴더로 이동
cd /share/erp-system

# 파일 확인
ls -la
```

### 3단계: 설치 실행

#### 옵션 A: 설치 스크립트 사용 (권장)
```bash
# 실행 권한 부여
chmod +x install-ugreen.sh

# 스크립트 실행
bash install-ugreen.sh
```

#### 옵션 B: 수동 실행
```bash
# docker-compose.yml에서 비밀번호 변경 후
docker-compose up -d

# 상태 확인
docker-compose ps
```

---

## 설치 확인

### 1. 컨테이너 상태 확인
```bash
docker ps
```

다음과 같이 표시되어야 합니다:
```
CONTAINER ID   IMAGE              STATUS
xxx            mongo:7.0          Up X minutes
xxx            mongo-express      Up X minutes
```

### 2. MongoDB Express 접속
브라우저에서:
```
http://NAS_IP:8081
```

로그인:
- Username: `admin`
- Password: `admin123`

### 3. 백엔드 연결 테스트
```bash
cd backend
npm install
npm run check:db
```

---

## 백엔드 설정

### .env 파일 생성

`backend/.env`:
```env
PORT=5500
NODE_ENV=development

# NAS IP 주소로 변경!
MONGODB_URI=mongodb://admin:비밀번호@192.168.1.100:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

---

## 문제 해결

### Docker가 없을 때
```bash
# Entware로 설치
opkg update
opkg install docker docker-compose
```

### 권한 오류
```bash
# 폴더 권한 설정
chmod 755 ./data/mongodb
```

### 포트 충돌
`docker-compose.yml`에서 포트 변경:
```yaml
ports:
  - "27018:27017"  # 외부 포트 변경
```

---

## 다음 단계

1. ✅ Docker 설치 확인
2. ✅ MongoDB 컨테이너 실행
3. ✅ 연결 테스트
4. ✅ 백엔드 .env 설정
5. ✅ 서버 실행

자세한 내용은 `UGREEN_NAS_SETUP.md`를 참고하세요!

