

## 📁 폴더 종류 설명

### 1. 공유 폴더 (Share Folder) ✅ 권장
- **용도**: 네트워크를 통해 여러 사용자가 접근 가능
- **접근 방법**: SMB/CIFS 프로토콜 (Windows 탐색기에서 `\\NAS_IP\share` 형태)
- **Docker 사용**: ✅ 가능 (SSH로 실제 경로 접근)
- **예시 경로**: `/share/erp-mongodb`

### 2. 네트워크 폴더 (Network Folder)
- **용도**: 네트워크 드라이브로 매핑된 폴더
- **접근 방법**: Windows에서 네트워크 드라이브로 연결
- **Docker 사용**: ⚠️ 제한적 (경로 매핑 복잡)
- **예시**: `Z:\erp-mongodb` (Windows에서 매핑)

---

## ✅ Docker를 위한 올바른 방법

### 공유 폴더(Share Folder) 사용 권장

**이유:**
1. ✅ Docker는 NAS의 실제 파일 시스템 경로를 사용
2. ✅ SSH로 접속하여 직접 경로 지정 가능
3. ✅ 간단하고 명확함
4. ✅ 모든 NAS에서 동일하게 작동

---

## 📋 UGREEN NAS에서 폴더 만들기

### 방법 1: File Station 사용 (권장)

1. **UGREEN NAS 웹 인터페이스 접속**
   - `http://NAS_IP` 접속

2. **File Station 열기**
   - 앱 목록에서 "File Station" 실행

3. **공유 폴더 생성**
   - 왼쪽 메뉴에서 "공유 폴더" 또는 "Share Folder" 선택
   - "생성" 또는 "Create" 클릭
   - 폴더 이름: `erp-mongodb` (또는 원하는 이름)
   - 권한 설정: 읽기/쓰기 허용

4. **경로 확인**
   - 생성된 폴더의 실제 경로는 보통: `/share/erp-mongodb`
   - 또는: `/mnt/HD/HD_a2/erp-mongodb` (UGREEN NAS 모델에 따라 다름)

### 방법 2: SSH로 직접 생성

```bash
# SSH 접속
ssh admin@NAS_IP

# 공유 폴더 경로 확인
ls -la /share

# MongoDB 데이터 폴더 생성
mkdir -p /share/erp-mongodb

# 권한 설정
chmod 755 /share/erp-mongodb
```

---

## 🔧 docker-compose.yml 설정

### 옵션 1: 상대 경로 사용 (가장 간단) ✅ 권장

```yaml
volumes:
  - ./data/mongodb:/data/db
```

**장점:**
- ✅ 프로젝트 폴더 내에 자동 생성
- ✅ 경로 설정 불필요
- ✅ 가장 간단

**폴더 위치:**
- 프로젝트 폴더 내 `./data/mongodb`에 생성됨
- 예: `/share/erp-system/data/mongodb`

### 옵션 2: 절대 경로 사용 (공유 폴더 직접 지정)

```yaml
volumes:
  - /share/erp-mongodb:/data/db
```

**사전 준비:**
1. File Station에서 `erp-mongodb` 공유 폴더 생성
2. docker-compose.yml에서 위 경로 사용

**장점:**
- ✅ 데이터 폴더를 별도로 관리
- ✅ 여러 프로젝트에서 공유 가능

---

## 🎯 추천 설정

### 초보자용: 상대 경로 사용 ✅

```yaml
volumes:
  - ./data/mongodb:/data/db
```

**이유:**
- 가장 간단
- 추가 설정 불필요
- 프로젝트 폴더에 자동 생성

### 고급 사용자용: 절대 경로 사용

```yaml
volumes:
  - /share/erp-mongodb:/data/db
```

**이유:**
- 데이터 폴더를 별도 관리
- 여러 프로젝트에서 공유

---

## 📝 실제 설정 예시

### 현재 docker-compose.yml (기본값)

```yaml
volumes:
  # 옵션 1: 상대 경로 사용 (프로젝트 폴더 내) - 기본값 ✅
  - ./data/mongodb:/data/db
```

**이 설정을 사용하면:**
- 프로젝트 폴더에 `data/mongodb` 폴더가 자동 생성됨
- **별도로 폴더를 만들 필요 없음!** ✅

### 공유 폴더를 직접 사용하려면

1. **File Station에서 폴더 생성**
   - 이름: `erp-mongodb`

2. **docker-compose.yml 수정**
   ```yaml
   volumes:
     # 옵션 2: 절대 경로 사용
     - /share/erp-mongodb:/data/db
   ```

---

## ✅ 결론

### 질문: 네트워크 폴더 vs 공유 폴더?

**답변: 공유 폴더(Share Folder)를 사용하세요!**

### 하지만 더 간단한 방법:

**현재 docker-compose.yml 설정을 그대로 사용하면:**
- ✅ 별도 폴더 생성 불필요
- ✅ `./data/mongodb` 경로가 자동으로 생성됨
- ✅ 가장 간단함

### 공유 폴더를 직접 만들고 싶다면:

1. File Station에서 공유 폴더 생성
2. docker-compose.yml에서 절대 경로 사용

---

## 🚀 실행 방법

### 현재 설정 그대로 사용 (가장 간단)

```bash
# 폴더 생성 불필요! 자동으로 생성됨
docker-compose up -d
```

### 공유 폴더 직접 사용

```bash
# 1. File Station에서 erp-mongodb 폴더 생성
# 2. docker-compose.yml에서 경로 변경
# 3. 실행
docker-compose up -d
```

---

## 💡 요약

| 방법 | 폴더 생성 필요 | 복잡도 | 권장 |
|------|--------------|--------|------|
| 상대 경로 (`./data/mongodb`) | ❌ 불필요 | ⭐ 매우 간단 | ✅ 권장 |
| 절대 경로 (`/share/erp-mongodb`) | ✅ 필요 | ⭐⭐ 보통 | 선택사항 |

**현재 설정을 그대로 사용하면 폴더를 만들 필요가 없습니다!** ✅

