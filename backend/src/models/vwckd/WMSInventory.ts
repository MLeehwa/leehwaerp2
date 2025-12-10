import mongoose, { Document, Schema } from 'mongoose'

export interface IWMSInventory extends Document {
  caseNumber: string
  containerNo?: string
  locationLetter?: string
  locationNumber?: number
  quantity: number
  status: 'active' | 'shipped' | 'damaged'
  scannedBy?: mongoose.Types.ObjectId
  scannedAt?: Date
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const WMSInventorySchema = new Schema<IWMSInventory>(
  {
    caseNumber: { type: String, required: true, index: true },
    containerNo: { type: String, index: true },
    locationLetter: { type: String, index: true },
    locationNumber: { type: Number, index: true },
    quantity: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'shipped', 'damaged'],
      default: 'active',
    },
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    scannedAt: Date,
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

// 복합 인덱스
WMSInventorySchema.index({ locationLetter: 1, locationNumber: 1 })
WMSInventorySchema.index({ projectId: 1, caseNumber: 1 })

export default mongoose.model<IWMSInventory>('WMSInventory', WMSInventorySchema)

