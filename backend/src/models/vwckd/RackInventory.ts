import mongoose, { Document, Schema } from 'mongoose'

export interface IRackInventory extends Document {
  rackLocation: string
  caseNumber?: string
  quantity: number
  assignedBy?: mongoose.Types.ObjectId
  assignedAt: Date
  status: 'active' | 'empty' | 'reserved'
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const RackInventorySchema = new Schema<IRackInventory>(
  {
    rackLocation: { type: String, required: true, unique: true, index: true },
    caseNumber: String,
    quantity: { type: Number, default: 0 },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['active', 'empty', 'reserved'],
      default: 'active',
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IRackInventory>('RackInventory', RackInventorySchema)

