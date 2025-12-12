
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import AccountsPayable from './src/models/AccountsPayable';
import PurchaseOrder from './src/models/PurchaseOrder';
import Location from './src/models/Location';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const backfillAP = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is missing');
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // Find POs that should have APs but might not
        // Status: sent, confirmed, partial, received, paid
        const targetPOs = await PurchaseOrder.find({
            status: { $in: ['sent', 'confirmed', 'partial', 'received', 'paid'] }
        }).populate('supplier');

        console.log(`Found ${targetPOs.length} candidate POs.`);

        let createdCount = 0;
        let updatedCount = 0;

        for (const po of targetPOs) {
            // Check if AP exists
            const existingAP = await AccountsPayable.findOne({ purchaseOrder: po._id });

            if (!existingAP) {
                // CREATE MISSING AP
                console.log(`Creating missing AP for PO: ${po.poNumber}`);

                if (!po.supplier) {
                    console.warn(`  Skipping PO ${po.poNumber} - No Supplier linked`);
                    continue;
                }

                const dueDate = new Date(po.orderDate || new Date());
                dueDate.setDate(dueDate.getDate() + 30);

                let paymentMethod: any = po.paymentMethod;
                const validMethods = ['cash', 'bank_transfer', 'check', 'credit_card'];
                if (!paymentMethod || !validMethods.includes(paymentMethod)) {
                    paymentMethod = 'bank_transfer';
                }

                const isCreditCard = paymentMethod === 'credit_card';
                const paidAmount = isCreditCard ? po.total : 0;
                const remainingAmount = isCreditCard ? 0 : po.total;
                const status = isCreditCard ? 'paid' : 'pending';
                const paymentStatus = isCreditCard ? 'paid' : 'unpaid';

                const payments = isCreditCard ? [{
                    paymentDate: new Date(),
                    amount: po.total,
                    paymentMethod: 'credit_card',
                    referenceNumber: `CC-${po.poNumber}`,
                    notes: 'Credit Card Auto-Payment (Backfilled)',
                }] : [];

                // Ensure items total is robust
                const subtotal = po.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
                const tax = po.tax || 0;
                const discount = po.discount || 0;
                const total = po.total || (subtotal + tax - discount);

                const ap = new AccountsPayable({
                    purchaseOrder: po._id,
                    supplier: po.supplier._id, // Use _id explicitly
                    locationId: po.locationId, // CRITICAL FIX
                    subtotal: subtotal,
                    tax: tax,
                    discount: discount,
                    total: total,
                    paidAmount,
                    remainingAmount,
                    dueDate,
                    paymentTerms: po.paymentTerms || 'Net 30',
                    currency: po.currency || 'USD',
                    paymentMethod,
                    status,
                    paymentStatus,
                    createdBy: po.createdBy, // Use PO creator
                    payments,
                });

                try {
                    await ap.save();
                    console.log(`  -> Created AP: ${ap.apNumber}`);
                    createdCount++;
                } catch (err) {
                    console.error(`  -> Failed to create AP:`, err);
                }

            } else if (!existingAP.locationId && po.locationId) {
                // REPAIR EXISTING AP
                console.log(`Repairing AP ${existingAP.apNumber} - Adding LocationId: ${po.locationId}`);
                existingAP.locationId = po.locationId;
                await existingAP.save();
                updatedCount++;
            }
        }

        console.log(`\nDone! Created: ${createdCount}, Repaired: ${updatedCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

backfillAP();
