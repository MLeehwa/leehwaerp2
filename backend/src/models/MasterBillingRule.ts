import mongoose, { Document, Schema } from 'mongoose';

export interface IBillingRuleItem {
  isFixed: boolean; // 고정 항목 여부
  itemName: string; // 항목명
  quantity: number; // 수량 (고정이 아닌 경우)
  unit: string; // 단위 (EA, Hour, Month, Pallet 등)
  unitPrice: number; // 단가
  amount: number; // 금액 (고정이면 unitPrice, 아니면 quantity * unitPrice)
}

export interface IMasterBillingRule extends Document {
  project: mongoose.Types.ObjectId; // 프로젝트 (필수)
  description?: string; // 설명 (선택사항)
  
  // 인보이스 항목들
  items: IBillingRuleItem[];
  
  // 활성화 여부
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const BillingRuleItemSchema = new Schema<IBillingRuleItem>({
  isFixed: { type: Boolean, required: true, default: false },
  itemName: { type: String, required: true },
  quantity: { type: Number, required: false, default: 1 },
  unit: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
}, { _id: false });

const MasterBillingRuleSchema = new Schema<IMasterBillingRule>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    description: String,
    items: {
      type: [BillingRuleItemSchema],
      required: true,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
MasterBillingRuleSchema.index({ project: 1, isActive: 1 });

export default mongoose.model<IMasterBillingRule>('MasterBillingRule', MasterBillingRuleSchema);

