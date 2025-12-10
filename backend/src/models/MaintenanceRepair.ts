import mongoose, { Document, Schema } from 'mongoose'

export interface IMaintenanceRepair extends Document {
  repairNumber: string
  equipment: mongoose.Types.ObjectId
  repairDate: Date
  repairType: 'repair' | 'maintenance' | 'inspection' // 수리, 점검, 일상점검
  reportedBy?: mongoose.Types.ObjectId
  performedBy?: mongoose.Types.ObjectId
  description: string
  issue?: string // 문제점
  workPerformed?: string // 수행 작업
  partsUsed?: Array<{
    partName: string
    partNumber?: string
    quantity: number
    unitCost?: number
    totalCost?: number
  }>
  operatingHours?: number // 사용 시간 (지게차 등)
  laborCost?: number
  materialCost?: number
  totalCost?: number
  status: 'reported' | 'in-progress' | 'completed' | 'cancelled'
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

const MaintenanceRepairSchema = new Schema<IMaintenanceRepair>(
  {
    repairNumber: { type: String, required: true, unique: true, index: true },
    equipment: { type: Schema.Types.ObjectId, ref: 'MaintenanceEquipment', required: true, index: true },
    repairDate: { type: Date, required: true, index: true },
    repairType: {
      type: String,
      enum: ['repair', 'maintenance', 'inspection'],
      required: true,
      index: true,
    },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    description: { type: String, required: true },
    issue: String,
    workPerformed: String,
    operatingHours: Number, // 사용 시간 (지게차 등)
    partsUsed: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        unitCost: Number,
        totalCost: Number,
      },
    ],
    laborCost: Number,
    materialCost: Number,
    totalCost: Number,
    status: {
      type: String,
      enum: ['reported', 'in-progress', 'completed', 'cancelled'],
      default: 'reported', // 고장 등록 시 기본값
      index: true,
    },
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
MaintenanceRepairSchema.index({ equipment: 1, repairDate: -1 })
MaintenanceRepairSchema.index({ repairType: 1, repairDate: -1 })
MaintenanceRepairSchema.index({ status: 1 })

// 수리 번호 자동 생성
MaintenanceRepairSchema.pre('validate', async function (next) {
  try {
    if (!this.repairNumber) {
      // MongoDB 연결 확인
      if (mongoose.connection.readyState !== 1) {
        console.warn('MongoDB not connected, skipping repairNumber generation')
        return next()
      }

      const year = new Date().getFullYear()
      const MaintenanceRepairModel = mongoose.models.MaintenanceRepair
      if (!MaintenanceRepairModel) {
        console.warn('MaintenanceRepair model not found, skipping repairNumber generation')
        return next()
      }

      const count = await MaintenanceRepairModel.countDocuments({
        repairNumber: { $regex: `^REP-${year}-` }
      })
      this.repairNumber = `REP-${year}-${String(count + 1).padStart(6, '0')}`
    }
    next()
  } catch (error: any) {
    console.error('Error in pre-validate hook:', error)
    next()
  }
})

export default mongoose.model<IMaintenanceRepair>('MaintenanceRepair', MaintenanceRepairSchema)

