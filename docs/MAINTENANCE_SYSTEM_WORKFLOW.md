# 지게차 유지보수 시스템 이상적인 워크플로우 제안

## 현재 시스템 구조 분석

### 현재 모델
1. **MaintenanceSchedule** - 점검/수리 일정
   - scheduleType: 'repair' | 'maintenance'
   - 정기 일정 관리

2. **MaintenanceWorkOrder** - 작업 지시서
   - workOrderType: 'preventive' | 'corrective' | 'emergency' | 'inspection'
   - 작업 요청 및 진행 관리

3. **MaintenanceRepair** - 수리 이력
   - repairType: 'repair' | 'maintenance' | 'inspection'
   - 완료된 작업 이력

### 현재 문제점
- Schedule에 'repair' 타입이 있어 혼란 가능
- WorkOrder와 Repair가 분리되어 중복 가능
- 이력 등록 시 어떤 모델을 사용할지 불명확
- 고장 신고 → 수리 → 이력 기록의 흐름이 불명확

---

## 이상적인 워크플로우 제안

### 1. 예방 유지보수 (Preventive Maintenance) - 정기 점검

```
[정기 점검 일정] → [작업 지시서] → [작업 수행] → [이력 기록]
```

**플로우:**
1. **MaintenanceSchedule** (scheduleType: 'maintenance')
   - 점검 주기에 따라 자동 생성
   - 상태: scheduled → in-progress → completed

2. **MaintenanceWorkOrder** (workOrderType: 'preventive')
   - Schedule에서 자동 생성 또는 수동 생성
   - 상태: requested → assigned → in-progress → completed
   - Schedule과 연결 (schedule 필드)

3. **작업 완료 시:**
   - WorkOrder 완료 → Schedule 자동 완료 처리
   - 다음 점검 일정 자동 생성
   - 설비의 lastMaintenanceDate, nextMaintenanceDate 업데이트

**이력 기록:**
- Schedule이 완료되면 이력으로 저장
- 별도의 Repair 기록 불필요 (Schedule이 이력 역할)

---

### 2. 고장 수리 (Corrective Maintenance) - 긴급/수리

```
[고장 신고] → [작업 지시서] → [작업 수행] → [수리 이력]
```

**플로우:**
1. **고장 신고/요청**
   - MaintenanceWorkOrder 생성 (workOrderType: 'corrective' 또는 'emergency')
   - priority: high 또는 urgent
   - 상태: requested

2. **작업 지시서 할당**
   - 담당자 할당 (assignedTo)
   - 상태: assigned → in-progress

3. **작업 수행 및 완료**
   - 상태: completed
   - rootCause, resolution, workPerformed 기록
   - partsUsed, laborCost, materialCost 기록

4. **수리 이력 기록**
   - WorkOrder 완료 시 **MaintenanceRepair** 자동 생성
   - 또는 수동으로 Repair 생성 (WorkOrder와 연결)
   - repairType: 'repair'

**이력 기록:**
- WorkOrder 완료 시 MaintenanceRepair 자동 생성
- Repair가 최종 이력 기록

---

### 3. 일상 점검 (Inspection) - 간단한 점검

```
[점검 요청] → [작업 지시서] → [점검 수행] → [이력 기록]
```

**플로우:**
1. **MaintenanceWorkOrder** (workOrderType: 'inspection')
   - 간단한 점검 작업
   - priority: low 또는 medium

2. **작업 완료 시:**
   - MaintenanceRepair 생성 (repairType: 'inspection')
   - 또는 Schedule 생성 (scheduleType: 'maintenance')

---

## 권장 시스템 구조

### 모델 역할 명확화

#### 1. MaintenanceSchedule (일정 관리)
- **용도**: 정기 점검 일정만 관리
- **scheduleType**: 'maintenance'만 사용 (repair 제거)
- **역할**: 
  - 점검 주기에 따른 자동 일정 생성
  - 일정 상태 관리 (scheduled → in-progress → completed)
  - 완료 시 이력 역할

