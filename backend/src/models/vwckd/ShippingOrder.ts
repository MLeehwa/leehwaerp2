import mongoose, { Document, Schema } from 'mongoose'

export interface IShippingOrder extends Document {
  orderNumber: string
  customerName?: string
  shippingDate?: Date
  status: 'pending' | 'preparing' | 'shipped' | 'completed'
  createdBy?: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const ShippingOrderSchema = new Schema<IShippingOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerName: String,
    shippingDate: Date,
    status: {
      type: String,
      enum: ['pending', 'preparing', 'shipped', 'completed'],
      default: 'pending',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    notes: String,
  },
  {
    timestamps: true,
  }
)

export default mongoose.model<IShippingOrder>('ShippingOrder', ShippingOrderSchema)

