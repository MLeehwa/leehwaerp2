# 지게차 유지보수 시스템 최종 워크플로우

## 실제 사용 워크플로우

### 1. 정기 점검 (Preventive Maintenance)

```
[정기 일정] → [점검 수행] → [이력 기록]
```

**플로우:**
1. **MaintenanceSchedule** (scheduleType: 'maintenance')
   - 점검 주기에 따라 자동 생성
   - 상태: scheduled → in-progress → completed

2. **점검 수행 및 완료**
   - Schedule에서 직접 작업 수행
   - 완료 처리

3. **이력 기록**
   - Schedule 완료 시 **MaintenanceRepair** 자동 생성
   - repairType: 'maintenance'
   - status: 'completed'
   - 다음 점검 일정 자동 생성

---

### 2. 고장 수리 (Corrective Maintenance) - 실제 워크플로우

```
[고장 등록] → [업체 연락] → [수리 완료/이력 기록]
```

**플로우:**
1. **고장 등록 (MaintenanceRepair)**
   - 고장 발견 시 즉시 등록
   - repairType: 'repair'
   - status: 'reported' (고장 신고됨)
   - issue: 문제점 상세 기록
   - reportedBy: 신고자
   - repairDate: 고장 발견일

2. **업체 연락 및 수리 진행**
   - status: 'in-progress' (수리 진행 중)
   - 업체와 연락하여 수리 진행

3. **수리 완료 및 이력 기록**
   - 수리 완료 후 이력 등록
   - status: 'completed'
   - workPerformed: 수행 작업 기록
   - partsUsed: 사용 부품 기록
   - laborCost, materialCost, totalCost: 비용 기록
   - performedBy: 수리 담당자

---

### 3. 간단한 점검 (Inspection)

```
[점검 등록] → [점검 수행] → [이력 기록]
```

**플로우:**
1. **점검 등록 (MaintenanceRepair)**
   - repairType: 'inspection'
   - status: 'reported' 또는 바로 'completed'

2. **점검 완료**
   - 간단한 점검은 바로 완료 처리
   - status: 'completed'

---

## 최종 시스템 구조

### 1. MaintenanceSchedule (일정 관리)
- **용도**: 정기 점검 일정만
- **scheduleType**: 'maintenance'만 사용
- **역할**: 
  - 점검 주기에 따른 자동 일정 생성
  - 일정 상태 관리
  - 완료 시 Repair 생성

### 2. MaintenanceRepair (고장 등록 + 이력 기록)
- **용도**: 고장 등록 및 완료된 작업 이력
- **repairType**: 
  - 'repair': 고장 수리
  - 'maintenance': 정기 점검 이력
  - 'inspection': 간단 점검
- **status**: 
  - 'reported': 고장 신고됨 (작업 전)
  - 'in-progress': 수리 진행 중
  - 'completed': 완료
  - 'cancelled': 취소
- **역할**:
  - 고장 신고 및 등록
  - 수리 진행 상태 관리
  - 완료된 작업의 최종 이력
  - 리포트 및 통계용 데이터

### 3. MaintenanceWorkOrder (작업 지시서)
- **용도**: 사용하지 않음 (또는 다른 용도로만 사용)
- **참고**: 현재 시스템에 있지만 실제 워크플로우에서는 사용하지 않음

---

## 최종 워크플로우

### 시나리오 1: 정기 점검
```
1. 점검 주기 도래 → MaintenanceSchedule 자동 생성
2. 작업 수행 → Schedule 상태: in-progress
3. 작업 완료 → Schedule 상태: completed
4. Schedule 완료 → MaintenanceRepair 생성 (repairType: 'maintenance', status: 'completed')
5. 다음 점검 일정 자동 생성
```

### 시나리오 2: 고장 수리
```
1. 고장 발견 → MaintenanceRepair 등록 (status: 'reported')
2. 업체 연락 → Repair 상태: 'in-progress'
3. 수리 완료 → Repair 상태: 'completed', 이력 정보 입력
```

### 시나리오 3: 간단한 점검
```
1. 점검 등록 → MaintenanceRepair (repairType: 'inspection')
2. 바로 완료 처리 → Repair 상태: 'completed'
```

---

## 데이터 관계도

```
MaintenanceEquipment
    ├── MaintenanceSchedule (정기 일정)
    │       └── MaintenanceRepair (점검 이력)
    │
    └── MaintenanceRepair (고장 등록 → 수리 완료)
            ├── status: 'reported' (고장 등록)
            ├── status: 'in-progress' (수리 진행)
            └── status: 'completed' (수리 완료/이력)
```

---

## 구현 필요사항

### 1. MaintenanceRepair 모델 수정
- status에 'reported' 추가
- reportedBy, reportedDate 필드 활용
- issue 필드 활용 (문제점 기록)
- performedBy 필드 활용 (수리 담당자)

### 2. MaintenanceSchedule 모델
- scheduleType에서 'repair' 제거
- 'maintenance'만 사용

### 3. 자동화 로직
- Schedule 완료 시 Repair 자동 생성
- 다음 점검 일정 자동 생성

### 4. UI 개선
- 고장 등록 화면 (status: 'reported')
- 수리 진행 상태 업데이트 (status: 'in-progress')
- 수리 완료/이력 등록 화면 (status: 'completed')

---

## 결론

**핵심 개념:**
- **고장 등록**: MaintenanceRepair (status: 'reported')
- **수리 진행**: MaintenanceRepair (status: 'in-progress')
- **이력 기록**: MaintenanceRepair (status: 'completed')

**워크플로우:**
- 정기 점검: Schedule → Repair (이력)
- 고장 수리: Repair(등록) → Repair(진행) → Repair(완료/이력)
- 간단 점검: Repair(등록+이력)

**작업 지시서 불필요**: 등록한 사람이 직접 처리하므로 WorkOrder는 사용하지 않음

이 구조가 실제 사용 패턴에 가장 적합합니다!

