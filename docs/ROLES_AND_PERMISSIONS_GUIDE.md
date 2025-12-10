# 역할 및 권한 관리 가이드

## 개요

이 ERP 시스템은 **역할 기반 접근 제어(RBAC)** 방식을 사용합니다. 사용자에게 역할을 할당하고, 역할에 권한을 부여하여 시스템 접근을 제어합니다.

## 시스템 구조

```
사용자 (User)
  └─ 역할 (Role) - 여러 개 할당 가능
      └─ 권한 (Permission) - 여러 개 부여 가능
          └─ 리소스 (Resource) - 메뉴/페이지/API 연결
```

## 초기 설정

### 1. 기본 역할과 권한 초기화

처음 사용할 때 기본 역할과 권한을 생성합니다:

```bash
cd backend
npm run init:roles
```

이 명령은 다음을 생성합니다:
- **기본 권한**: 사용자 관리, 역할 관리, 구매 관리, 판매 관리 등
- **기본 역할**: 관리자, 매니저, 직원
- **기본 리소스**: 시스템 메뉴 구조

### 2. 기본 역할 설명

| 역할 | 설명 | 주요 권한 |
|------|------|----------|
| **관리자** | 시스템 전체 관리 | 모든 권한 |
| **매니저** | 일반 관리 권한 | 구매/판매 승인, 프로젝트 관리, 회계 조회 |
| **직원** | 기본 업무 권한 | 구매요청 생성, 프로젝트 조회, 마스터 데이터 조회 |

## 사용 방법

### 1. 권한 관리 (`/system-admin/permissions`)

권한은 시스템에서 수행할 수 있는 작업을 정의합니다.

#### 권한 생성
1. `/system-admin/permissions` 페이지로 이동
2. "권한 추가" 버튼 클릭
3. 다음 정보 입력:
   - **권한 코드**: 고유한 코드 (예: `purchase.request.approve`)
   - **권한 이름**: 표시될 이름 (예: `구매요청 승인`)
   - **카테고리**: 권한 그룹 (예: `Purchase`)
   - **설명**: 권한에 대한 설명 (선택)
   - **연결 리소스**: 이 권한이 적용될 메뉴/페이지 (선택)

#### 권한 구조 예시
```
Purchase (카테고리)
  ├─ purchase.request.read (구매요청 조회)
  ├─ purchase.request.create (구매요청 생성)
  ├─ purchase.request.update (구매요청 수정)
  └─ purchase.request.approve (구매요청 승인)
```

### 2. 역할 관리 (`/system-admin/roles`)

역할은 여러 권한을 묶어서 사용자에게 할당하는 단위입니다.

#### 역할 생성
1. `/system-admin/roles` 페이지로 이동
2. "역할 추가" 버튼 클릭
3. 다음 정보 입력:
   - **역할명**: 역할 이름 (예: `구매 담당자`)
   - **설명**: 역할에 대한 설명
   - **상위 역할**: 상위 역할 선택 시 해당 역할의 권한을 상속받음 (선택)
   - **부여할 권한**: 이 역할에 부여할 권한들을 선택
   - **시스템 역할**: 시스템 기본 역할인지 여부 (삭제 불가)

#### 역할 상속
- 상위 역할을 선택하면 해당 역할의 모든 권한을 자동으로 상속받습니다
- 예: "구매 매니저" 역할이 "구매 담당자" 역할을 상위로 선택하면, "구매 담당자"의 모든 권한을 가집니다

### 3. 사용자에게 역할 할당 (`/admin/users` 또는 `/system-admin/users`)

1. 사용자 관리 페이지로 이동
2. 사용자 추가 또는 수정
3. "역할 선택" 필드에서 하나 이상의 역할 선택
4. 저장

#### 참고
- 사용자는 여러 역할을 가질 수 있습니다
- 여러 역할의 권한이 합쳐져서 적용됩니다
- 기존 `role` 필드(admin, manager, employee)는 호환성을 위해 유지되지만, 새로운 역할 시스템에서는 `roles` 배열을 사용합니다

## 권한 체크

### 백엔드에서 권한 확인

```typescript
// 미들웨어에서 권한 확인
import { authenticate, authorize } from '../middleware/auth';

// 단일 역할 확인
router.get('/api/some-route', authenticate, authorize('admin'), handler);

// 여러 역할 중 하나 확인
router.get('/api/some-route', authenticate, authorize('admin', 'manager'), handler);
```

### 프론트엔드에서 권한 확인

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  
  // 사용자 역할 확인
  const isAdmin = user?.role === 'admin';
  const hasRole = user?.roles?.some(r => r.name === '구매 담당자');
  
  // 권한 기반 UI 표시
  if (isAdmin) {
    return <AdminPanel />;
  }
  
  return <UserPanel />;
};
```

## 권한 카테고리

시스템에는 다음과 같은 권한 카테고리가 있습니다:

- **User Management**: 사용자 관리
- **Role Management**: 역할 관리
- **Permission Management**: 권한 관리
- **Purchase**: 구매 관리
- **Sales**: 판매 관리
- **Accounting**: 회계 관리
- **Master Data**: 마스터 데이터 관리

## 리소스 관리

리소스는 시스템의 메뉴, 페이지, API 엔드포인트를 나타냅니다. 권한과 연결하여 특정 메뉴나 페이지에 대한 접근을 제어할 수 있습니다.

### 리소스 타입
- **menu**: 메뉴 항목
- **page**: 페이지/화면
- **api**: API 엔드포인트
- **action**: 특정 액션 (버튼 등)

## 모범 사례

### 1. 역할 설계
- 역할은 **직무** 또는 **부서** 기준으로 설계
- 예: "구매 담당자", "판매 매니저", "회계 담당자"

### 2. 권한 설계
- 권한은 **CRUD 작업** 기준으로 설계
- 예: `resource.read`, `resource.create`, `resource.update`, `resource.delete`
- 필요시 더 세분화: `resource.approve`, `resource.cancel`

### 3. 최소 권한 원칙
- 사용자에게 필요한 최소한의 권한만 부여
- 관리자 권한은 신중하게 할당

### 4. 정기적인 권한 검토
- 역할과 권한을 정기적으로 검토하고 업데이트
- 사용하지 않는 권한은 제거

## 문제 해결

### 역할이 표시되지 않을 때
1. MongoDB 연결 확인
2. `npm run init:roles` 실행하여 기본 데이터 생성
3. 브라우저 콘솔에서 에러 확인

### 권한이 적용되지 않을 때
1. 사용자에게 역할이 할당되었는지 확인
2. 역할에 권한이 부여되었는지 확인
3. 백엔드 미들웨어에서 권한 체크 로직 확인

### 권한 관리 페이지에 접근할 수 없을 때
- 관리자(`admin`) 권한이 필요합니다
- `/system-admin/roles` 및 `/system-admin/permissions`는 관리자만 접근 가능

## 추가 정보

- 역할 관리 페이지: `/system-admin/roles`
- 권한 관리 페이지: `/system-admin/permissions`
- 사용자 관리 페이지: `/admin/users` 또는 `/system-admin/users`

