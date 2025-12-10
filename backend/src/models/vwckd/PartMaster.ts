import mongoose, { Document, Schema } from 'mongoose'

export interface IPartMaster extends Document {
  partNumber: string
  partName: string
  description?: string
  unit?: string
  supplier?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const PartMasterSchema = new Schema<IPartMaster>(
  {
    partNumber: { type: String, required: true, unique: true, index: true },
    partName: { type: String, required: true },
    description: String,
    unit: String,
    supplier: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IPartMaster>('PartMaster', PartMasterSchema)

