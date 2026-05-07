import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Use require for DB to ensure it loads AFTER dotenv
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    console.log('Starting test user creation...');
    try {
        const { connectDB } = require('../src/lib/db');
        const { User } = require('../src/models/User');

        await connectDB();
        const email = 'test@example.com';
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 12);

        await User.deleteOne({ email });
        const user = await User.create({
            email,
            password: hashedPassword,
            firstName: 'Test',
            lastName: 'User',
            role: 'USER',
            emailVerified: true,
            onboardingCompleted: true,
            isActive: true
        });

        console.log('✅ Test user created:', user.email);
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

createTestUser();
