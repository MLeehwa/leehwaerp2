import mongoose, { Document, Schema } from 'mongoose';

export interface IAccountsPayable extends Document {
  apNumber: string;
  purchaseOrder: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  invoiceDate?: Date;
  dueDate: Date;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  currency: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  paymentTerms: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  payments: {
    paymentDate: Date;
    amount: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema({
  paymentDate: {
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
    required: true,
  },
  referenceNumber: String,
  notes: String,
});

const AccountsPayableSchema = new Schema<IAccountsPayable>(
  {
    apNumber: {
      type: String,
      required: true,
      unique: true,
    },
    purchaseOrder: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    invoiceNumber: String,
    invoiceDate: Date,
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
    total: {
      type: Number,
      required: true,
      default: 0,
    },
    paidAmount: {
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
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'credit_card'],
    },
    paymentTerms: {
      type: String,
      default: 'Net 30',
    },
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    payments: [PaymentSchema],
  },
  {
    timestamps: true,
  }
);

// AP 번호 자동 생성
AccountsPayableSchema.pre('save', async function (next) {
  if (!this.apNumber) {
    const count = await mongoose.model('AccountsPayable').countDocuments();
    this.apNumber = `AP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  // 잔액 계산
  this.remainingAmount = this.total - this.paidAmount;

  // 상태 업데이트
  if (this.remainingAmount <= 0) {
    this.status = 'paid';
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
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

export default mongoose.model<IAccountsPayable>('AccountsPayable', AccountsPayableSchema);

