# Docker GUI로 MongoDB 설치하기

## 🎯 Docker GUI 사용 방법 (SSH 불필요!)

SSH 접속이 안 되거나 어려울 때, Docker GUI를 사용하면 쉽게 설치할 수 있습니다!

---

## 📋 단계별 가이드

### 1단계: Docker 앱 열기

1. **UGREEN NAS 웹 인터페이스 접속**
   - `http://NAS_IP` 접속

2. **Docker 앱 실행**
   - 앱 목록에서 "Docker" 또는 "Container Station" 클릭

---

### 2단계: 프로젝트 생성

1. **왼쪽 메뉴에서 "프로젝트" 클릭**
   - 현재 화면이 프로젝트 생성 화면입니다!

2. **프로젝트 이름 입력**
   - "프로젝트 이름" 필드에: `erp-mongodb`
   - 또는 원하는 이름 입력

3. **저장 경로 선택**
   - "저장 경로" 옆의 폴더 아이콘 클릭
   - 프로젝트 폴더 선택 (예: `/share/erp-system`)
   - 또는 기본 경로 사용

---

### 3단계: docker-compose.yml 내용 입력

1. **"Compose 구성" 섹션에서**
   - "yaml 예시 입력" 탭이 선택되어 있는지 확인

2. **docker-compose.yml 파일 내용 복사**
   - 로컬 컴퓨터에서 `docker-compose.yml` 파일 열기
   - 전체 내용 복사 (Ctrl+A, Ctrl+C)

3. **텍스트 영역에 붙여넣기**
   - Docker GUI의 큰 텍스트 영역에 붙여넣기 (Ctrl+V)

**또는 "가져오기" 버튼 사용:**
- "가져오기" 버튼 클릭
- docker-compose.yml 파일 선택

---

### 4단계: 배포

1. **"생성 완료 후 즉시 실행" 체크 확인**
   - ✅ 체크되어 있어야 합니다

2. **"즉시 배포" 버튼 클릭**
   - 파란색 "즉시 배포" 버튼 클릭

3. **대기**
   - 컨테이너가 생성되고 시작될 때까지 대기
   - 몇 분 정도 소요될 수 있습니다

---

## ✅ 확인 방법

### Docker GUI에서 확인

1. **왼쪽 메뉴에서 "컨테이너" 클릭**
2. **컨테이너 목록 확인**
   - `erp-mongodb` 컨테이너가 "실행 중" 상태인지 확인
   - `erp-mongo-express` 컨테이너도 확인

### MongoDB Express 접속

브라우저에서:
```
http://NAS_IP:8081
```

로그인:
- Username: `admin`
- Password: `admin123`

---

## 📝 docker-compose.yml 내용

다음 내용을 Docker GUI에 붙여넣으세요:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: erp-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: erp2024!
      MONGO_INITDB_DATABASE: erp-system
    volumes:
      - ./data/mongodb:/data/db
    networks:
      - erp-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M

  mongo-express:
    image: mongo-express:latest
    container_name: erp-mongo-express
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: erp2024!
      ME_CONFIG_MONGODB_URL: mongodb://admin:erp2024!@mongodb:27017/
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - erp-network

networks:
  erp-network:
    driver: bridge

volumes:
  mongodb_data:
    driver: local
```

---

## 🎯 GUI 사용의 장점

- ✅ SSH 접속 불필요
- ✅ CMD/PowerShell 불필요
- ✅ GUI로 쉽게 관리
- ✅ 컨테이너 상태 시각적으로 확인
- ✅ 로그도 GUI에서 확인 가능

---

## 🔍 문제 해결

### 문제 1: "가져오기" 버튼이 작동하지 않을 때
**해결:** 직접 복사/붙여넣기 사용

### 문제 2: 컨테이너가 시작되지 않을 때
**해결:**
1. "컨테이너" 메뉴에서 컨테이너 선택
2. "로그" 확인하여 오류 메시지 확인

### 문제 3: 포트 충돌
**해결:**
- docker-compose.yml에서 포트 변경
- 예: `"27018:27017"` (외부 포트 변경)

---

## 📋 다음 단계

1. ✅ Docker GUI에서 프로젝트 생성 완료
2. ✅ 컨테이너 실행 확인
3. ✅ MongoDB Express 접속 확인
4. ✅ 백엔드 .env 파일 설정
5. ✅ 연결 테스트

---

## 💡 요약

**Docker GUI 사용:**
- ✅ SSH 불필요
- ✅ CMD 불필요
- ✅ 브라우저에서 모든 작업 가능
- ✅ 가장 쉬운 방법!

**현재 화면에서:**
1. 프로젝트 이름 입력
2. docker-compose.yml 내용 붙여넣기
3. "즉시 배포" 클릭
4. 완료! ✅

