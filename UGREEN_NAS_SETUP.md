# UGREEN NAS MongoDB 설치 가이드

UGREEN NAS에서 Docker를 사용하여 MongoDB를 설치하는 방법입니다.

## 📋 사전 준비

1. **UGREEN NAS 접속**
   - 웹 브라우저에서 NAS IP 주소로 접속 (예: `http://192.168.1.100`)
   - 관리자 계정으로 로그인

2. **Docker 설치 확인**
   - UGREEN NAS는 일반적으로 Container Station 또는 Docker를 지원합니다
   - 앱 센터에서 "Docker" 또는 "Container Station" 검색

---

## 방법 1: Container Station 사용 (권장)

### 1단계: Container Station 설치

1. **앱 센터 열기**
   - UGREEN NAS 웹 인터페이스에서 "앱 센터" 또는 "App Center" 클릭

2. **Container Station 설치**
   - "Container Station" 또는 "Docker" 검색
   - 설치 버튼 클릭
   - 설치 완료 대기

### 2단계: Docker Compose 파일 준비

1. **프로젝트 폴더 생성**
   - File Station에서 폴더 생성 (예: `/share/erp-system`)
   - 또는 SSH로 접속하여 폴더 생성

2. **docker-compose.yml 업로드**
   - File Station을 통해 `docker-compose.yml` 파일 업로드
   - 또는 SSH로 직접 복사

### 3단계: Container Station에서 실행

#### 옵션 A: GUI 사용

1. **Container Station 열기**
   - 앱 목록에서 "Container Station" 실행

2. **Compose 프로젝트 생성**
   - 왼쪽 메뉴에서 "Compose" 선택
   - "작성" 또는 "Create" 클릭
   - 프로젝트 이름 입력: `erp-mongodb`
   - docker-compose.yml 파일 경로 지정
   - "생성" 클릭

3. **컨테이너 시작**
   - 생성된 프로젝트에서 "시작" 클릭

#### 옵션 B: SSH 사용 (터미널)

```bash
# SSH로 NAS 접속
ssh admin@NAS_IP

# 프로젝트 폴더로 이동
cd /share/erp-system

# docker-compose 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f mongodb
```

---

## 방법 2: Docker CLI 직접 사용

### 1단계: SSH 접속

```bash
ssh admin@NAS_IP
```

### 2단계: Docker 설치 확인

```bash
docker --version
docker-compose --version
```

설치되어 있지 않다면:

```bash
# UGREEN NAS는 일반적으로 Entware 또는 opkg 사용
opkg update
opkg install docker docker-compose
```

### 3단계: 프로젝트 폴더 준비

```bash
# 프로젝트 폴더 생성
mkdir -p /share/erp-system
cd /share/erp-system

# docker-compose.yml 파일 생성 또는 업로드
# (File Station을 통해 업로드하거나 vi/nano로 직접 작성)
```

### 4단계: Docker Compose 실행

```bash
# docker-compose.yml 파일이 있는 위치에서
docker-compose up -d

# 컨테이너 상태 확인
docker ps

# MongoDB 로그 확인
docker logs erp-mongodb
```

---

## 방법 3: Portainer 사용 (선택사항)

Portainer는 Docker를 웹에서 관리할 수 있는 도구입니다.

### 1단계: Portainer 설치

```bash
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

### 2단계: Portainer 접속

- 브라우저에서: `http://NAS_IP:9000`
- 초기 관리자 계정 생성

### 3단계: Stack 생성

1. Portainer에서 "Stacks" 메뉴 선택
2. "Add stack" 클릭
3. docker-compose.yml 내용 붙여넣기
4. "Deploy the stack" 클릭

---

## docker-compose.yml 설정 (UGREEN NAS 최적화)

