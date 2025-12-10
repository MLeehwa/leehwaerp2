import mongoose, { Document, Schema } from 'mongoose'

export interface IWMSLocation extends Document {
  letter: string
  number: number
  capacity: number
  currentQuantity: number
  status: 'active' | 'inactive' | 'maintenance'
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const WMSLocationSchema = new Schema<IWMSLocation>(
  {
    letter: { type: String, required: true, index: true },
    number: { type: Number, required: true, index: true },
    capacity: { type: Number, default: 0 },
    currentQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

// 복합 인덱스 및 유니크 제약
WMSLocationSchema.index({ letter: 1, number: 1, projectId: 1 }, { unique: true })

export default mongoose.model<IWMSLocation>('WMSLocation', WMSLocationSchema)

