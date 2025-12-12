
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const poSchema = new mongoose.Schema({
    poNumber: String,
    status: String,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    total: Number,
    orderDate: Date,
    paymentMethod: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { strict: false });

const apSchema = new mongoose.Schema({
    apNumber: String,
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    status: String,
    paymentStatus: String,
    total: Number,
}, { strict: false });

const PurchaseOrder = mongoose.model('PurchaseOrder', poSchema);
const AccountsPayable = mongoose.model('AccountsPayable', apSchema);

async function run() {
    try {
        console.log('--- DIAGNOSTIC START ---');
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI missing');
        console.log(`URI Prefix: ${uri.substring(0, 20)}...`); // Safe print

        await mongoose.connect(uri);
        console.log('DB Connected.');

        // 1. Check Stats
        const poCount = await PurchaseOrder.countDocuments();
        const apCount = await AccountsPayable.countDocuments();
        console.log(`Total POs: ${poCount}`);
        console.log(`Total APs: ${apCount}`);

        // 2. Check Recent POs (Approved)
        const sentPOs = await PurchaseOrder.find({ status: 'sent' }).sort({ _id: -1 }).limit(5);
        console.log(`\nLast 5 'sent' POs:`);
        for (const po of sentPOs) {
            const ap = await AccountsPayable.findOne({ purchaseOrder: po._id });
            const hasLocation = !!po.locationId;
            const apStatus = ap ? `FOUND (${ap.apNumber}, Loc: ${ap.locationId})` : 'MISSING';
            console.log(`- PO: ${po.poNumber} | Loc: ${po.locationId} | AP: ${apStatus}`);
        }

        // 3. Scan for "Zombie" APs (Missing LocationId)
        const zombieAPs = await AccountsPayable.find({ locationId: { $exists: false } }).limit(5);
        console.log(`\nAPs without LocationId (First 5): ${zombieAPs.length}`);
        zombieAPs.forEach(ap => console.log(`- AP: ${ap.apNumber} | PO: ${ap.purchaseOrder}`));

        console.log('--- DIAGNOSTIC END ---');
        process.exit(0);
    } catch (e) {
        console.error('DIAGNOSTIC ERROR:', e);
        process.exit(1);
    }
}

run();
