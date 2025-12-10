import mongoose, { Document, Schema } from 'mongoose';

/**
 * 출하 실적 데이터
 * 프로젝트별 출하 내역을 기록하여 Invoice 생성 시 사용
 */
export interface IDelivery extends Document {
  deliveryNumber: string;
  project: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  
  // 출하 정보
  deliveryDate: Date;
  partNo?: string; // 부품 번호 (EA 기준 청구 시 사용)
  partName?: string;
  quantity: number; // 출하 수량
  unit: string; // 단위 (EA, Pallet 등)
  
  // 팔레트 정보 (팔레트 기준 청구 시 사용)
  palletNo?: string;
  palletType?: string; // 6500lb, 4000lb 등
  palletCount?: number;
  
  // 컨테이너 정보
  containerNo?: string;
  containerType?: string;
  
  // 기타 정보
  weight?: number; // KG
  volume?: number; // CBM
  
  // PO 정보
  poNumber?: string;
  soNumber?: string; // Sales Order 번호
  
  // 상태
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  
  // Invoice 연결 (이 출하가 어떤 Invoice에 포함되었는지)
  invoiced: boolean;
  invoiceId?: mongoose.Types.ObjectId;
  invoiceItemId?: mongoose.Types.ObjectId;
  
  // 메모
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: {
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
    deliveryDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    partNo: String,
    partName: String,
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: 'EA',
    },
    palletNo: String,
    palletType: String,
    palletCount: Number,
    containerNo: String,
    containerType: String,
    weight: Number,
    volume: Number,
    poNumber: String,
    soNumber: String,
    status: {
      type: String,
      enum: ['pending', 'shipped', 'delivered', 'cancelled'],
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

// 출하번호 자동 생성
DeliverySchema.pre('save', async function (next) {
  if (!this.deliveryNumber) {
    const count = await mongoose.model('Delivery').countDocuments();
    this.deliveryNumber = `DLV-${Date.now()}-${count + 1}`;
  }
  next();
});

// 인덱스
DeliverySchema.index({ project: 1, deliveryDate: 1 });
DeliverySchema.index({ project: 1, invoiced: 1 });
DeliverySchema.index({ partNo: 1 });
DeliverySchema.index({ palletNo: 1 });

export default mongoose.model<IDelivery>('Delivery', DeliverySchema);

