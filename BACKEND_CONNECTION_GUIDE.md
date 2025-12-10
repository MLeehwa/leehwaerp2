# 백엔드 연결 가이드 - 어디서 해야 하나요?

## 📍 어디서 해야 하나요?

**답변: 로컬 컴퓨터(Windows)에서 해야 합니다!**

- ❌ NAS에서 하지 않습니다
- ✅ 로컬 컴퓨터에서 합니다
- ✅ CMD 또는 PowerShell 사용

---

## 🖥️ 로컬 컴퓨터에서 진행

### 1단계: 프로젝트 폴더로 이동

#### CMD 또는 PowerShell 열기

**방법 A: CMD 열기**
1. Windows 키 + R
2. `cmd` 입력 후 Enter

**방법 B: PowerShell 열기**
1. Windows 키 + X
2. "Windows PowerShell" 또는 "터미널" 선택

#### 프로젝트 폴더로 이동
```cmd
cd C:\Users\LHA-M\erp-system\backend
```

---

### 2단계: .env 파일 생성

#### 방법 A: 메모장으로 생성 (가장 쉬움)

1. **파일 탐색기 열기**
   - `C:\Users\LHA-M\erp-system\backend` 폴더로 이동

2. **새 파일 생성**
   - 빈 공간에서 우클릭
   - "새로 만들기" → "텍스트 문서"
   - 파일 이름: `.env` (확장자까지 포함!)

3. **내용 입력**
   - 파일을 메모장으로 열기
   - 다음 내용 입력:

```env
PORT=5500
NODE_ENV=development

MONGODB_URI=mongodb://admin:erp2024!@192.168.1.138:27017/erp-system?authSource=admin

JWT_SECRET=your_jwt_secret_key_here
```

**⚠️ 중요:**
- `192.168.1.138`을 실제 NAS IP로 변경하세요!
- 파일 이름이 `.env`인지 확인 (`.env.txt`가 아님!)

4. **저장**
   - Ctrl + S로 저장

#### 방법 B: CMD에서 생성

```cmd
cd C:\Users\LHA-M\erp-system\backend

# .env 파일 생성
echo PORT=5500 > .env
echo NODE_ENV=development >> .env
echo MONGODB_URI=mongodb://admin:erp2024!@192.168.1.138:27017/erp-system?authSource=admin >> .env
echo JWT_SECRET=your_jwt_secret_key_here >> .env
```

**⚠️ NAS IP 변경:**
- `192.168.1.138`을 실제 NAS IP로 변경하세요!

---

### 3단계: 패키지 설치

**CMD 또는 PowerShell에서:**
```cmd
cd C:\Users\LHA-M\erp-system\backend
npm install
```

**시간이 걸릴 수 있습니다 (몇 분)**

---

### 4단계: 연결 테스트

```cmd
npm run check:db
```

**성공하면:**
```
✅ MongoDB 연결 성공!
   데이터베이스: erp-system
   호스트: 192.168.1.138
```

**실패하면:**
- NAS IP 주소 확인
- MongoDB 컨테이너가 실행 중인지 확인
- 방화벽 설정 확인

---

### 5단계: 서버 실행

```cmd
npx nodemon src/server.mongodb.ts
```

**또는 package.json 수정 후:**
```cmd
npm run dev
```

**성공하면:**
```
서버가 포트 5500에서 실행 중입니다.
Health check: http://localhost:5500/api/health
✅ MongoDB 기반 데이터베이스 초기화 완료
```

---

## 📁 파일 위치

### .env 파일 위치
```
C:\Users\LHA-M\erp-system\backend\.env
```

### 확인 방법
```cmd
cd C:\Users\LHA-M\erp-system\backend
dir .env
```

파일이 보이면 생성 완료!

---

## 🎯 전체 순서 요약

### 로컬 컴퓨터(Windows)에서:

1. **CMD 또는 PowerShell 열기**
   ```cmd
   Windows 키 + R → cmd 입력
   ```

2. **프로젝트 폴더로 이동**
   ```cmd
   cd C:\Users\LHA-M\erp-system\backend
   ```

3. **.env 파일 생성**
   - 메모장으로 `.env` 파일 생성
   - 내용 입력 (NAS IP 변경!)

4. **패키지 설치**
   ```cmd
   npm install
   ```

5. **연결 테스트**
   ```cmd
   npm run check:db
   ```

6. **서버 실행**
   ```cmd
   npx nodemon src/server.mongodb.ts
   ```

---

## ❓ 자주 묻는 질문

### Q1: NAS에서 해야 하나요?
**A:** 아니요! 로컬 컴퓨터(Windows)에서 해야 합니다.

### Q2: .env 파일을 어디에 만들나요?
**A:** `backend` 폴더 안에 만드세요:
```
C:\Users\LHA-M\erp-system\backend\.env
```

### Q3: NAS IP는 어떻게 알 수 있나요?
**A:**
- NAS 웹 인터페이스 접속 시 주소창에 표시됨
- 예: `http://192.168.1.138` → IP는 `192.168.1.138`

### Q4: 파일 이름이 .env.txt로 저장되요
**A:**
- Windows 탐색기에서 "파일 이름 확장자" 표시 활성화
- 또는 메모장에서 "다른 이름으로 저장" → 파일 형식: "모든 파일" → `.env` 입력

---

## 💡 간단 요약

**어디서?** → 로컬 컴퓨터(Windows) CMD/PowerShell

**무엇을?** → 
1. `.env` 파일 생성
2. `npm install`
3. `npm run check:db`
4. 서버 실행

**파일 위치?** → `C:\Users\LHA-M\erp-system\backend\.env`

---

## 🚀 빠른 실행

```cmd
# 1. CMD 열기 (Windows 키 + R → cmd)

# 2. 프로젝트 폴더로 이동
cd C:\Users\LHA-M\erp-system\backend

# 3. .env 파일 생성 (메모장 사용 권장)

# 4. 패키지 설치
npm install

# 5. 연결 테스트
npm run check:db

# 6. 서버 실행
npx nodemon src/server.mongodb.ts
```

이제 로컬 컴퓨터에서 진행하시면 됩니다!

