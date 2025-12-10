import mongoose, { Document, Schema } from 'mongoose'

export interface IARN extends Document {
  arnNumber?: string
  containerNo: string
  caseNumber: string
  partName?: string
  quantity: number
  uploadDate?: Date
  uploadedBy?: mongoose.Types.ObjectId
  uploadedAt: Date
  status: 'pending' | 'processed' | 'completed'
  arrivalDate?: Date
  projectId?: mongoose.Types.ObjectId
  hasRisk?: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ARNSchema = new Schema<IARN>(
  {
    arnNumber: { type: String, index: true },
    containerNo: { type: String, required: true, index: true },
    caseNumber: { type: String, required: true, index: true },
    partName: String,
    quantity: { type: Number, default: 0 },
    uploadDate: Date,
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'processed', 'completed'],
      default: 'pending',
    },
    arrivalDate: Date,
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    hasRisk: { type: Boolean, default: false },
    notes: String,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IARN>('ARN', ARNSchema)

