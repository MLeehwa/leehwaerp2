import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseOrderItem {
  product?: mongoose.Types.ObjectId;
  description: string;
  modelNo?: string; // 모델 번호
  spec?: string; // 스펙 정보
  quantity: number;
  unitPrice: number;
  total: number;
  receivedQuantity?: number;
  categoryCode?: string; // 카테고리 코드 (Category.code 참조)
  websiteUrl?: string;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  supplier: mongoose.Types.ObjectId;
  purchaseRequest?: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  discount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled' | 'invoiced' | 'paid';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  paymentTerms: string;
  paymentMethod?: 'cash' | 'bank_transfer' | 'check' | 'credit_card';
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  locationId?: mongoose.Types.ObjectId; // 발주 부서/위치
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
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
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  total: {
    type: Number,
    required: true,
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  categoryCode: {
    type: String,
    uppercase: true,
    trim: true,
  },
  websiteUrl: {
    type: String,
    trim: true,
  },
});

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    purchaseRequest: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
    },
    items: [PurchaseOrderItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    shippingCost: {
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
    currency: {
      type: String,
      default: 'USD',
    },
    status: {
      type: String,
      enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'cancelled', 'invoiced', 'paid'],
      default: 'draft',
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,
    paymentTerms: {
      type: String,
      default: 'Net 30',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'credit_card'],
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    notes: String,
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
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
  },
  {
    timestamps: true,
  }
);

// PO 번호 자동 생성
PurchaseOrderSchema.pre('validate', async function (next) {
  if (!this.poNumber) {
    const lastPO = await mongoose.model('PurchaseOrder').findOne({}).sort({ poNumber: -1 });
    let newNumber = 1;
    if (lastPO && lastPO.poNumber) {
      const parts = lastPO.poNumber.split('-');
      if (parts.length === 3) {
        const lastYear = parseInt(parts[1], 10);
        const lastSeq = parseInt(parts[2], 10);
        const currentYear = new Date().getFullYear();
        if (lastYear === currentYear) {
          newNumber = lastSeq + 1;
        }
      }
    }
    this.poNumber = `PO-${new Date().getFullYear()}-${String(newNumber).padStart(6, '0')}`;
  }

  // 총액 계산
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
    this.total = this.subtotal + this.tax + this.shippingCost - this.discount;
  }

  // 입고 완료 여부 확인
  if (this.items && this.items.length > 0) {
    const allReceived = this.items.every(
      (item) => item.receivedQuantity && item.receivedQuantity >= item.quantity
    );
    const partialReceived = this.items.some(
      (item) => item.receivedQuantity && item.receivedQuantity > 0 && item.receivedQuantity < item.quantity
    );

    if (allReceived && this.status !== 'received') {
      this.status = 'received';
    } else if (partialReceived && this.status === 'confirmed') {
      this.status = 'partial';
    }
  }

  next();
});

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);

