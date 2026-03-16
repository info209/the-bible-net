import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { UserRole } from './src/types/user';
import { User } from './src/models/User';

async function run() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const user = await User.findOne({ email: 'testuser1@yopmail.com' });
    console.log('user.role:', user?.role);
    console.log('typeof user.role:', typeof user?.role);
    console.log('UserRole.USER:', UserRole.USER);
    console.log('typeof UserRole.USER:', typeof UserRole.USER);
    console.log('Is match:', user?.role === UserRole.USER);
    console.log('Is not match:', user?.role !== UserRole.USER);
    await mongoose.disconnect();
}
run();
