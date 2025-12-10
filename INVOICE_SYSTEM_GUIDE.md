# 프로젝트별 인보이스 자동 생성 시스템 가이드

## 📋 개요

이 시스템은 **프로젝트별로 다른 청구 방식**을 지원하는 ERP 인보이스 자동 생성 시스템입니다.

### 핵심 개념

- **Invoice는 프로젝트 단위로 생성**
- **Invoice Line Items는 Project Billing Rule 기반으로 자동 구성**
- 프로젝트마다 완전히 다른 계산 방식 지원

---

## 🏗️ 시스템 구조

### 데이터 모델

```
Project (프로젝트)
  ├── ProjectBillingRule (청구 규칙)
  ├── Delivery (출하 실적)
  ├── LaborLog (노무 실적)
  └── Invoice (인보이스)
      └── InvoiceItem (인보이스 라인 항목)
```

### 주요 엔티티

1. **Project**: 프로젝트 정보 (VW-CKD, VW-TM, KMX, BSA, MOBIS 등)
2. **ProjectBillingRule**: 프로젝트별 청구 규칙
3. **Delivery**: 출하 실적 데이터
4. **LaborLog**: 노무 실적 데이터
5. **Invoice**: 인보이스 헤더
6. **InvoiceItem**: 인보이스 라인 항목

---

## 🎯 프로젝트별 청구 방식 예시

| 프로젝트   | 청구 기준                   | Rule Type | Unit Basis | Grouping Key |
| ------ | ----------------------- | --------- | ---------- | ------------ |
| VW CKD | EA 단가 × 출하수량            | EA        | EA         | part_no      |
| VW TM  | 팔레트 단가 × 팔레트 수량         | PALLET    | Pallet     | pallet_no    |
| KMX    | 생산 투입/노무 기준             | LABOR     | Hour       | work_type    |
| BSA    | 고정 월비(Flat Monthly Fee) | FIXED     | Month      | none         |
| MOBIS  | Mixed (노무+팔레트+기타)       | MIXED     | Mixed      | mixed        |

---

## 📝 API 사용 가이드

### 1. 프로젝트 생성

```bash
POST /api/projects
Content-Type: application/json

{
  "projectCode": "VW-CKD",
  "projectName": "Volkswagen CKD Project",
  "customer": "customer_id_here",
  "startDate": "2024-01-01",
  "status": "active",
  "poNumber": "PO-2024-001",
  "currency": "USD"
}
```

### 2. Billing Rule 생성

#### 예시 1: VW CKD (EA 기준)

```bash
POST /api/project-billing-rules
Content-Type: application/json

{
  "project": "project_id_here",
  "ruleName": "VW CKD - Part Billing",
  "ruleType": "EA",
  "unitBasis": "EA",
  "priceSource": "price_list",
  "groupingKey": "part_no",
  "description": "부품별 EA 단가 청구",
  "config": {
    "unitPrice": 0.14,
    "groupBy": ["partNo"]
  },
  "priority": 1,
  "isActive": true
}
```

#### 예시 2: VW TM (팔레트 기준)

```bash
POST /api/project-billing-rules
Content-Type: application/json

{
  "project": "project_id_here",
  "ruleName": "VW TM - Pallet Billing",
  "ruleType": "PALLET",
  "unitBasis": "Pallet",
  "priceSource": "pallet_rate",
  "groupingKey": "pallet_no",
  "description": "팔레트별 청구",
  "config": {
    "unitPrice": 22,
    "groupBy": ["palletNo"]
  },
  "priority": 1,
  "isActive": true
}
```

#### 예시 3: KMX (노무 기준)

```bash
POST /api/project-billing-rules
Content-Type: application/json

{
  "project": "project_id_here",
  "ruleName": "KMX - Labor Billing",
  "ruleType": "LABOR",
  "unitBasis": "Hour",
  "priceSource": "labor_rate",
  "groupingKey": "work_type",
  "description": "작업 유형별 노무 시간 청구",
  "config": {
    "unitPrice": 18,
    "groupBy": ["workType"]
  },
  "priority": 1,
  "isActive": true
}
```

#### 예시 4: BSA (고정 월비)

```bash
POST /api/project-billing-rules
Content-Type: application/json

{
  "project": "project_id_here",
  "ruleName": "BSA - Fixed Monthly Fee",
  "ruleType": "FIXED",
  "unitBasis": "Month",
  "priceSource": "fixed_price",
  "groupingKey": "none",
  "description": "고정 월비",
  "config": {
    "unitPrice": 5000
  },
  "priority": 1,
  "isActive": true
}
```

### 3. 출하 실적 입력 (Delivery)

```bash
POST /api/deliveries
Content-Type: application/json

{
  "project": "project_id_here",
  "customer": "customer_id_here",
  "deliveryDate": "2024-01-15",
  "partNo": "F100",
  "partName": "Front Bumper",
  "quantity": 562,
  "unit": "EA",
  "palletNo": "PAL-001",
  "palletType": "6500lb",
  "palletCount": 1,
  "status": "delivered"
}
```

### 4. 노무 실적 입력 (Labor Log)

```bash
POST /api/labor-logs
Content-Type: application/json

{
  "project": "project_id_here",
  "customer": "customer_id_here",
  "workDate": "2024-01-15",
  "workType": "Packing",
  "workDescription": "Product packaging work",
  "hours": 42,
  "laborRate": 18,
  "status": "completed"
}
```

### 5. Invoice 자동 생성

```bash
POST /api/invoices/generate
Content-Type: application/json

{
  "projectId": "project_id_here",
  "periodMonth": "2024-01",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31",
  "userId": "user_id_here"
}
```