#### 2. MaintenanceWorkOrder (작업 관리)
- **용도**: 모든 작업의 요청 및 진행 관리
- **workOrderType**: 
  - 'preventive': 정기 점검 (Schedule에서 생성)
  - 'corrective': 고장 수리
  - 'emergency': 긴급 수리
  - 'inspection': 일상 점검
- **역할**:
  - 작업 요청 및 할당
  - 작업 진행 상태 관리
  - 작업 완료 처리

#### 3. MaintenanceRepair (이력 기록)
- **용도**: 완료된 작업의 최종 이력
- **repairType**: 
  - 'repair': 수리 이력 (WorkOrder에서 생성)
  - 'maintenance': 점검 이력 (Schedule에서 생성)
  - 'inspection': 일상 점검 이력
- **역할**:
  - 완료된 작업의 최종 기록
  - 리포트 및 통계용 데이터
  - WorkOrder 또는 Schedule과 연결

---

## 권장 워크플로우

### 시나리오 1: 정기 점검
```
1. 점검 주기 도래 → MaintenanceSchedule 자동 생성
2. Schedule에서 MaintenanceWorkOrder 생성 (선택적)
3. 작업 수행 → WorkOrder 완료
4. WorkOrder 완료 → Schedule 자동 완료
5. Schedule 완료 → MaintenanceRepair 생성 (이력)
6. 다음 점검 일정 자동 생성
```

### 시나리오 2: 고장 수리
```
1. 고장 발견 → MaintenanceWorkOrder 생성 (corrective/emergency)
2. 담당자 할당 → WorkOrder 상태: assigned
3. 작업 시작 → WorkOrder 상태: in-progress
4. 작업 완료 → WorkOrder 상태: completed
5. WorkOrder 완료 → MaintenanceRepair 자동 생성 (이력)
```

### 시나리오 3: 간단한 점검
```
1. 점검 요청 → MaintenanceWorkOrder 생성 (inspection)
2. 작업 수행 및 완료
3. WorkOrder 완료 → MaintenanceRepair 생성 (repairType: 'inspection')
```

---

## 구현 권장사항

### 1. Schedule에서 repair 타입 제거
- scheduleType을 'maintenance'만 사용
- 수리는 WorkOrder로만 처리

### 2. WorkOrder 완료 시 자동 이력 생성
- WorkOrder 완료 시 MaintenanceRepair 자동 생성
- workOrderType에 따라 repairType 자동 설정:
  - preventive → maintenance
  - corrective/emergency → repair
  - inspection → inspection

### 3. Schedule 완료 시 자동 이력 생성
- Schedule 완료 시 MaintenanceRepair 생성 (repairType: 'maintenance')
- WorkOrder가 연결된 경우 WorkOrder도 완료 처리

### 4. 통합 이력 조회
- MaintenanceRepair를 통합 이력으로 사용
- Schedule과 WorkOrder는 모두 Repair와 연결
- 리포트는 Repair 데이터 기반으로 생성

---

## 데이터 관계도

```
MaintenanceEquipment
    ├── MaintenanceSchedule (정기 일정)
    │       └── MaintenanceWorkOrder (작업 지시)
    │               └── MaintenanceRepair (이력)
    │
    └── MaintenanceWorkOrder (고장 수리)
            └── MaintenanceRepair (이력)
```

---

## 결론

**권장 구조:**
- **Schedule**: 정기 점검 일정만 (maintenance 타입만)
- **WorkOrder**: 모든 작업 요청 및 진행 관리
- **Repair**: 모든 완료 작업의 최종 이력

**워크플로우:**
- 정기 점검: Schedule → WorkOrder → Repair
- 고장 수리: WorkOrder → Repair
- 간단 점검: WorkOrder → Repair

이렇게 하면 역할이 명확하고, 중복이 없으며, 이력 관리가 일관됩니다.

