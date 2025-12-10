import mongoose, { Document, Schema } from 'mongoose';

/**
 * 노무 실적 데이터
 * 프로젝트별 노무 시간을 기록하여 Invoice 생성 시 사용
 */
export interface ILaborLog extends Document {
  logNumber: string;
  project: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  
  // 작업 정보
  workDate: Date;
  workType: string; // Packing, Assembly, Inspection 등
  workDescription?: string;
  
  // 시간 정보
  hours: number; // 작업 시간
  laborRate?: number; // 시간당 단가 (기본값은 프로젝트 설정에서 가져옴)
  
  // 수량 정보 (처리 수량 등)
  quantity?: number;
  quantityUnit?: string;
  
  // 작업자 정보
  workerName?: string;
  workerId?: string;
  
  // PO 정보
  poNumber?: string;
  
  // 상태
  status: 'pending' | 'completed' | 'cancelled';
  
  // Invoice 연결
  invoiced: boolean;
  invoiceId?: mongoose.Types.ObjectId;
  invoiceItemId?: mongoose.Types.ObjectId;
  
  // 메모
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const LaborLogSchema = new Schema<ILaborLog>(
  {
    logNumber: {
      type: String,
      required: true,
      unique: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    workDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    workType: {
      type: String,
      required: true,
    },
    workDescription: String,
    hours: {
      type: Number,
      required: true,
      min: 0,
    },
    laborRate: Number,
    quantity: Number,
    quantityUnit: String,
    workerName: String,
    workerId: String,
    poNumber: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    invoiced: {
      type: Boolean,
      default: false,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    invoiceItemId: {
      type: Schema.Types.ObjectId,
      ref: 'InvoiceItem',
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

// 로그번호 자동 생성
LaborLogSchema.pre('save', async function (next) {
  if (!this.logNumber) {
    const count = await mongoose.model('LaborLog').countDocuments();
    this.logNumber = `LAB-${Date.now()}-${count + 1}`;
  }
  next();
});

// 인덱스
LaborLogSchema.index({ project: 1, workDate: 1 });
LaborLogSchema.index({ project: 1, invoiced: 1 });
LaborLogSchema.index({ workType: 1 });

export default mongoose.model<ILaborLog>('LaborLog', LaborLogSchema);

