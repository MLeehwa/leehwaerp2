
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import AccountsPayable from './src/models/AccountsPayable';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const check = async () => {
    try {
        if (!process.env.MONGODB_URI) throw new Error('No URI');
        await mongoose.connect(process.env.MONGODB_URI);

        const count = await AccountsPayable.countDocuments();
        const all = await AccountsPayable.find({}, 'apNumber locationId status purchaseOrder');

        console.log(`Total APs: ${count}`);
        all.forEach(ap => console.log(`- ${ap.apNumber} | Loc: ${ap.locationId} | Status: ${ap.status}`));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
check();
