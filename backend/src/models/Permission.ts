import mongoose, { Document, Schema } from 'mongoose';

export interface IPermission extends Document {
  code: string; // 예: 'purchase.request.read', 'purchase.request.create'
  name: string; // 예: '구매요청 조회', '구매요청 생성'
  description?: string;
  category: string; // 예: 'purchase', 'sales', 'accounting'
  resource?: mongoose.Types.ObjectId; // 연결된 리소스 (메뉴/페이지)
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resource: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPermission>('Permission', PermissionSchema);

