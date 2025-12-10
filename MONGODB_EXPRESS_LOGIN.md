# MongoDB Express 로그인 정보

## 🔑 로그인 정보 (NAS와 다릅니다!)

### MongoDB Express 접속 정보

**URL:**
```
http://NAS_IP:8081
```
예: `http://192.168.1.138:8081`

**로그인 정보:**
- **Username (사용자명)**: `admin`
- **Password (비밀번호)**: `admin123`

**⚠️ 중요:** 이것은 NAS 로그인 정보가 아닙니다!
- NAS 로그인: NAS 관리자 계정
- MongoDB Express 로그인: 별도의 웹 관리 도구 계정

---

## 📋 두 가지 다른 로그인

### 1. NAS 웹 인터페이스 로그인
- **URL**: `http://NAS_IP`
- **Username**: NAS 관리자 계정 (예: `admin`)
- **Password**: NAS 관리자 비밀번호

### 2. MongoDB Express 로그인
- **URL**: `http://NAS_IP:8081`
- **Username**: `admin` (docker-compose.yml에서 설정)
- **Password**: `admin123` (docker-compose.yml에서 설정)

**완전히 다른 계정입니다!**

---

## 🔍 접속이 안 될 때 확인사항

### 1. 포트 확인
- MongoDB Express는 **8081 포트**를 사용합니다
- URL에 포트 번호가 포함되어 있는지 확인:
  ```
  http://192.168.1.138:8081  ✅ 올바름
  http://192.168.1.138       ❌ 포트 없음
  ```

### 2. 컨테이너 상태 확인
Docker GUI에서:
- `erp-mongo-express` 컨테이너가 "실행 중"인지 확인
- 중지되어 있으면 시작 버튼 클릭

### 3. 방화벽 확인
- NAS 방화벽에서 8081 포트가 열려있는지 확인
- 또는 일시적으로 방화벽 비활성화 후 테스트

### 4. 네트워크 확인
- 같은 네트워크에 연결되어 있는지 확인
- NAS IP 주소가 올바른지 확인

---

## 🎯 정확한 접속 방법

### 단계별:

1. **브라우저 주소창에 입력**
   ```
   http://192.168.1.138:8081
   ```
   (192.168.1.138을 실제 NAS IP로 변경)

2. **로그인 화면이 나타나면**
   - Username: `admin`
   - Password: `admin123`
   - 입력 후 로그인

3. **MongoDB 데이터베이스 목록이 보이면 성공!** ✅

---

## 🔧 로그인 정보 변경 방법

나중에 MongoDB Express 비밀번호를 변경하려면:

### docker-compose.yml 수정:
```yaml
mongo-express:
  environment:
    ME_CONFIG_BASICAUTH_USERNAME: 새사용자명
    ME_CONFIG_BASICAUTH_PASSWORD: 새비밀번호
```

### 컨테이너 재시작:
Docker GUI에서:
1. `erp-mongo-express` 컨테이너 선택
2. 재시작 또는 프로젝트 재배포

---

## ❓ 자주 묻는 질문

### Q1: NAS 로그인 정보를 사용하나요?
**A:** 아니요! MongoDB Express는 별도의 로그인 정보를 사용합니다.
- Username: `admin`
- Password: `admin123`

### Q2: 접속이 안 되는데?
**A:** 다음을 확인하세요:
1. 포트 번호 포함: `:8081`
2. 컨테이너가 실행 중인지
3. 방화벽 설정

### Q3: 비밀번호를 잊었어요
**A:** docker-compose.yml 파일의 53번째 줄을 확인하세요:
```yaml
ME_CONFIG_BASICAUTH_PASSWORD: admin123
```

---

## 📝 요약

| 항목 | 정보 |
|------|------|
| **URL** | `http://NAS_IP:8081` |
| **Username** | `admin` |
| **Password** | `admin123` |
| **NAS 로그인과 관계** | ❌ 완전히 별개 |

**MongoDB Express는 독립적인 웹 관리 도구이므로 별도의 로그인 정보를 사용합니다!**

