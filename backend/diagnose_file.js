
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const poSchema = new mongoose.Schema({
    poNumber: String,
    status: String,
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
}, { strict: false });

const apSchema = new mongoose.Schema({
    apNumber: String,
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
}, { strict: false });

const PurchaseOrder = mongoose.model('PurchaseOrder', poSchema);
const AccountsPayable = mongoose.model('AccountsPayable', apSchema);

async function run() {
    let log = '';
    const print = (msg) => { console.log(msg); log += msg + '\n'; };

    try {
        print('--- DIAGNOSTIC START ---');
        await mongoose.connect(process.env.MONGODB_URI);
        print('DB Connected');

        const poCount = await PurchaseOrder.countDocuments();
        const apCount = await AccountsPayable.countDocuments();
        print(`Total POs: ${poCount}`);
        print(`Total APs: ${apCount}`);

        const sentPOs = await PurchaseOrder.find({ status: { $in: ['sent', 'confirmed', 'received'] } }).sort({ _id: -1 }).limit(10);

        for (const po of sentPOs) {
            const ap = await AccountsPayable.findOne({ purchaseOrder: po._id });
            const status = ap ? `AP Found (${ap.apNumber})` : 'MISSING';
            const locStatus = ap && !ap.locationId ? 'ZOMBIE (No Loc)' : (ap ? 'OK' : 'N/A');
            print(`PO: ${po.poNumber} | PO Loc: ${po.locationId} | AP: ${status} | AP Status: ${locStatus}`);
        }

        fs.writeFileSync('diag_output.txt', log);
        process.exit(0);
    } catch (e) {
        print(`ERROR: ${e.message}`);
        fs.writeFileSync('diag_output.txt', log);
        process.exit(1);
    }
}
run();
