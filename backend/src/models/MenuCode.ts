import mongoose, { Document, Schema } from 'mongoose';

export interface IMenuCode extends Document {
  code: string; // 메뉴 코드 (예: '0010')
  name: string; // 메뉴 이름 (예: 'SALES 인보이스 관리')
  path: string; // 라우트 경로 (예: '/sales/invoices')
  section: string; // 섹션 (예: 'sales', 'accounting', 'purchase')
  description?: string; // 설명
  isActive: boolean;
  order: number; // 정렬 순서
  createdAt: Date;
  updatedAt: Date;
}

const MenuCodeSchema = new Schema<IMenuCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      enum: ['sales', 'accounting', 'purchase', 'operation', 'master-data', 'admin'],
      lowercase: true,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스
MenuCodeSchema.index({ code: 1 });
MenuCodeSchema.index({ section: 1, order: 1 });

export default mongoose.model<IMenuCode>('MenuCode', MenuCodeSchema);

