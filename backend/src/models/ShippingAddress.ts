import mongoose, { Document, Schema } from 'mongoose';

export interface IShippingAddress extends Document {
    name: string;
    street: string;
    city: string;
    country: string;
    isDefault: boolean;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ShippingAddressSchema = new Schema<IShippingAddress>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        street: {
            type: String,
            required: true,
            trim: true,
        },
        city: {
            type: String,
            required: true,
            trim: true,
        },
        country: {
            type: String,
            required: true,
            trim: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model<IShippingAddress>('ShippingAddress', ShippingAddressSchema);
