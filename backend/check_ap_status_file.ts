
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import AccountsPayable from './src/models/AccountsPayable';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        const count = await AccountsPayable.countDocuments();
        const items = await AccountsPayable.find({}, 'apNumber locationId status purchaseOrder supplier').limit(10);

        let output = `Total APs: ${count}\n`;
        output += items.map(i => JSON.stringify(i)).join('\n');

        fs.writeFileSync('check_results.txt', output);
        console.log('Done writing');
        process.exit(0);
    } catch (e) {
        fs.writeFileSync('check_results.txt', `Error: ${e}`);
        process.exit(1);
    }
};
run();
