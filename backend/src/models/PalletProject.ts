import mongoose, { Document, Schema } from 'mongoose';

export interface IPalletProject extends Document {
  projectCode: string; // 프로젝트 코드 (고유)
  projectName: string; // 프로젝트명
  description?: string; // 설명
  customer?: mongoose.Types.ObjectId; // 고객
  company?: mongoose.Types.ObjectId; // 발행 법인
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'; // 상태
  manager?: mongoose.Types.ObjectId; // 담당자
  isActive: boolean; // 활성 여부
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const PalletProjectSchema = new Schema<IPalletProject>(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'on-hold', 'cancelled'],
      default: 'active',
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
PalletProjectSchema.index({ projectCode: 1 });
PalletProjectSchema.index({ status: 1 });
PalletProjectSchema.index({ isActive: 1 });

export default mongoose.model<IPalletProject>('PalletProject', PalletProjectSchema);

