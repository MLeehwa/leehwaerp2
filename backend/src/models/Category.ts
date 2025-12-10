import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  code: string;
  name: string;
  description?: string;
  type: 'purchase' | 'logistics' | 'expense' | 'other';
  parentCategory?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['purchase', 'logistics', 'expense', 'other'],
      default: 'purchase',
    },
    parentCategory: {
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

// 인덱스 추가
CategorySchema.index({ code: 1 });
CategorySchema.index({ type: 1 });
CategorySchema.index({ isActive: 1 });

export default mongoose.model<ICategory>('Category', CategorySchema);
