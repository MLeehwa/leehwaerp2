import mongoose, { Document, Schema } from 'mongoose';

/**
 * Billing Rule Type: 청구 방식
 * - EA: 개당 단가 × 수량
 * - PALLET: 팔레트 단가 × 팔레트 수량
 * - LABOR: 노무 시간 × 시간당 단가
 * - FIXED: 고정 월비
 * - MIXED: 복합 (여러 방식 혼합)
 * - VOLUME: 부피/무게 기준
 * - CONTAINER: 컨테이너 기준
 */
export type BillingRuleType = 
  | 'EA' 
  | 'PALLET' 
  | 'LABOR' 
  | 'FIXED' 
  | 'MIXED' 
  | 'VOLUME' 
  | 'CONTAINER';

/**
 * Unit Basis: 단위 기준
 */
export type UnitBasis = 
  | 'EA' 
  | 'Pallet' 
  | 'Hour' 
  | 'Month' 
  | 'Container' 
  | 'KG' 
  | 'CBM' 
  | 'Mixed';

/**
 * Price Source: 가격 출처
 * - price_list: 가격표에서 가져오기
 * - fixed_price: 고정 가격
 * - labor_rate: 노무 단가
 * - pallet_rate: 팔레트 단가
 * - contract_rate: 계약 단가
 * - composite_rate: 복합 계산
 */
export type PriceSource = 
  | 'price_list' 
  | 'fixed_price' 
  | 'labor_rate' 
  | 'pallet_rate' 
  | 'contract_rate' 
  | 'composite_rate';

/**
 * Grouping Key: 그룹핑 기준
 * - part_no: 부품 번호별
 * - pallet_no: 팔레트 번호별
 * - date: 날짜별
 * - work_type: 작업 유형별
 * - none: 그룹핑 없음
 */
export type GroupingKey = 
  | 'part_no' 
  | 'pallet_no' 
  | 'date' 
  | 'work_type' 
  | 'none' 
  | 'mixed';

export interface IBillingRuleItem {
  description: string; // 항목 설명
  quantity: number; // 수량
  unit: string; // 단위 (EA, Hour, Month, Pallet 등)
  unitPrice: number; // 단가
  amount: number; // 금액 (quantity * unitPrice, 자동 계산)
}

export interface IRuleConfig {
  // 가격 설정
  unitPrice?: number; // 고정 단가 (fixed_price일 때, 단일 항목용)
  priceListId?: string; // 가격표 ID (price_list일 때)
  priceField?: string; // 가격표에서 가져올 필드명
  
  // 여러 항목 (FIXED, MIXED 타입에서 사용)
  items?: IBillingRuleItem[];
  
  // 그룹핑 설정
  groupBy?: string[]; // 그룹핑할 필드들
  
  // 필터 설정
  filters?: {
    field: string;
    operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
    value: any;
  }[];
  
  // 계산식 (복잡한 경우)
  formula?: string; // 예: "qty * unitPrice * (1 + taxRate)"
  
  // 추가 설정 (JSON)
  metadata?: Record<string, any>;
}

export interface IProjectBillingRule extends Document {
  project: mongoose.Types.ObjectId;
  ruleName: string; // 규칙 이름 (예: "VW CKD - Part Billing")
  ruleType: BillingRuleType;
  unitBasis: UnitBasis;
  priceSource: PriceSource;
  groupingKey: GroupingKey;
  description?: string;
  
  // Rule 설정 (JSON 형태로 유연하게 저장)
  config: IRuleConfig;
  
  // 우선순위 (MIXED 타입일 때 여러 규칙 중 우선순위)
  priority: number;
  
  // 활성화 여부
  isActive: boolean;
  
  // 적용 시작/종료일
  effectiveFrom?: Date;
  effectiveTo?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const BillingRuleItemSchema = new Schema<IBillingRuleItem>({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const RuleConfigSchema = new Schema<IRuleConfig>({
  unitPrice: Number,
  priceListId: String,
  priceField: String,
  items: [BillingRuleItemSchema],
  groupBy: [String],
  filters: [{
    field: String,
    operator: {
      type: String,
      enum: ['eq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'],
    },
    value: Schema.Types.Mixed,
  }],
  formula: String,
  metadata: Schema.Types.Mixed,
}, { _id: false });

const ProjectBillingRuleSchema = new Schema<IProjectBillingRule>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    ruleName: {
      type: String,
      required: true,
    },
    ruleType: {
      type: String,
      enum: ['EA', 'PALLET', 'LABOR', 'FIXED', 'MIXED', 'VOLUME', 'CONTAINER'],
      required: true,
    },
    unitBasis: {
      type: String,
      enum: ['EA', 'Pallet', 'Hour', 'Month', 'Container', 'KG', 'CBM', 'Mixed'],
      required: true,
    },
    priceSource: {
      type: String,
      enum: ['price_list', 'fixed_price', 'labor_rate', 'pallet_rate', 'contract_rate', 'composite_rate'],
      required: true,
    },
    groupingKey: {
      type: String,
      enum: ['part_no', 'pallet_no', 'date', 'work_type', 'none', 'mixed'],
      required: true,
    },
    description: String,
    config: {
      type: RuleConfigSchema,
      required: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    effectiveFrom: Date,
    effectiveTo: Date,
  },
  {
    timestamps: true,
  }
);

// 프로젝트별 활성 규칙 인덱스
ProjectBillingRuleSchema.index({ project: 1, isActive: 1, priority: -1 });

export default mongoose.model<IProjectBillingRule>('ProjectBillingRule', ProjectBillingRuleSchema);

