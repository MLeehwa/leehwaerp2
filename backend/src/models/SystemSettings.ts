
import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemSettings extends Document {
    country: string;
    language: string;
    currency: string;
    currencySymbol: string;
    timeZone: string;
    dateFormat: string; // e.g. 'YYYY-MM-DD'
    timeFormat: string; // e.g. 'HH:mm:ss'
    floatPrecision: number; // Default 2
    fiscalYearStart: Date;
    appName: string;
    owner: string; // Last updated by
    updatedAt: Date;
}

const SystemSettingsSchema: Schema = new Schema({
    country: { type: String, required: true, default: 'South Korea' },
    language: { type: String, required: true, default: 'ko' },
    currency: { type: String, required: true, default: 'KRW' },
    currencySymbol: { type: String, default: '₩' },
    timeZone: { type: String, required: true, default: 'Asia/Seoul' },
    dateFormat: { type: String, default: 'YYYY-MM-DD' },
    timeFormat: { type: String, default: 'HH:mm:ss' },
    floatPrecision: { type: Number, default: 0 }, // KRW usually has 0 precision
    fiscalYearStart: { type: Date },
    appName: { type: String, default: 'NexERP' },
    owner: { type: String }, // User ID or Name
}, {
    timestamps: true,
    capped: { size: 1024, max: 1 } // Singleton Pattern: Only allow 1 document
});

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
