
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.join(process.cwd(), '.env') });

const verifyData = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is missing in .env');
        }

        console.log('Connecting to MongoDB Atlas...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB Atlas');

        // Define simple schema to match existing data
        const companySchema = new mongoose.Schema({
            code: String,
            name: String,
            isActive: Boolean,
        }, { strict: false }); // strict: false allows reading all fields

        // Use existing collection 'companies' (Mongoose defaults plural lowercase)
        const Company = mongoose.model('Company', companySchema);

        const companies = await Company.find({}).sort({ _id: -1 }).limit(5); // Show last 5

        console.log('\n--- Recent Corporation Entries (Last 5) ---');
        if (companies.length === 0) {
            console.log('No companies found.');
        } else {
            console.table(companies.map(c => ({
                id: c._id.toString(),
                code: c.code,
                name: c.name,
                active: c.isActive
            })));
        }
        console.log('-------------------------------------------\n');

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
};

verifyData();
