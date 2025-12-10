import mongoose, { Document, Schema } from 'mongoose'

export interface IRackMaster extends Document {
  rackLocation: string
  zone?: string
  aisle?: string
  level?: number
  capacity: number
  currentQuantity: number
  status: 'active' | 'inactive' | 'maintenance'
  description?: string
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const RackMasterSchema = new Schema<IRackMaster>(
  {
    rackLocation: { type: String, required: true, unique: true, index: true },
    zone: String,
    aisle: String,
    level: Number,
    capacity: { type: Number, default: 0 },
    currentQuantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
    description: String,
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IRackMaster>('RackMaster', RackMasterSchema)

