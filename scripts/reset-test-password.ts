import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('Error: MONGODB_URI not found in env');
    process.exit(1);
}

async function run() {
    await mongoose.connect(uri!);
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const hashedPassword = await bcrypt.hash('password123', 12);
    const updated = await User.findOneAndUpdate(
        { email: 'test123@yopmail.com' },
        { $set: { password: hashedPassword } },
        { new: true }
    );

    if (updated) {
        console.log('✅ Successfully updated password for test123@yopmail.com to "password123"');
    } else {
        console.log('❌ User test123@yopmail.com not found');
    }
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
