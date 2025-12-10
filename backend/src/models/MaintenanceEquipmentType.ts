import mongoose, { Document, Schema } from 'mongoose'

export interface IMaintenanceEquipmentType extends Document {
  category: string // 대분류: 자산(컴퓨터, 차량), 설비(지게차, 리프트), 기타
  subCategory: string // 소분류: 노트북, 데스크톱, 승용차, 화물차, 지게차, 리프트, 스커러버 등
  description?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const MaintenanceEquipmentTypeSchema = new Schema<IMaintenanceEquipmentType>(
  {
    category: { type: String, required: true, index: true },
    subCategory: { type: String, required: true },
    description: String,
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
)

// 대분류와 소분류 조합은 유일해야 함
MaintenanceEquipmentTypeSchema.index({ category: 1, subCategory: 1 }, { unique: true })

export default mongoose.model<IMaintenanceEquipmentType>('MaintenanceEquipmentType', MaintenanceEquipmentTypeSchema)

