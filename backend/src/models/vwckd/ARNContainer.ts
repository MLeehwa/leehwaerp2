import mongoose, { Document, Schema } from 'mongoose'

export interface IARNContainer extends Document {
  containerNo: string
  arrivalDate?: Date
  status: 'active' | 'completed' | 'cancelled' | 'pending'
  projectId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const ARNContainerSchema = new Schema<IARNContainer>(
  {
    containerNo: { type: String, required: true, index: true },
    arrivalDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'pending'],
      default: 'pending',
    },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  },
  {
    timestamps: true,
  }
)

// 복합 인덱스: projectId와 containerNo 조합은 유니크
ARNContainerSchema.index({ projectId: 1, containerNo: 1 }, { unique: true })

export default mongoose.model<IARNContainer>('ARNContainer', ARNContainerSchema)