UGREEN NAS에 맞게 수정된 docker-compose.yml:

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
      MONGO_INITDB_ROOT_PASSWORD: your_secure_password_here  # ⚠️ 변경 필수!
      MONGO_INITDB_DATABASE: erp-system
    volumes:
      # UGREEN NAS 경로 (실제 경로에 맞게 수정)
      - /share/erp-mongodb:/data/db
      # 또는
      - ./data/mongodb:/data/db
    networks:
      - erp-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    # 메모리 제한 (선택사항, NAS 성능에 따라 조정)
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
      ME_CONFIG_MONGODB_ADMINPASSWORD: your_secure_password_here  # ⚠️ 변경 필수!
      ME_CONFIG_MONGODB_URL: mongodb://admin:your_secure_password_here@mongodb:27017/
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
```

---

## UGREEN NAS 특별 고려사항

### 1. 볼륨 경로 확인

UGREEN NAS의 실제 경로를 확인:

```bash
# SSH 접속 후
df -h
# 또는
ls -la /share
```

일반적인 경로:
- `/share/Container/` - 컨테이너 데이터
- `/share/Public/` - 공용 폴더
- `/mnt/` - 마운트된 디스크

### 2. 권한 설정

```bash
# MongoDB 데이터 폴더 권한 설정
mkdir -p /share/erp-mongodb
chmod 755 /share/erp-mongodb
chown -R 999:999 /share/erp-mongodb  # MongoDB 사용자 ID
```

### 3. 방화벽 설정

UGREEN NAS 웹 인터페이스에서:
- 포트 27017 (MongoDB) 열기
- 포트 8081 (Mongo Express) 열기 (선택사항)

### 4. 자동 시작 설정

Container Station에서:
- 컨테이너 설정 > "자동 시작" 활성화

또는 docker-compose.yml에:
```yaml
restart: unless-stopped  # 이미 포함됨
```

---

## 설치 확인

### 1. 컨테이너 상태 확인

```bash
docker ps
```

다음과 같이 표시되어야 합니다:
```
CONTAINER ID   IMAGE              STATUS         PORTS
xxx            mongo:7.0          Up 2 minutes   0.0.0.0:27017->27017/tcp
xxx            mongo-express      Up 2 minutes   0.0.0.0:8081->8081/tcp
```

### 2. MongoDB 연결 테스트

```bash
# MongoDB 컨테이너에 접속
docker exec -it erp-mongodb mongosh -u admin -p your_secure_password_here --authenticationDatabase admin

# 데이터베이스 목록 확인
show dbs

# 종료
exit
```

### 3. MongoDB Express 접속

브라우저에서:
```
http://NAS_IP:8081
```

로그인:
- Username: `admin`
- Password: `admin123`

---

## 백엔드 연결 설정

### 1. .env 파일 설정

`backend/.env` 파일:

```env
PORT=5500
NODE_ENV=development

# UGREEN NAS의 IP 주소로 변경!
MONGODB_URI=mongodb://admin:your_secure_password_here@192.168.1.100:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

### 2. 연결 테스트

```bash
cd backend
npm install
npm run check:db
```

---

## 문제 해결

### 문제 1: Docker가 설치되지 않음

**해결:**
```bash
# Entware 패키지 매니저 사용
opkg update
opkg install docker docker-compose

# 또는 UGREEN 공식 지원 확인
# 일부 모델은 Docker를 직접 지원하지 않을 수 있음
```

### 문제 2: 권한 오류

**해결:**
```bash
# Docker 그룹에 사용자 추가
sudo usermod -aG docker $USER

# 또는 root로 실행
sudo docker-compose up -d
```

### 문제 3: 포트 충돌

**해결:**
```yaml
# docker-compose.yml에서 포트 변경
ports:
  - "27018:27017"  # 외부 포트 변경
```

### 문제 4: 볼륨 마운트 실패

**해결:**
```bash
# 폴더 생성 및 권한 설정
mkdir -p /share/erp-mongodb
chmod 777 /share/erp-mongodb  # 임시로 모든 권한 부여
```

### 문제 5: 메모리 부족

**해결:**
```yaml
# docker-compose.yml에 메모리 제한 추가
deploy:
  resources:
    limits:
      memory: 1G  # 더 낮은 값으로 설정
```

---

## 유용한 명령어

```bash
# 컨테이너 중지
docker-compose stop

# 컨테이너 시작
docker-compose start

# 컨테이너 재시작
docker-compose restart

# 컨테이너 삭제 (데이터는 유지)
docker-compose down

# 컨테이너 및 볼륨 삭제 (데이터 삭제!)
docker-compose down -v

# 로그 실시간 확인
docker-compose logs -f mongodb

# MongoDB 백업
docker exec erp-mongodb mongodump --out /backup --username admin --password your_password --authenticationDatabase admin

# MongoDB 복원
docker exec erp-mongodb mongorestore /backup --username admin --password your_password --authenticationDatabase admin
```

---

## 다음 단계

1. ✅ Docker 설치 확인
2. ✅ docker-compose.yml 파일 준비
3. ✅ 컨테이너 실행
4. ✅ 연결 테스트
5. ✅ 백엔드 .env 설정
6. ✅ 애플리케이션 테스트

자세한 내용은 `DOCKER_SETUP_GUIDE.md`를 참고하세요!

