import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('Error: MONGODB_URI not found in env');
    process.exit(1);
}

mongoose.connect(uri)
    .then(async () => {
        console.log('✅ Connected!');
        const DailyContent = mongoose.model('DailyContent', new mongoose.Schema({}, { strict: false }));
        const doc = await DailyContent.findById("6a1ae9cae67fca6a8223b4a3").lean();
        console.log(JSON.stringify(doc, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Failed:', err);
        process.exit(1);
    });
