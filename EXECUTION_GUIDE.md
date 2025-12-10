# 🚀 실행 가이드 - 단계별 따라하기

## 📋 실행 순서

### 1단계: docker-compose.yml 파일 확인 (선택사항)

**파일:** `docker-compose.yml`

**현재 설정된 비밀번호:**
- MongoDB 비밀번호: `erp2024!` (임시 비밀번호)
- 이미 설정되어 있으므로 그대로 사용 가능합니다!

**나중에 비밀번호를 변경하려면:**
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: 새비밀번호  # 원하는 비밀번호로 변경
```

**3곳 모두 동일하게 변경:**
1. MongoDB 서비스 (12번째 줄)
2. MongoDB Express (50번째 줄)  
3. MongoDB Express URL (51번째 줄)

**참고:** 현재는 `erp2024!`로 설정되어 있으므로 그대로 사용해도 됩니다!

---

### 2단계: UGREEN NAS에 파일 업로드

#### 방법 A: File Station 사용 (권장)
1. UGREEN NAS 웹 인터페이스 접속 (`http://NAS_IP`)
2. File Station 열기
3. 프로젝트 폴더 생성 (예: `/share/erp-system`)
4. 다음 파일 업로드:
   - `docker-compose.yml` ✅ (이 파일만 있으면 됩니다!)

**참고:** `docker-compose.yml` 파일만 업로드하면 됩니다. Docker가 자동으로 필요한 폴더를 생성합니다.

#### 방법 B: SCP 사용 (고급)
Windows에서 PowerShell 또는 Git Bash 사용:
```bash
# docker-compose.yml 파일을 NAS로 복사
scp docker-compose.yml admin@NAS_IP:/share/erp-system/
```

**또는 Windows 탐색기에서:**
1. `\\NAS_IP\share` 접속
2. `erp-system` 폴더로 `docker-compose.yml` 파일 복사

---

### 3단계: Docker 설치 확인

#### 방법 A: NAS 웹 인터페이스에서 확인 (가장 쉬움) ✅ 권장

1. **브라우저에서 NAS 접속**
   ```
   http://NAS_IP
   ```
   예: `http://192.168.1.100`

2. **앱 센터 또는 App Center 열기**
   - 메인 화면에서 "앱 센터" 클릭

3. **Docker 확인**
   - 설치된 앱 목록에서 "Docker" 또는 "Container Station" 찾기
   - ✅ 있으면: 설치 완료! 다음 단계로 진행
   - ❌ 없으면: "Docker" 검색 후 "설치" 클릭

**장점:** SSH 접속 불필요, GUI로 쉽게 확인 가능!

---

#### 방법 B: SSH로 접속해서 확인 (고급)

**Windows에서 SSH 접속:**

1. **PowerShell 또는 CMD 열기**
   - Windows 키 + X → "Windows PowerShell" 또는 "터미널"
   - 또는 Windows 키 + R → `cmd` 입력

2. **SSH 접속**
   ```bash
   ssh admin@NAS_IP
   ```
   예: `ssh admin@192.168.1.100`
   
   **비밀번호 입력:** NAS 관리자 비밀번호

3. **Docker 확인**
   ```bash
   docker --version
   docker-compose --version
   ```

4. **Docker가 없으면 설치**
   ```bash
   opkg update
   opkg install docker docker-compose
   ```

**참고:** Windows 10/11에는 SSH가 기본 포함되어 있습니다. 없으면 PuTTY를 사용하세요.

---

### 4단계: MongoDB 실행

#### 프로젝트 폴더로 이동
```bash
cd /share/erp-system  # 또는 실제 경로
```

#### Docker Compose 실행
```bash
docker-compose up -d
```

#### 상태 확인
```bash
docker ps
```

다음과 같이 표시되어야 합니다:
```
CONTAINER ID   IMAGE              STATUS
xxx            mongo:7.0          Up X minutes
xxx            mongo-express      Up X minutes
```

---

### 5단계: 연결 테스트

#### MongoDB Express 접속
브라우저에서:
```
http://NAS_IP:8081
```

로그인:
- Username: `admin`
- Password: `admin123`

#### 또는 SSH에서 테스트
```bash
docker exec -it erp-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin
```

---

### 6단계: 백엔드 설정

#### 패키지 설치
```bash
cd backend
npm install
```

#### .env 파일 생성
`backend/.env` 파일 생성:

```env
PORT=5500
NODE_ENV=development

# NAS IP 주소로 변경!
MONGODB_URI=mongodb://admin:admin123@192.168.1.100:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

**⚠️ 중요:**
- `192.168.1.100`을 실제 NAS IP로 변경
- `admin123`을 docker-compose.yml에서 설정한 비밀번호로 변경

#### 연결 테스트
```bash
npm run check:db
```

성공 메시지가 나오면 연결 완료! ✅

---

### 7단계: 서버 실행

#### MongoDB 버전 서버 실행
```bash
# 옵션 1: 직접 실행
npx nodemon src/server.mongodb.ts

# 옵션 2: package.json 수정 후
npm run dev
```

**package.json 수정 (선택사항):**
```json
{
  "scripts": {
    "dev": "nodemon src/server.mongodb.ts",
    "dev:memory": "nodemon src/server.ts"
  }
}
```

---

## ✅ 확인 체크리스트

- [ ] docker-compose.yml에서 비밀번호 변경
- [ ] UGREEN NAS에 파일 업로드
- [ ] Docker 설치 확인
- [ ] Docker Compose 실행
- [ ] 컨테이너 상태 확인 (`docker ps`)
- [ ] MongoDB Express 접속 확인
- [ ] backend/.env 파일 생성
- [ ] 연결 테스트 (`npm run check:db`)
- [ ] 서버 실행

---

## 🔍 문제 해결

### 문제 1: Docker가 없을 때
```bash
opkg update
opkg install docker docker-compose
```

### 문제 2: 컨테이너가 시작되지 않을 때
```bash
# 로그 확인
docker-compose logs mongodb

# 재시작
docker-compose restart mongodb
```

### 문제 3: 연결 실패
```bash
# 컨테이너 상태 확인
docker ps

# MongoDB 연결 테스트
docker exec erp-mongodb mongosh --eval "db.runCommand('ping')"
```

### 문제 4: 포트 충돌
docker-compose.yml에서 포트 변경:
```yaml
ports:
  - "27018:27017"  # 외부 포트 변경
```

---

## 📚 참고 문서

- **상세 가이드**: `UGREEN_NAS_SETUP.md`
- **비밀번호 설정**: `MONGODB_PASSWORD_GUIDE.md`
- **데이터베이스 비교**: `DATABASE_COMPARISON.md`
- **로컬 vs 클라우드**: `LOCAL_VS_CLOUD_MONGODB.md`

---

## 🎯 빠른 실행 (한 번에)

```bash
# 1. SSH 접속
ssh admin@NAS_IP

# 2. 프로젝트 폴더로 이동
cd /share/erp-system

# 3. 비밀번호 변경 (vi 또는 nano로)
vi docker-compose.yml

# 4. 실행
docker-compose up -d

# 5. 확인
docker ps
```

---

## 💡 다음 단계

1. ✅ MongoDB 실행 확인
2. ✅ 백엔드 연결 테스트
3. ✅ 서버 실행
4. ✅ 프론트엔드 연결
5. ✅ 데이터 입력 테스트

문제가 발생하면 로그를 확인하세요:
```bash
docker-compose logs -f mongodb
```

