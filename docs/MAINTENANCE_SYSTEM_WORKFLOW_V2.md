# 지게차 유지보수 시스템 이상적인 워크플로우 제안 (수정안)

## 핵심 개념 정리

### 고장 등록 vs 작업 지시서
- **고장 등록**: 문제를 발견하고 신고하는 단계
- **작업 지시서**: 고장을 해결하기 위한 작업을 지시하는 단계
- **이력 기록**: 완료된 작업의 최종 기록

---

## 이상적인 워크플로우 (수정안)

### 1. 정기 점검 (Preventive Maintenance)

```
[정기 일정] → [작업 수행] → [이력 기록]
```

**플로우:**
1. **MaintenanceSchedule** (scheduleType: 'maintenance')
   - 점검 주기에 따라 자동 생성
   - 상태: scheduled → in-progress → completed

2. **작업 수행**
   - Schedule에서 직접 작업 수행
   - 또는 간단한 점검은 바로 완료 처리

3. **이력 기록**
   - Schedule 완료 시 **MaintenanceRepair** 자동 생성 (repairType: 'maintenance')
   - 다음 점검 일정 자동 생성

**작업 지시서 불필요**: 정기 점검은 일정이 이미 있으므로 WorkOrder 없이 진행 가능

---

### 2. 고장 수리 (Corrective Maintenance) - 수정안

```
[고장 등록] → [작업 지시서] → [작업 수행] → [이력 기록]
```

**플로우:**
1. **고장 등록 (MaintenanceRepair)**
   - 고장 발견 시 즉시 등록
   - repairType: 'repair'
   - status: 'reported' (신규 상태 추가 필요)
   - issue: 문제점 상세 기록
   - reportedBy: 신고자
   - reportedDate: 신고일

2. **작업 지시서 생성 (MaintenanceWorkOrder)**
   - 고장 등록 후 작업 지시서 생성
   - workOrderType: 'corrective' 또는 'emergency'
   - priority: 고장 심각도에 따라 설정
   - Repair와 연결 (repair 필드 추가 필요)
   - 상태: requested → assigned → in-progress → completed

3. **작업 수행**
   - 담당자 할당 및 작업 진행
   - rootCause, resolution, workPerformed 기록
   - partsUsed, laborCost, materialCost 기록

4. **작업 완료 및 이력 업데이트**
   - WorkOrder 완료 시 Repair 상태 업데이트
   - Repair의 workPerformed, partsUsed 등 업데이트
   - Repair가 최종 이력 기록

---

### 3. 간단한 점검 (Inspection)

```
[점검 등록] → [작업 수행] → [이력 기록]
```

**플로우:**
1. **점검 등록 (MaintenanceRepair)**
   - repairType: 'inspection'
   - status: 'reported' 또는 바로 'completed'

2. **작업 수행**
   - 간단한 점검은 바로 완료 가능
   - WorkOrder 불필요 (간단한 경우)

3. **이력 기록**
   - Repair가 바로 이력 역할

---

## 권장 시스템 구조 (수정안)

### 1. MaintenanceSchedule (일정 관리)
- **용도**: 정기 점검 일정만
- **scheduleType**: 'maintenance'만 사용
- **역할**: 
  - 점검 주기에 따른 자동 일정 생성
  - 일정 상태 관리
  - 완료 시 Repair 생성

### 2. MaintenanceRepair (고장/점검 등록 + 이력)
- **용도**: 고장 등록 및 완료된 작업 이력
- **repairType**: 
  - 'repair': 고장 수리
  - 'maintenance': 정기 점검 이력
  - 'inspection': 간단 점검
- **status 추가 필요**: 
  - 'reported': 고장 신고됨 (작업 전)
  - 'in-progress': 작업 진행 중
  - 'completed': 완료
  - 'cancelled': 취소
- **역할**:
  - 고장 신고 및 등록
  - 완료된 작업의 최종 이력
  - 리포트 및 통계용 데이터

### 3. MaintenanceWorkOrder (작업 지시서)
- **용도**: 고장 수리를 위한 작업 지시
- **workOrderType**: 
  - 'corrective': 고장 수리
  - 'emergency': 긴급 수리
- **repair 필드 추가**: Repair와 연결
- **역할**:
  - 고장 수리 작업의 진행 관리
  - 담당자 할당 및 작업 진행 추적
  - 작업 완료 시 Repair 업데이트

---

## 권장 워크플로우 (수정안)

### 시나리오 1: 정기 점검
```
1. 점검 주기 도래 → MaintenanceSchedule 자동 생성
2. 작업 수행 → Schedule 상태: in-progress
3. 작업 완료 → Schedule 상태: completed
4. Schedule 완료 → MaintenanceRepair 생성 (repairType: 'maintenance')
5. 다음 점검 일정 자동 생성
```

### 시나리오 2: 고장 수리
```
1. 고장 발견 → MaintenanceRepair 등록 (status: 'reported')
2. 고장 등록 확인 → MaintenanceWorkOrder 생성 (repair 연결)
3. 담당자 할당 → WorkOrder 상태: assigned
4. 작업 시작 → WorkOrder 상태: in-progress, Repair 상태: 'in-progress'
5. 작업 완료 → WorkOrder 상태: completed
6. WorkOrder 완료 → Repair 상태: 'completed', 이력 정보 업데이트
```

### 시나리오 3: 간단한 점검
```
1. 점검 등록 → MaintenanceRepair (repairType: 'inspection')
2. 바로 완료 처리 → Repair 상태: 'completed'
3. Repair가 이력 역할
```

---

## 데이터 관계도 (수정안)

```
MaintenanceEquipment
    ├── MaintenanceSchedule (정기 일정)
    │       └── MaintenanceRepair (점검 이력)
    │
    └── MaintenanceRepair (고장 등록)
            └── MaintenanceWorkOrder (작업 지시서)
                    └── MaintenanceRepair 업데이트 (수리 이력)
```

---

## 구현 필요사항

### 1. MaintenanceRepair 모델 수정
- status에 'reported' 추가
- reportedBy, reportedDate 필드 활용
- issue 필드 활용 (문제점 기록)

### 2. MaintenanceWorkOrder 모델 수정
- repair 필드 추가 (Repair와 연결)
- workOrderType에서 preventive, inspection 제거
- corrective, emergency만 사용

### 3. MaintenanceSchedule 모델
- scheduleType에서 'repair' 제거
- 'maintenance'만 사용

### 4. 자동화 로직
- 고장 등록 시 WorkOrder 자동 생성 옵션
- WorkOrder 완료 시 Repair 자동 업데이트
- Schedule 완료 시 Repair 자동 생성

---

## 결론

**핵심 개념:**
- **고장 등록**: MaintenanceRepair (status: 'reported')
- **작업 지시**: MaintenanceWorkOrder (고장 수리용)
- **이력 기록**: MaintenanceRepair (status: 'completed')

**워크플로우:**
- 정기 점검: Schedule → Repair (이력)
- 고장 수리: Repair(등록) → WorkOrder → Repair(이력)
- 간단 점검: Repair(등록+이력)

이 구조가 더 자연스럽고 직관적입니다!

