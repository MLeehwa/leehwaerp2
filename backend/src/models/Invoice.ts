import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'draft' | 'approved' | 'sent' | 'paid' | 'cancelled' | 'overdue';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';

export interface IInvoice extends Document {
  invoiceNumber: string; // 자동 생성: INV-YYYYMM-XXX
  project: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  
  // 청구 기간
  periodMonth: string; // YYYY-MM 형식
  periodStart: Date;
  periodEnd: Date;
  
  // PO 정보
  poNumber?: string;
  
  // 금액 정보
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number;
  currency: string;
  
  // 상태
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  
  // 날짜
  invoiceDate: Date;
  dueDate: Date;
  paidDate?: Date;
  
  // 메모 및 첨부
  notes?: string;
  attachments?: string[]; // 파일 URL들
  
  // 생성 정보
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  
  // Audit trail
  sourceData?: {
    ruleId?: string;
    generatedFrom?: string; // 'auto' | 'manual'
    sourceRecords?: string[]; // 관련 실적 데이터 ID들
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
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
    periodMonth: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/, // YYYY-MM 형식
    },
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    poNumber: String,
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sent', 'paid', 'cancelled', 'overdue'],
      default: 'draft',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: Date,
    notes: String,
    attachments: [String],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    sourceData: {
      ruleId: String,
      generatedFrom: {
        type: String,
        enum: ['auto', 'manual'],
      },
      sourceRecords: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Invoice 번호 자동 생성
InvoiceSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const yearMonth = this.periodMonth.replace('-', '');
    const count = await mongoose.model('Invoice').countDocuments({
      periodMonth: this.periodMonth,
    });
    this.invoiceNumber = `INV-${yearMonth}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// 인덱스
InvoiceSchema.index({ project: 1, periodMonth: 1 });
InvoiceSchema.index({ customer: 1, status: 1 });
// invoiceNumber는 unique: true로 이미 인덱스가 생성되므로 별도 인덱스 불필요

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);

