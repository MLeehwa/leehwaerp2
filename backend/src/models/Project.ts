import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
  projectCode: string; // VW-CKD, VW-TM, KMX, BSA, MOBIS 등
  projectName: string;
  customer: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId; // 발행 법인
  description?: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  poNumber: string; // Purchase Order 번호 (자동 생성)
  paymentTerm?: string; // Payment Term (예: Net 30, Net 60 등)
  contractValue?: number;
  currency: string; // USD, KRW, MXN 등
  invoiceCategory?: mongoose.Types.ObjectId; // Invoice 카테고리
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    description: String,
    status: {
      type: String,
      enum: ['active', 'completed', 'on-hold', 'cancelled'],
      default: 'active',
    },
    poNumber: {
      type: String,
      required: true,
    },
    paymentTerm: String,
    contractValue: Number,
    currency: {
      type: String,
      default: 'USD',
    },
    invoiceCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
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

// 프로젝트 코드 자동 생성
ProjectSchema.pre('save', async function (next) {
  if (!this.projectCode) {
    const count = await mongoose.model('Project').countDocuments();
    this.projectCode = `PROJ-${Date.now()}-${count + 1}`;
  }
  next();
});

export default mongoose.model<IProject>('Project', ProjectSchema);

