import mongoose, { Document, Schema } from 'mongoose'

export interface IMaintenanceSchedule extends Document {
  scheduleNumber: string
  equipment: mongoose.Types.ObjectId
  scheduleType: 'repair' | 'maintenance' // 수리, 점검
  title?: string // 제목은 선택사항 (deprecated, description 사용)
  description: string // 설명은 필수
  scheduledDate: Date
  dueDate: Date
  frequency?: number // days, weeks, months
  frequencyUnit?: 'days' | 'weeks' | 'months'
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'overdue'
  assignedTo?: mongoose.Types.ObjectId
  estimatedDuration?: number // minutes
  actualDuration?: number // minutes
  startedDate?: Date
  completedDate?: Date
  completedBy?: mongoose.Types.ObjectId
  laborCost?: number
  materialCost?: number
  totalCost?: number
  currency?: string // 통화 (USD, KRW, MXN 등)
  supplier?: mongoose.Types.ObjectId // 수리 업체 (Supplier 참조)
  invoiceNumber?: string // 인보이스 번호
  paymentMethod?: string // 결제 방법 (bank_transfer, check, cash, credit_card 등)
  paymentDueDate?: Date // 결제 예정일
  paymentStatus?: 'pending' | 'paid' | 'partial' // 결제 상태
  paymentNotes?: string // 결제 관련 비고
  attachments?: Array<{
    fileName: string
    filePath?: string // MongoDB 저장 시 선택사항
    fileSize?: number
    uploadedAt: Date
  }>
  notes?: string
  checklist?: Array<{
    item: string
    completed: boolean
    notes?: string
  }>
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const MaintenanceScheduleSchema = new Schema<IMaintenanceSchedule>(
  {
    scheduleNumber: { type: String, required: true, unique: true, index: true },
    equipment: { type: Schema.Types.ObjectId, ref: 'MaintenanceEquipment', required: true, index: true },
    scheduleType: {
      type: String,
      enum: ['repair', 'maintenance'], // 수리, 점검
      required: true,
      index: true,
    },
    title: { type: String, required: false }, // 제목은 선택사항으로 변경
    description: { type: String, required: true }, // 설명은 필수로 변경
    scheduledDate: { type: Date, required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    frequency: Number,
    frequencyUnit: {
      type: String,
      enum: ['days', 'weeks', 'months'],
      default: 'months',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled',
      index: true,
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    estimatedDuration: Number,
    actualDuration: Number,
    startedDate: Date,
    completedDate: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    laborCost: Number,
    materialCost: Number,
    totalCost: Number,
    currency: String, // 통화 (USD, KRW, MXN 등)
    supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' }, // 수리 업체
    invoiceNumber: String, // 인보이스 번호
    paymentMethod: String, // 결제 방법
    paymentDueDate: Date, // 결제 예정일
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'partial'],
      default: 'pending',
    },
    paymentNotes: String, // 결제 관련 비고
    attachments: [
      {
        fileName: String,
        filePath: { type: String, required: false }, // MongoDB 저장 시 선택사항
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
    checklist: [
      {
        item: String,
        completed: { type: Boolean, default: false },
        notes: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
)

// 인덱스
MaintenanceScheduleSchema.index({ equipment: 1, scheduledDate: 1 })
MaintenanceScheduleSchema.index({ status: 1, dueDate: 1 })
MaintenanceScheduleSchema.index({ assignedTo: 1 })

export default mongoose.model<IMaintenanceSchedule>('MaintenanceSchedule', MaintenanceScheduleSchema)

