import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  code: string; // 로케이션 코드
  name: string; // 로케이션명
  company: mongoose.Types.ObjectId; // 법인
  parentLocation?: mongoose.Types.ObjectId; // 상위 로케이션
  isGroup?: boolean; // 그룹 여부 (하위 로케이션 포함 여부)
  address?: string; // 주소
  description?: string; // 설명
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    // Hierarchy Support
    parentLocation: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
      default: null
    },
    isGroup: {
      type: Boolean,
      default: false // true if it contains other locations (e.g., A Zone)
    },
    address: String,
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
LocationSchema.index({ company: 1, code: 1 });
LocationSchema.index({ parentLocation: 1 });
LocationSchema.index({ isActive: 1 });

export default mongoose.model<ILocation>('Location', LocationSchema);

