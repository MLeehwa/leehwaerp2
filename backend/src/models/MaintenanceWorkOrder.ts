import mongoose, { Document, Schema } from 'mongoose'

export interface IMaintenanceWorkOrder extends Document {
  workOrderNumber: string
  equipment: mongoose.Types.ObjectId
  schedule?: mongoose.Types.ObjectId // 연결된 정기 점검 일정
  workOrderType: 'preventive' | 'corrective' | 'emergency' | 'inspection'
  title: string
  description?: string
  reportedBy?: mongoose.Types.ObjectId
  reportedDate?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'requested' | 'assigned' | 'in-progress' | 'completed' | 'cancelled' | 'on-hold'
  assignedTo?: mongoose.Types.ObjectId
  assignedDate?: Date
  startedDate?: Date
  completedDate?: Date
  completedBy?: mongoose.Types.ObjectId
  estimatedDuration?: number // minutes
  actualDuration?: number // minutes
  laborCost?: number
  materialCost?: number
  totalCost?: number
  partsUsed?: Array<{
    partName: string
    partNumber?: string
    quantity: number
    unitCost?: number
    totalCost?: number
  }>
  workPerformed?: string
  rootCause?: string
  resolution?: string
  notes?: string
  attachments?: Array<{
    fileName: string
    filePath: string
    uploadedAt: Date
  }>
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const MaintenanceWorkOrderSchema = new Schema<IMaintenanceWorkOrder>(
  {
    workOrderNumber: { type: String, required: true, unique: true },
    equipment: { type: Schema.Types.ObjectId, ref: 'MaintenanceEquipment', required: true, index: true },
    schedule: { type: Schema.Types.ObjectId, ref: 'MaintenanceSchedule', index: true },
    workOrderType: {
      type: String,
      enum: ['preventive', 'corrective', 'emergency', 'inspection'],
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: String,
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedDate: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['requested', 'assigned', 'in-progress', 'completed', 'cancelled', 'on-hold'],
      default: 'requested',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    assignedDate: Date,
    startedDate: Date,
    completedDate: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    estimatedDuration: Number,
    actualDuration: Number,
    laborCost: Number,
    materialCost: Number,
    totalCost: Number,
    partsUsed: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        unitCost: Number,
        totalCost: Number,
      },
    ],
    workPerformed: String,
    rootCause: String,
    resolution: String,
    notes: String,
    attachments: [
      {
        fileName: String,
        filePath: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
)

// 인덱스
MaintenanceWorkOrderSchema.index({ equipment: 1, status: 1 })
MaintenanceWorkOrderSchema.index({ status: 1, priority: 1 })
MaintenanceWorkOrderSchema.index({ assignedTo: 1, status: 1 })
// workOrderNumber는 unique: true로 이미 인덱스가 생성되므로 별도 인덱스 불필요

export default mongoose.model<IMaintenanceWorkOrder>('MaintenanceWorkOrder', MaintenanceWorkOrderSchema)

