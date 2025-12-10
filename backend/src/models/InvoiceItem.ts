import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem extends Document {
  invoice: mongoose.Types.ObjectId;
  
  // 라인 항목 정보
  lineNumber: number; // 라인 순서
  description: string; // 설명 (예: "Part F100", "6500lb Pallet", "Labor – Packing")
  quantity: number;
  unit: string; // 단위 (EA, Pallet, Hour, Month 등)
  unitPrice: number;
  amount: number; // quantity × unitPrice
  
  // 그룹핑 정보 (어떤 기준으로 그룹핑되었는지)
  groupingKey?: string; // part_no, pallet_no, date 등
  groupingValue?: string; // 실제 그룹핑 값
  
  // Rule 정보 (어떤 규칙으로 생성되었는지)
  ruleId?: mongoose.Types.ObjectId;
  ruleType?: string;
  
  // 소스 데이터 (역추적용)
  sourceData?: {
    sourceType: 'delivery' | 'labor' | 'pallet' | 'fixed' | 'other';
    sourceIds: string[]; // 관련 실적 데이터 ID들
    rawData?: Record<string, any>; // 원본 데이터 스냅샷
  };
  
  // 메모
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const SourceDataSchema = new Schema({
  sourceType: {
    type: String,
    enum: ['delivery', 'labor', 'pallet', 'fixed', 'other'],
  },
  sourceIds: [String],
  rawData: Schema.Types.Mixed,
}, { _id: false });

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    lineNumber: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    groupingKey: String,
    groupingValue: String,
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectBillingRule',
    },
    ruleType: String,
    sourceData: SourceDataSchema,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// 인덱스
InvoiceItemSchema.index({ invoice: 1, lineNumber: 1 });
InvoiceItemSchema.index({ ruleId: 1 });

export default mongoose.model<IInvoiceItem>('InvoiceItem', InvoiceItemSchema);

