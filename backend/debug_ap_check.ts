
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import AccountsPayable from './src/models/AccountsPayable';
import PurchaseOrder from './src/models/PurchaseOrder';
import Location from './src/models/Location';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const checkData = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Get recent POs (sent/confirmed)
        const recentPOs = await PurchaseOrder.find({ status: { $in: ['sent', 'confirmed', 'partial', 'received'] } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .populate('supplier');

        console.log('\n--- Recent POs ---');
        for (const po of recentPOs) {
            console.log(`PO: ${po.poNumber} | ID: ${po._id} | Status: ${po.status} | Supplier: ${po.supplier?._id} | LocationId: ${po.locationId}`);

            // Check for linked AP
            const ap = await AccountsPayable.findOne({ purchaseOrder: po._id });
            if (ap) {
                console.log(`  -> LINKED AP FOUND: ${ap.apNumber} | Status: ${ap.status} | LocationId: ${ap.locationId}`);
            } else {
                console.log(`  -> NO AP FOUND`);
            }
        }

        // 2. Count total APs
        const apCount = await AccountsPayable.countDocuments();
        console.log(`\nTotal AP Records: ${apCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkData();
