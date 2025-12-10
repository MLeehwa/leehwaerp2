import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
  name: string;
  description?: string;
  isSystem: boolean; // 시스템 기본 역할인지 여부 (삭제 불가)
  parentRole?: mongoose.Types.ObjectId; // 상위 역할 (상속용)
  permissions: mongoose.Types.ObjectId[]; // 권한 목록
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    parentRole: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    permissions: [{
      type: Schema.Types.ObjectId,
      ref: 'Permission',
    }],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IRole>('Role', RoleSchema);

