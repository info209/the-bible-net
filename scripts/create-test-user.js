const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./src/models/User');
const { connectDB } = require('./src/lib/db');
require('dotenv').config();

async function createTestUser() {
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

    console.log('Test user created:', user.email);
    process.exit(0);
}

createTestUser().catch(err => {
    console.error(err);
    process.exit(1);
});
