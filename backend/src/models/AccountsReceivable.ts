import mongoose, { Document, Schema } from 'mongoose';

/**
 * Accounts Receivable (매출채권)
 * Sales의 Invoice와 연결되어 고객으로부터 받아야 할 금액을 관리
 */
export interface IAccountsReceivable extends Document {
  arNumber: string; // AR 번호 (자동 생성)
  invoice: mongoose.Types.ObjectId; // 연결된 Invoice
  customer: mongoose.Types.ObjectId; // 고객
  project: mongoose.Types.ObjectId; // 프로젝트

  // Invoice 정보
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;

  // 금액 정보
  subtotal: number;
  tax: number;
  discount: number;
  totalAmount: number; // 총 청구 금액
  receivedAmount: number; // 수금 금액
  remainingAmount: number; // 미수금

  // 상태
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';

  // 통화
  currency: string;

  // 수금 내역
  receipts: {
    receiptDate: Date;
    amount: number;
    paymentMethod: 'cash' | 'bank_transfer' | 'check' | 'credit_card' | 'wire_transfer';
    referenceNumber?: string; // 거래번호, 수표번호 등
    bankAccount?: string; // 입금 계좌
    notes?: string;
    receivedBy?: mongoose.Types.ObjectId; // 수금 처리자
  }[];

  // 메모
  notes?: string;

  // 생성 정보
  createdBy: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema({
  receiptDate: {
    type: Date,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'wire_transfer'],
    required: true,
  },
  referenceNumber: String,
  bankAccount: String,
  notes: String,
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

const AccountsReceivableSchema = new Schema<IAccountsReceivable>(
  {
    arNumber: {
      type: String,
      required: true,
      unique: true,
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
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
    receivedAmount: {
      type: Number,
      default: 0,
    },
    remainingAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partial', 'paid'],
      default: 'unpaid',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    receipts: [ReceiptSchema],
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// AR 번호 자동 생성 및 상태 업데이트
AccountsReceivableSchema.pre('save', async function (next) {
  if (!this.arNumber) {
    const count = await mongoose.model('AccountsReceivable').countDocuments();
    const year = new Date().getFullYear();
    this.arNumber = `AR-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // 잔액 계산
  this.remainingAmount = this.totalAmount - this.receivedAmount;

  // 상태 업데이트
  if (this.remainingAmount <= 0) {
    this.status = 'paid';
    this.paymentStatus = 'paid';
  } else if (this.receivedAmount > 0) {
    this.status = 'partial';
    this.paymentStatus = 'partial';
  } else {
    // 만료일 확인
    if (this.dueDate && new Date() > this.dueDate) {
      this.status = 'overdue';
    } else {
      this.status = 'pending';
    }
    this.paymentStatus = 'unpaid';
  }

  next();
});

// 인덱스
AccountsReceivableSchema.index({ invoice: 1 });
AccountsReceivableSchema.index({ customer: 1, status: 1 });
AccountsReceivableSchema.index({ project: 1 });
AccountsReceivableSchema.index({ dueDate: 1 });

export default mongoose.model<IAccountsReceivable>('AccountsReceivable', AccountsReceivableSchema);

