# MongoDB 사용자명/비밀번호 설정 가이드

## 📝 설명

`MONGO_INITDB_ROOT_USERNAME`과 `MONGO_INITDB_ROOT_PASSWORD`는 MongoDB의 **최상위 관리자(root) 계정**을 생성하는 환경 변수입니다.

## 🔑 설정 방법

### 1. 사용자명 (MONGO_INITDB_ROOT_USERNAME)

**원하는 사용자명을 입력하면 됩니다.**

예시:
- `admin` (권장 - 간단하고 명확)
- `mongoadmin`
- `root`
- `erpadmin`

**현재 설정:** `admin` ✅ (그대로 사용해도 됩니다)

### 2. 비밀번호 (MONGO_INITDB_ROOT_PASSWORD)

**⚠️ 반드시 강력한 비밀번호로 변경해야 합니다!**

#### 좋은 비밀번호 예시:
- `MyERP2024!Secure`
- `ErpSystem#2024`
- `MongoDB@Pass123!`
- `Admin!2024Secure`

#### 나쁜 비밀번호 예시:
- `password` ❌
- `123456` ❌
- `admin` ❌
- `your_secure_password_here` ❌ (기본값)

## 📋 설정 예시

### 예시 1: 간단한 설정

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: MyERP2024!Secure
```

### 예시 2: 다른 사용자명 사용

```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: erpadmin
  MONGO_INITDB_ROOT_PASSWORD: ErpSystem#2024
```

## 🔄 docker-compose.yml 수정 방법

### 1. 파일 열기
`docker-compose.yml` 또는 `docker-compose.ugreen.yml` 파일을 엽니다.

### 2. 비밀번호 변경

**변경 전:**
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: your_secure_password_here  # ⚠️ 변경 필요
```

**변경 후 (예시):**
```yaml
environment:
  MONGO_INITDB_ROOT_USERNAME: admin
  MONGO_INITDB_ROOT_PASSWORD: MyERP2024!Secure  # ✅ 변경 완료
```

### 3. MongoDB Express도 동일하게 변경

**중요:** `mongo-express` 섹션의 비밀번호도 **동일하게** 변경해야 합니다!

```yaml
mongo-express:
  environment:
    ME_CONFIG_MONGODB_ADMINUSERNAME: admin
    ME_CONFIG_MONGODB_ADMINPASSWORD: MyERP2024!Secure  # ⚠️ 위와 동일하게!
    ME_CONFIG_MONGODB_URL: mongodb://admin:MyERP2024!Secure@mongodb:27017/
```

## 🔗 백엔드 .env 파일 설정

`backend/.env` 파일에서도 동일한 비밀번호를 사용해야 합니다:

```env
# 사용자명과 비밀번호를 docker-compose.yml과 동일하게 설정
MONGODB_URI=mongodb://admin:MyERP2024!Secure@localhost:27017/erp-system?authSource=admin
```

**형식:**
```
mongodb://[사용자명]:[비밀번호]@[호스트]:[포트]/[데이터베이스]?authSource=admin
```

## ✅ 완성된 예시

### docker-compose.yml
```yaml
services:
  mongodb:
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: MyERP2024!Secure  # ✅ 변경됨
      MONGO_INITDB_DATABASE: erp-system

  mongo-express:
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: MyERP2024!Secure  # ✅ 동일하게 변경됨
      ME_CONFIG_MONGODB_URL: mongodb://admin:MyERP2024!Secure@mongodb:27017/
```

### backend/.env
```env
MONGODB_URI=mongodb://admin:MyERP2024!Secure@localhost:27017/erp-system?authSource=admin
```

## 🚨 주의사항

1. **비밀번호는 반드시 변경하세요!**
   - 기본값 `your_secure_password_here`는 보안상 위험합니다.

2. **모든 곳에서 동일하게 사용**
   - docker-compose.yml
   - mongo-express 설정
   - backend/.env 파일
   - 모두 동일한 비밀번호 사용!

3. **특수문자 주의**
   - 비밀번호에 특수문자가 있으면 URL 인코딩이 필요할 수 있습니다.
   - 예: `@` → `%40`, `#` → `%23`

4. **첫 실행 시에만 적용**
   - 이미 컨테이너가 실행 중이면 비밀번호 변경이 적용되지 않습니다.
   - 컨테이너를 삭제하고 다시 생성해야 합니다:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

## 💡 추천 설정

### 개발 환경 (로컬 테스트용)
```yaml
MONGO_INITDB_ROOT_USERNAME: admin
MONGO_INITDB_ROOT_PASSWORD: admin123
```

### 프로덕션 환경 (실제 운영)
```yaml
MONGO_INITDB_ROOT_USERNAME: admin
MONGO_INITDB_ROOT_PASSWORD: [강력한 랜덤 비밀번호]
```

## 🔍 비밀번호 확인 방법

설정 후 연결 테스트:
```bash
cd backend
npm run check:db
```

성공하면 비밀번호가 올바르게 설정된 것입니다!

