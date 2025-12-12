import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseRequestItem {
  product?: mongoose.Types.ObjectId;
  description: string;
  modelNo?: string; // 모델 번호
  spec?: string; // 스펙 정보
  quantity: number;
  unitPrice?: number;
  estimatedTotal?: number;
  categoryCode?: string; // 카테고리 코드 (Category.code 참조)
}

export interface IPurchaseRequest extends Document {
  prNumber: string;
  requestedBy: mongoose.Types.ObjectId;
  department?: string;
  company?: mongoose.Types.ObjectId; // 발주 법인
  project?: mongoose.Types.ObjectId; // 프로젝트 (선택사항)
  items: IPurchaseRequestItem[];
  totalAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedDate: Date;
  requiredDate?: Date;
  estimatedDeliveryDate?: Date; // 예상 배송일/입고일
  reason?: string;
  notes?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  convertedToPO?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseRequestItemSchema = new Schema<IPurchaseRequestItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  description: {
    type: String,
    required: true,
  },
  modelNo: {
    type: String,
    trim: true,
  },
  spec: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: Number,
  estimatedTotal: Number,
  categoryCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
});

const PurchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    prNumber: {
      type: String,
      required: true,
      unique: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: String,
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },
    items: [PurchaseRequestItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'converted'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    requiredDate: Date,
    estimatedDeliveryDate: Date,
    reason: String,
    notes: String,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
    convertedToPO: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
    },
  },
  {
    timestamps: true,
  }
);

// PR 번호 자동 생성
PurchaseRequestSchema.pre('validate', async function (next) {
  if (!this.prNumber) {
    const count = await mongoose.model('PurchaseRequest').countDocuments();
    this.prNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }

  // 총액 계산
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => {
      const itemTotal = item.estimatedTotal || (item.unitPrice || 0) * item.quantity;
      return sum + itemTotal;
    }, 0);
  }

  next();
});

export default mongoose.model<IPurchaseRequest>('PurchaseRequest', PurchaseRequestSchema);

