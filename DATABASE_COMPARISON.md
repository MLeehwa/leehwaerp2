# 데이터베이스 선택 가이드: MongoDB vs NAS 직접 저장

## 🤔 질문: MongoDB를 꼭 써야 하나요?

**답변: 아니요! 꼭 MongoDB를 쓸 필요는 없습니다.**

현재 시스템은 **메모리 기반 DB**를 사용하고 있으며, NAS에 직접 데이터를 저장하는 방식도 가능합니다.

---

## 💰 MongoDB 가격

### ✅ MongoDB는 무료입니다!

- **MongoDB Community Edition**: 완전 무료 (오픈소스)
- **MongoDB Atlas** (클라우드): 무료 티어 제공 (512MB)
- **로컬 설치**: 완전 무료, 제한 없음

**NAS에 Docker로 설치하면 완전 무료입니다!**

---

## 📊 데이터 저장 방식 비교

### 현재 방식: 메모리 DB (MemoryDB)
```
애플리케이션 → 메모리 (RAM) → 서버 재시작 시 데이터 손실
```

**장점:**
- ✅ 빠름 (메모리에서 직접 읽기)
- ✅ 설정 간단
- ✅ 추가 소프트웨어 불필요

**단점:**
- ❌ 서버 재시작 시 데이터 손실
- ❌ 영구 저장 안 됨
- ❌ 대용량 데이터 처리 어려움

---

### 옵션 1: MongoDB (Docker)
```
애플리케이션 → MongoDB (Docker) → NAS 디스크에 저장
```

**장점:**
- ✅ 영구 저장 (NAS 디스크에 저장됨)
- ✅ 구조화된 데이터 관리
- ✅ 쿼리 및 검색 기능
- ✅ 관계형 데이터 처리
- ✅ 백업 및 복원 용이
- ✅ 확장성 좋음

**단점:**
- ⚠️ Docker 설치 필요
- ⚠️ 초기 설정 필요
- ⚠️ 메모리 사용 (약 500MB~1GB)

**데이터 저장 위치:**
- NAS의 `/data/mongodb` 폴더에 저장
- **NAS 디스크에 직접 저장됩니다!**

---

### 옵션 2: JSON 파일 저장 (NAS 직접)
```
애플리케이션 → JSON 파일 → NAS 폴더에 직접 저장
```

**장점:**
- ✅ 매우 간단
- ✅ Docker 불필요
- ✅ NAS에 직접 저장
- ✅ 파일로 바로 확인 가능
- ✅ 백업 쉬움 (파일 복사)

**단점:**
- ⚠️ 대용량 데이터 처리 느림
- ⚠️ 동시 접근 제한
- ⚠️ 쿼리 기능 제한적
- ⚠️ 트랜잭션 처리 어려움

---

### 옵션 3: SQLite (파일 기반 DB)
```
애플리케이션 → SQLite 파일 → NAS 폴더에 직접 저장
```

**장점:**
- ✅ 단일 파일로 저장
- ✅ NAS에 직접 저장
- ✅ SQL 쿼리 지원
- ✅ Docker 불필요
- ✅ 가볍고 빠름

**단점:**
- ⚠️ 동시 쓰기 제한
- ⚠️ 대용량 데이터 처리 제한

---

## 🎯 추천: 사용 목적에 따라 선택

### MongoDB를 추천하는 경우:
- ✅ 여러 사용자가 동시에 사용
- ✅ 복잡한 쿼리 및 검색 필요
- ✅ 대용량 데이터 처리
- ✅ 향후 확장 계획
- ✅ 이미 MongoDB 모델이 정의되어 있음

### JSON 파일 저장을 추천하는 경우:
- ✅ 단일 사용자 또는 소규모 사용
- ✅ 간단한 데이터 구조
- ✅ Docker 설치 어려움
- ✅ 최대한 간단한 구조 원함

### SQLite를 추천하는 경우:
- ✅ 중간 규모 데이터
- ✅ SQL 쿼리 필요
- ✅ 단일 파일로 관리 원함
- ✅ Docker 없이 사용

---

## 💾 NAS에 직접 저장하는 방법

### 방법 1: JSON 파일 저장 (가장 간단)

