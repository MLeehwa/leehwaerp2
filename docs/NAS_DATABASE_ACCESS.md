# NAS에서 데이터베이스 확인 방법

## 1. NAS 파일 시스템에서 파일 확인

### Windows에서 NAS 접근
1. 파일 탐색기 열기
2. 주소창에 NAS 경로 입력:
   ```
   \\NAS_IP\share_name
   ```
   또는
   ```
   \\NAS_HOSTNAME\share_name
   ```
3. 파일 저장 경로로 이동:
   ```
   \\NAS_IP\share_name\projects\{projectId}\{category}\{year}\{month}\
   ```

### Linux/Mac에서 NAS 접근
```bash
# NAS 마운트
sudo mount -t cifs //NAS_IP/share_name /mnt/nas -o username=user,password=pass

# 파일 확인
ls -la /mnt/nas/projects/
```

## 2. MongoDB 데이터 확인 (SQL처럼)

### ⚠️ 중요: 현재 시스템 설정
- **MongoDB 위치**: 로컬 컴퓨터 (`localhost:27017`)
- **NAS 역할**: 파일 저장소로만 사용 (MongoDB가 NAS에 있는 것은 아님)
- **Compass 설치 위치**: 사용자의 로컬 PC에 설치

### 방법 1: MongoDB Compass (GUI 도구) - 추천

1. **MongoDB Compass 다운로드 및 설치**
   - 다운로드: https://www.mongodb.com/try/download/compass
   - Windows/Mac/Linux 지원
   - 자세한 설치 방법: `docs/MONGODB_COMPASS_GUIDE.md` 참고

2. **연결 설정 (로컬 MongoDB)**
   - Connection String 입력:
     ```
     mongodb://localhost:27017/erp-system
     ```
   - 인증이 필요한 경우:
     ```
     mongodb://admin:비밀번호@localhost:27017/erp-system?authSource=admin
     ```

3. **NAS에 MongoDB가 있는 경우**
   - NAS의 IP 주소로 접속:
     ```
     mongodb://NAS_IP:27017/erp-system
     ```
   - 네트워크 방화벽에서 27017 포트 허용 필요

4. **데이터 확인**
   - 왼쪽에서 컬렉션 선택
   - SQL처럼 테이블 형태로 데이터 확인
   - 필터, 정렬, 검색 기능 사용 가능

### 방법 2: mongo shell (명령줄)

```bash
# MongoDB shell 접속
mongo mongodb://localhost:27017/erp-system

# 또는
mongo --host NAS_IP --port 27017 erp-system

# 컬렉션 조회
show collections

# 데이터 조회 (SQL SELECT와 유사)
db.projectsourcefiles.find()

# 필터링 (SQL WHERE와 유사)
db.projectsourcefiles.find({ "category": "monthly_closing" })

# 정렬 (SQL ORDER BY와 유사)
db.projectsourcefiles.find().sort({ "uploadedAt": -1 })

# 개수 확인 (SQL COUNT와 유사)
db.projectsourcefiles.count()

# 특정 문서 조회
db.projectsourcefiles.findOne({ "_id": ObjectId("...") })
```

### 방법 3: 웹 기반 MongoDB 관리 도구

#### mongo-express 설치 (Docker 사용 시)

```yaml
# docker-compose.yml에 추가
mongo-express:
  image: mongo-express
  ports:
    - "8081:8081"
  environment:
    ME_CONFIG_MONGODB_URL: mongodb://mongo:27017/
  depends_on:
    - mongo
```

접속: `http://localhost:8081`

## 3. 현재 시스템에서 저장 경로 확인

### 웹 인터페이스에서 확인
1. `http://localhost:3000/admin/database` 접속
2. `projectsourcefiles` 컬렉션 선택
3. 각 파일의 `filePath` 필드에서 NAS 저장 경로 확인

### API로 확인
```bash
# 저장소 정보 확인
GET http://localhost:5500/api/project-source-files

# 응답 예시:
{
  "filePath": "/nas/files/projects/123/monthly_closing/2024/01/file_1234567890_data.xlsx",
  "storageInfo": {
    "type": "nas",
    "path": "/nas/files",
    "exists": true
  }
}
```

## 4. 환경 변수 설정

`.env` 파일에 NAS 경로 설정:

```env
# 파일 저장 타입: 'mongodb' 또는 'nas'
FILE_STORAGE_TYPE=nas

# NAS 기본 경로
NAS_BASE_PATH=/nas/files

# 또는 Windows 경로
NAS_BASE_PATH=\\NAS_IP\share_name\files

# 로컬 업로드 경로 (NAS가 없을 때)
UPLOAD_BASE_PATH=./uploads
```

## 5. NAS 마운트 확인

### Linux/Mac
```bash
# 마운트 확인
mount | grep nas

# 마운트 해제
umount /mnt/nas
```

### Windows
- 네트워크 드라이브로 연결
- 파일 탐색기 → 네트워크 드라이브 연결

## 참고사항

- **MongoDB 데이터**: MongoDB Compass나 mongo shell 사용 필요
- **NAS 파일**: 파일 탐색기로 직접 접근 가능
- **현재 설정**: 기본적으로 MongoDB에 바이너리로 저장됨
- **NAS 저장 활성화**: `FILE_STORAGE_TYPE=nas` 환경 변수 설정 필요

