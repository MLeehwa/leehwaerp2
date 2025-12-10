import mongoose, { Document, Schema } from 'mongoose'

export interface IMaintenanceEquipment extends Document {
  equipmentCode: string
  equipmentName: string
  assetType: 'asset' | 'equipment' // 자산 vs 설비 구분
  company?: mongoose.Types.ObjectId // 법인
  managedBy: 'hr' | 'operation' | 'admin' // 관리 주체
  category: string // 대분류: 자산(컴퓨터, 차량), 설비(지게차, 리프트), 기타
  subCategory: string // 소분류: 노트북, 데스크톱, 승용차, 화물차, 전기지게차, 디젤지게차 등
  equipmentType?: string // 기존 호환성 유지 (deprecated)
  manufacturer?: string
  equipmentModel?: string // model은 Document의 메서드와 충돌하므로 equipmentModel로 변경
  serialNumber?: string
  alias?: string // 별칭/명칭 (예: alabama)
  location?: string
  installationDate?: Date
  purchaseDate?: Date
  purchaseCost?: number
  warrantyExpiryDate?: Date
  status: 'active' | 'inactive' | 'maintenance' | 'retired'
  description?: string
  specifications?: Record<string, any>
  maintenanceRequired: boolean // 점검 필요 여부
  lastMaintenanceDate?: Date
  nextMaintenanceDate?: Date
  maintenanceInterval?: number // days
  maintenanceIntervalUnit?: 'days' | 'weeks' | 'months'
  createdBy?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const MaintenanceEquipmentSchema = new Schema<IMaintenanceEquipment>(
  {
    equipmentCode: { type: String, required: false, unique: true },
    equipmentName: { type: String, required: true },
    assetType: {
      type: String,
      enum: ['asset', 'equipment'],
      default: 'equipment',
      required: true,
    },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    managedBy: {
      type: String,
      enum: ['hr', 'operation', 'admin'],
      default: 'hr',
      required: true,
    },
    category: { type: String, required: true }, // 대분류
    subCategory: { type: String, required: true }, // 소분류
    equipmentType: String, // 기존 호환성 유지 (deprecated)
    manufacturer: String,
    equipmentModel: String, // model은 Document의 메서드와 충돌하므로 equipmentModel로 변경
    serialNumber: String,
    alias: String, // 별칭/명칭 (예: alabama)
    location: String,
    installationDate: Date,
    purchaseDate: Date,
    purchaseCost: Number,
    warrantyExpiryDate: Date,
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'retired'],
      default: 'active',
    },
    description: String,
    specifications: { type: Schema.Types.Mixed },
    maintenanceRequired: {
      type: Boolean,
      default: false,
    },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    maintenanceInterval: Number,
    maintenanceIntervalUnit: {
      type: String,
      enum: ['days', 'weeks', 'months'],
      default: 'months',
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  }
)

// 인덱스
MaintenanceEquipmentSchema.index({ equipmentCode: 1 })
MaintenanceEquipmentSchema.index({ status: 1 })
MaintenanceEquipmentSchema.index({ nextMaintenanceDate: 1 })
MaintenanceEquipmentSchema.index({ category: 1, subCategory: 1 })
MaintenanceEquipmentSchema.index({ company: 1 })
MaintenanceEquipmentSchema.index({ managedBy: 1 })
MaintenanceEquipmentSchema.index({ assetType: 1 })
MaintenanceEquipmentSchema.index({ maintenanceRequired: 1 })

// 자산/설비 코드 자동 생성 (validation 전에 실행되도록 'validate' 훅 사용)
MaintenanceEquipmentSchema.pre('validate', async function (next) {
  try {
    // equipmentCode가 없으면 자동 생성
    if (!this.equipmentCode) {
      // MongoDB 연결 확인
      if (mongoose.connection.readyState !== 1) {
        console.warn('MongoDB not connected, skipping equipmentCode generation')
        return next()
      }

      const year = new Date().getFullYear()
      const prefix = this.assetType === 'asset' ? 'AS' : 'EQ'
      
      // mongoose.models를 통해 모델 참조 (순환 참조 방지)
      const MaintenanceEquipmentModel = mongoose.models.MaintenanceEquipment
      if (!MaintenanceEquipmentModel) {
        console.warn('MaintenanceEquipment model not found, skipping equipmentCode generation')
        return next()
      }
      
      // Race condition 방지를 위해 루프로 중복 체크
      let count = await MaintenanceEquipmentModel.countDocuments({
        equipmentCode: { $regex: `^${prefix}-${year}-` }
      })
      
      let newCode = `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`
      let attempts = 0
      const maxAttempts = 10
      
      // 중복 체크 (race condition 방지)
      while (attempts < maxAttempts) {
        const existing = await MaintenanceEquipmentModel.findOne({ equipmentCode: newCode })
        if (!existing) {
          break
        }
        count++
        newCode = `${prefix}-${year}-${String(count + 1).padStart(6, '0')}`
        attempts++
      }
      
      this.equipmentCode = newCode
      console.log(`Auto-generated equipmentCode: ${newCode}`)
    }
    next()
  } catch (error: any) {
    console.error('Error in pre-validate hook:', error)
    // 에러가 발생해도 계속 진행 (equipmentCode는 나중에 수동으로 설정 가능)
    next()
  }
})

export default mongoose.model<IMaintenanceEquipment>('MaintenanceEquipment', MaintenanceEquipmentSchema)