**응답 예시:**

```json
{
  "_id": "invoice_id",
  "invoiceNumber": "INV-202401-001",
  "project": {
    "_id": "project_id",
    "projectCode": "VW-CKD",
    "projectName": "Volkswagen CKD Project"
  },
  "customer": {
    "_id": "customer_id",
    "name": "Volkswagen",
    "company": "VW Group"
  },
  "periodMonth": "2024-01",
  "subtotal": 1288.68,
  "tax": 128.87,
  "totalAmount": 1417.55,
  "status": "draft",
  "items": [
    {
      "lineNumber": 1,
      "description": "Front Bumper - F100",
      "quantity": 562,
      "unit": "EA",
      "unitPrice": 0.14,
      "amount": 78.68,
      "groupingKey": "part_no",
      "groupingValue": "F100"
    },
    {
      "lineNumber": 2,
      "description": "6500lb Pallet - PAL-001",
      "quantity": 55,
      "unit": "Pallet",
      "unitPrice": 22,
      "amount": 1210,
      "groupingKey": "pallet_no",
      "groupingValue": "PAL-001"
    }
  ]
}
```

### 6. Invoice 조회

```bash
# 전체 목록
GET /api/invoices

# 특정 Invoice
GET /api/invoices/:id

# 프로젝트별 조회
GET /api/invoices?projectId=project_id

# 월별 조회
GET /api/invoices?periodMonth=2024-01
```

### 7. Invoice 승인/발송/결제

```bash
# 승인
PATCH /api/invoices/:id/approve
{
  "userId": "user_id"
}

# 발송
PATCH /api/invoices/:id/send

# 결제 처리
PATCH /api/invoices/:id/pay
{
  "amount": 1417.55,
  "paymentDate": "2024-02-15"
}
```

---

## 🔄 Invoice 생성 프로세스

1. **프로젝트 선택** → 프로젝트 ID 제공
2. **청구 기간 설정** → periodStart, periodEnd
3. **Rule Engine 실행**:
   - 프로젝트의 활성 Billing Rule 조회
   - 해당 기간의 실적 데이터 조회 (Delivery, LaborLog)
   - Rule에 따라 데이터 그룹핑 및 계산
   - Invoice Line Items 생성
4. **Invoice 저장**:
   - Invoice 헤더 생성
   - Invoice Items 저장
   - 실적 데이터에 Invoice 연결 표시 (invoiced = true)
5. **결과 반환**

---

## 🎨 Rule Engine 동작 방식

### EA 타입 (부품별 EA × 단가)

```
입력: Deliveries with partNo, quantity
그룹핑: partNo별
계산: SUM(quantity) × unitPrice
출력: Invoice Line per partNo
```

### PALLET 타입 (팔레트 × 단가)

```
입력: Deliveries with palletNo or palletCount
그룹핑: palletNo별 또는 palletType별
계산: COUNT(pallets) × palletRate
출력: Invoice Line per pallet group
```

### LABOR 타입 (시간 × 시간당 단가)

```
입력: LaborLogs with workType, hours
그룹핑: workType별
계산: SUM(hours) × laborRate
출력: Invoice Line per workType
```

### FIXED 타입 (고정 월비)

```
입력: 없음
계산: fixedPrice
출력: 1개 Invoice Line
```

### MIXED 타입 (복합)

```
입력: Deliveries + LaborLogs
처리: 여러 Rule 타입 조합
출력: 여러 Invoice Lines
```

---

## 📊 실제 사용 예시

### 시나리오: VW CKD 프로젝트 2024년 1월 Invoice 생성

1. **프로젝트 생성**
   ```bash
   POST /api/projects
   { "projectCode": "VW-CKD", ... }
   ```

2. **Billing Rule 설정**
   ```bash
   POST /api/project-billing-rules
   { "ruleType": "EA", "groupingKey": "part_no", ... }
   ```

3. **출하 실적 입력**
   ```bash
   POST /api/deliveries
   { "partNo": "F100", "quantity": 562, ... }
   POST /api/deliveries
   { "partNo": "F200", "quantity": 300, ... }
   ```

4. **Invoice 자동 생성**
   ```bash
   POST /api/invoices/generate
   {
     "projectId": "...",
     "periodMonth": "2024-01",
     "periodStart": "2024-01-01",
     "periodEnd": "2024-01-31"
   }
   ```

5. **결과**
   - Invoice 생성됨
   - 2개의 Invoice Items 자동 생성:
     - F100: 562 EA × $0.14 = $78.68
     - F200: 300 EA × $0.14 = $42.00
   - 총액: $120.68 + tax

---

## ✅ 주요 기능

- ✅ 프로젝트별 다른 청구 방식 지원
- ✅ Rule Engine 기반 자동 Invoice Line 생성
- ✅ 실적 데이터와 Invoice 연결 (Audit Trail)
- ✅ 그룹핑 및 집계 자동 처리
- ✅ Invoice 승인/발송/결제 워크플로우
- ✅ 역추적 가능한 소스 데이터 저장

---

## 🔮 향후 확장 가능 기능

- 가격표(Price List) 연동
- 복잡한 계산식(Formula) 지원
- 컨테이너 기준 청구
- 부피/무게 기준 청구
- 할인 규칙 적용
- 세금 계산 커스터마이징
- 다중 통화 지원
- Invoice 템플릿 커스터마이징

---

## 📞 문의

시스템 사용 중 문제가 발생하거나 기능 추가가 필요한 경우 개발팀에 문의하세요.