**구현 예시:**
```typescript
// backend/src/db/jsonDB.ts
import fs from 'fs';
import path from 'path';

class JsonDB {
  private dataDir: string;

  constructor() {
    // NAS 경로 설정
    this.dataDir = process.env.DATA_DIR || './data';
    this.ensureDir(this.dataDir);
  }

  private ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 데이터 읽기
  read(collection: string): any[] {
    const filePath = path.join(this.dataDir, `${collection}.json`);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }

  // 데이터 쓰기
  write(collection: string, data: any[]) {
    const filePath = path.join(this.dataDir, `${collection}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  // 데이터 추가
  create(collection: string, item: any): any {
    const data = this.read(collection);
    const newItem = {
      ...item,
      _id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    data.push(newItem);
    this.write(collection, data);
    return newItem;
  }

  // 데이터 찾기
  find(collection: string, query: any = {}): any[] {
    const data = this.read(collection);
    if (Object.keys(query).length === 0) {
      return data;
    }
    return data.filter(item => {
      return Object.keys(query).every(key => {
        return item[key] === query[key];
      });
    });
  }

  // 데이터 업데이트
  update(collection: string, id: string, updates: any): any | null {
    const data = this.read(collection);
    const index = data.findIndex(item => item._id === id);
    if (index === -1) return null;

    data[index] = {
      ...data[index],
      ...updates,
      updatedAt: new Date(),
    };
    this.write(collection, data);
    return data[index];
  }

  // 데이터 삭제
  delete(collection: string, id: string): boolean {
    const data = this.read(collection);
    const filtered = data.filter(item => item._id !== id);
    if (filtered.length === data.length) return false;
    this.write(collection, filtered);
    return true;
  }
}

export const jsonDB = new JsonDB();
```

**NAS 경로 설정 (.env):**
```env
# NAS 공유 폴더 경로
DATA_DIR=/share/erp-data
# 또는
DATA_DIR=/mnt/HD/HD_a2/erp-data
```

**장점:**
- ✅ NAS에 직접 저장
- ✅ 파일로 바로 확인 가능
- ✅ 백업 쉬움
- ✅ Docker 불필요

---

### 방법 2: SQLite 사용

**설치:**
```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

**구현:**
```typescript
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || './data/erp.db';
const db = new Database(dbPath);

// 테이블 생성 등...
```

**NAS 경로:**
```env
DB_PATH=/share/erp-data/erp.db
```

---

## 🎯 현재 상황 분석

### 현재 시스템:
- ✅ MongoDB 모델이 이미 정의되어 있음
- ✅ 메모리 DB로 작동 중
- ✅ MongoDB로 전환 준비됨

### 선택지:

#### 옵션 A: MongoDB 사용 (권장)
- **이유**: 이미 모델이 정의되어 있고, 확장성 좋음
- **데이터 저장**: NAS 디스크에 저장됨 (`./data/mongodb` 폴더)
- **설정**: Docker Compose 실행만 하면 됨

#### 옵션 B: JSON 파일 저장
- **이유**: 가장 간단, Docker 불필요
- **데이터 저장**: NAS 폴더에 JSON 파일로 저장
- **설정**: 코드 수정 필요 (새로운 DB 클래스 구현)

#### 옵션 C: SQLite 사용
- **이유**: SQL 지원, 파일 기반
- **데이터 저장**: NAS에 단일 DB 파일로 저장
- **설정**: 코드 수정 필요

---

## 💡 추천

### 현재 상황에서는 MongoDB를 추천합니다:

1. **이미 준비되어 있음**
   - MongoDB 모델이 모두 정의되어 있음
   - 전환 작업이 가장 적음

2. **NAS에 직접 저장됨**
   - Docker 볼륨 마운트로 NAS 디스크에 저장
   - `./data/mongodb` 폴더가 NAS에 생성됨

3. **무료**
   - MongoDB Community Edition 완전 무료

4. **확장성**
   - 향후 사용자 증가 시 대응 가능

### 하지만 JSON 파일 저장도 좋은 선택입니다:

- Docker 설치가 어렵다면
- 최대한 간단한 구조를 원한다면
- 소규모 사용이라면

---

## 🔄 전환 방법

### MongoDB → JSON 파일로 전환하려면:

1. `backend/src/db/jsonDB.ts` 생성 (위 예시 코드)
2. `backend/src/server.ts`에서 `memoryDB` 대신 `jsonDB` 사용
3. `.env`에 `DATA_DIR` 설정

### JSON 파일 → MongoDB로 전환하려면:

1. Docker Compose 실행
2. `backend/src/server.ts`에서 MongoDB 연결
3. 기존 JSON 데이터를 MongoDB로 마이그레이션

---

## 📝 결론

**MongoDB를 써야 하는 이유:**
- ✅ 이미 모델이 정의되어 있음
- ✅ NAS 디스크에 저장됨 (Docker 볼륨)
- ✅ 무료
- ✅ 확장성 좋음

**하지만 꼭 쓸 필요는 없습니다:**
- JSON 파일 저장도 가능
- SQLite도 가능
- 사용 목적에 따라 선택

**NAS에 직접 저장:**
- MongoDB도 NAS에 저장됩니다! (Docker 볼륨)
- JSON 파일도 NAS에 저장됩니다!
- 둘 다 NAS 디스크를 사용합니다!

---

## 🎯 최종 추천

**현재 상황: MongoDB 사용 권장**
- 이미 준비되어 있음
- NAS에 저장됨 (Docker 볼륨)
- 무료
- 전환 작업 최소

**Docker 설치가 어렵다면: JSON 파일 저장**
- 간단하고 빠름
- NAS에 직접 저장
- 추가 소프트웨어 불필요

어떤 방식을 원하시나요? 원하시는 방식으로 구현해드리겠습니다!

