import mongoose, { Document, Schema } from 'mongoose'

export interface IShippingOrderCase extends Document {
  shippingOrder: mongoose.Types.ObjectId
  caseNumber: string
  quantity: number
  locationLetter?: string
  locationNumber?: number
  status: 'pending' | 'picked' | 'packed' | 'shipped'
  pickedBy?: mongoose.Types.ObjectId
  pickedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ShippingOrderCaseSchema = new Schema<IShippingOrderCase>(
  {
    shippingOrder: {
      type: Schema.Types.ObjectId,
      ref: 'ShippingOrder',
      required: true,
      index: true,
    },
    caseNumber: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    locationLetter: String,
    locationNumber: Number,
    status: {
      type: String,
      enum: ['pending', 'picked', 'packed', 'shipped'],
      default: 'pending',
    },
    pickedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pickedAt: Date,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IShippingOrderCase>('ShippingOrderCase', ShippingOrderCaseSchema)

