import mongoose, { Document, Schema } from 'mongoose';

export interface IResource extends Document {
  name: string; // 예: '구매요청', '발주관리'
  path: string; // 예: '/purchase-requests', '/purchase-orders'
  type: 'menu' | 'page' | 'api' | 'action'; // 리소스 타입
  icon?: string; // 아이콘
  parent?: mongoose.Types.ObjectId; // 상위 리소스 (트리 구조)
  order: number; // 정렬 순서
  permissions: mongoose.Types.ObjectId[]; // 연결된 권한 목록
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['menu', 'page', 'api', 'action'],
      required: true,
    },
    icon: {
      type: String,
      trim: true,
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 트리 구조를 위한 인덱스
ResourceSchema.index({ parent: 1, order: 1 });

export default mongoose.model<IResource>('Resource', ResourceSchema);

