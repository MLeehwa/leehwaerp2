# 🔑 MongoDB 비밀번호 정보

## 현재 설정된 비밀번호

### MongoDB 관리자 계정
- **사용자명**: `admin`
- **비밀번호**: `erp2024!`

### MongoDB Express (웹 관리 도구)
- **웹 접속 URL**: `http://NAS_IP:8081`
- **웹 로그인 사용자명**: `admin`
- **웹 로그인 비밀번호**: `admin123`

---

## 📝 백엔드 .env 파일 설정

`backend/.env` 파일에 다음을 추가하세요:

```env
PORT=5500
NODE_ENV=development

# MongoDB 연결 (NAS IP로 변경하세요!)
MONGODB_URI=mongodb://admin:erp2024!@192.168.1.100:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

**⚠️ 중요:**
- `192.168.1.100`을 실제 NAS IP 주소로 변경하세요
- 비밀번호는 `erp2024!` 입니다

---

## 🔄 비밀번호 변경 방법

나중에 비밀번호를 변경하려면:

### 1. docker-compose.yml 파일 수정
```yaml
MONGO_INITDB_ROOT_PASSWORD: 새비밀번호
ME_CONFIG_MONGODB_ADMINPASSWORD: 새비밀번호
ME_CONFIG_MONGODB_URL: mongodb://admin:새비밀번호@mongodb:27017/
```

### 2. 컨테이너 재생성
```bash
docker-compose down -v
docker-compose up -d
```

### 3. backend/.env 파일도 변경
```env
MONGODB_URI=mongodb://admin:새비밀번호@NAS_IP:27017/erp-system?authSource=admin
```

---

## 💡 현재 비밀번호 요약

| 항목 | 값 |
|------|-----|
| MongoDB 사용자명 | `admin` |
| MongoDB 비밀번호 | `erp2024!` |
| MongoDB Express 웹 사용자명 | `admin` |
| MongoDB Express 웹 비밀번호 | `admin123` |

---

## ⚠️ 보안 권장사항

**현재 비밀번호는 임시입니다!**

프로덕션 환경에서는 반드시 강력한 비밀번호로 변경하세요:
- 최소 12자 이상
- 대소문자, 숫자, 특수문자 포함
- 예: `MyERP2024!Secure`

