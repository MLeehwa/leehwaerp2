import mongoose, { Document, Schema } from 'mongoose'

export interface IContainerRelocation extends Document {
  containerNo?: string
  caseNumber: string
  fromLocation: string
  toLocation: string
  movedBy?: mongoose.Types.ObjectId
  movedAt: Date
  reason?: string
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ContainerRelocationSchema = new Schema<IContainerRelocation>(
  {
    containerNo: String,
    caseNumber: { type: String, required: true },
    fromLocation: { type: String, required: true },
    toLocation: { type: String, required: true },
    movedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    movedAt: { type: Date, default: Date.now },
    reason: String,
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IContainerRelocation>('ContainerRelocation', ContainerRelocationSchema)

