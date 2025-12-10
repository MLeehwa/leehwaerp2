
import mongoose, { Schema, Document } from 'mongoose';

export interface IStockLedgerEntry extends Document {
    item: mongoose.Types.ObjectId;
    warehouse: mongoose.Types.ObjectId; // Location

    postingDate: Date;
    postingTime: string;

    actualQty: number; // Quantity change (+ or -)
    qtyAfterTransaction: number; // Running balance

    incomingRate: number; // Basic rate per unit
    valuationRate: number; // Moving Average Rate
    stockValue: number; // Total value in this warehouse

    voucherType: string; // e.g., 'Purchase Receipt', 'Delivery Note'
    voucherNo: string; // Document ID

    batchNo?: string;
    serialNo?: string;

    company: mongoose.Types.ObjectId;
    owner: string;
    createdAt: Date;
}

const StockLedgerEntrySchema: Schema = new Schema({
    item: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouse: { type: Schema.Types.ObjectId, ref: 'Location', required: true },

    postingDate: { type: Date, required: true },
    postingTime: { type: String },

    actualQty: { type: Number, required: true },
    qtyAfterTransaction: { type: Number },

    incomingRate: { type: Number, default: 0 },
    valuationRate: { type: Number, default: 0 },
    stockValue: { type: Number, default: 0 },

    voucherType: { type: String, required: true },
    voucherNo: { type: String, required: true },

    batchNo: { type: String },
    serialNo: { type: String },

    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    owner: { type: String },
}, {
    timestamps: true
});

// Indices for fast ledger aggregation
StockLedgerEntrySchema.index({ item: 1, warehouse: 1, postingDate: 1 });
StockLedgerEntrySchema.index({ voucherNo: 1, voucherType: 1 });

export default mongoose.model<IStockLedgerEntry>('StockLedgerEntry', StockLedgerEntrySchema);
