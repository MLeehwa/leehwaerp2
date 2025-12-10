# MongoDB Compass 설치 및 사용 가이드

## 1. MongoDB Compass 다운로드 및 설치

### 다운로드
1. 웹 브라우저에서 다음 주소 접속:
   ```
   https://www.mongodb.com/try/download/compass
   ```

2. 운영체제 선택:
   - Windows: `.msi` 파일 다운로드
   - Mac: `.dmg` 파일 다운로드
   - Linux: `.deb` 또는 `.rpm` 파일 다운로드

3. 설치:
   - Windows: 다운로드한 `.msi` 파일 실행
   - Mac: 다운로드한 `.dmg` 파일 열고 Compass를 Applications 폴더로 드래그
   - Linux: `sudo dpkg -i mongodb-compass_*.deb` (Ubuntu/Debian)

## 2. MongoDB Compass 연결

### 현재 시스템 (로컬 MongoDB)

1. **Compass 실행**

2. **연결 문자열 입력:**
   ```
   mongodb://localhost:27017/erp-system
   ```

3. **인증이 필요한 경우:**
   - `.env` 파일에서 `MONGODB_URI` 확인
   - 예시:
     ```
     mongodb://admin:비밀번호@localhost:27017/erp-system?authSource=admin
     ```

4. **Connect 버튼 클릭**

### NAS에 MongoDB가 있는 경우

1. **NAS의 MongoDB IP 주소 확인**
   - 예: `192.168.1.100`

2. **연결 문자열 입력:**
   ```
   mongodb://NAS_IP:27017/erp-system
   ```
   예: `mongodb://192.168.1.100:27017/erp-system`

3. **인증이 필요한 경우:**
   ```
   mongodb://사용자명:비밀번호@NAS_IP:27017/erp-system?authSource=admin
   ```

4. **네트워크 확인:**
   - NAS의 방화벽에서 27017 포트가 열려 있어야 함
   - 같은 네트워크에 연결되어 있어야 함

## 3. 데이터 확인 방법

### 컬렉션 선택
- 왼쪽 사이드바에서 데이터베이스(`erp-system`) 클릭
- 컬렉션 목록 확인:
  - `projectsourcefiles` - 프로젝트 소스 파일
  - `projects` - 프로젝트
  - `customers` - 고객
  - `companies` - 법인
  - `users` - 사용자
  - 등등...

### 데이터 조회
1. 컬렉션 클릭
2. 테이블 형태로 데이터 확인
3. 필터, 정렬, 검색 기능 사용

### 필터 사용 (SQL WHERE와 유사)
- 필터 입력란에 JSON 형식으로 입력:
  ```json
  {"category": "monthly_closing"}
  ```

### 정렬
- 컬럼 헤더 클릭하여 정렬

### 검색
- 상단 검색바에서 검색

## 4. 현재 시스템 설정 확인

### MongoDB 위치 확인
```bash
# backend 디렉토리에서
cd backend
cat .env | grep MONGODB_URI
```

또는 코드에서 기본값 확인:
- 기본값: `mongodb://localhost:27017/erp-system`
- 인증 포함: `mongodb://admin:비밀번호@localhost:27017/erp-system?authSource=admin`

### MongoDB 실행 확인
```bash
# Windows
net start MongoDB

# Mac/Linux
sudo systemctl status mongod
```

## 5. 문제 해결

### 연결 실패 시
1. **MongoDB가 실행 중인지 확인**
   ```bash
   # Windows
   net start MongoDB
   
   # Mac/Linux
   sudo systemctl start mongod
   ```

2. **포트 확인**
   - 기본 포트: 27017
   - 다른 포트 사용 시 연결 문자열에 포트 번호 포함

3. **방화벽 확인**
   - Windows 방화벽에서 27017 포트 허용
   - NAS 방화벽 설정 확인 (NAS 접속 시)

4. **인증 정보 확인**
   - `.env` 파일의 `MONGODB_URI` 확인
   - 사용자명과 비밀번호가 올바른지 확인

## 참고사항

- **현재 설정**: MongoDB는 로컬(localhost)에 있음
- **NAS 역할**: 파일 저장소로만 사용 (MongoDB가 NAS에 있는 것은 아님)
- **Compass 위치**: 사용자의 로컬 PC에 설치
- **접속 대상**: 로컬 MongoDB 또는 NAS의 MongoDB (설치된 경우)

