import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

// Parse .env.local manually to ensure MONGODB_URI is loaded
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = (match[2] || '').trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[key] = value;
            }
        });
        console.log("Loaded .env.local environment variables.");
    } else {
        console.warn(".env.local file not found!");
    }
} catch (e: any) {
    console.error("Error reading .env.local:", e.message);
}

async function seedSuperAdmin() {
    const { connectDB } = await import('../src/lib/db');
    const { User } = await import('../src/models/User');
    const { UserRole } = await import('../src/types/user');

    console.log("Connecting to MongoDB production database...");
    const conn = await connectDB();
    console.log(`Connected to database: ${conn.name}`);

    const email = 'admin@biblenet.com';
    const plainPassword = 'AdminBibleNet@123##';
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    let user = await User.findOne({ email });

    if (user) {
        console.log(`Found existing user with email ${email}. Updating to Super Admin...`);
        user.password = hashedPassword;
        user.role = UserRole.SUPER_ADMIN;
        user.emailVerified = true;
        user.onboardingCompleted = true;
        user.isActive = true;
        user.firstName = user.firstName || 'Super';
        user.lastName = user.lastName || 'Admin';
        await user.save();
        console.log(`✅ Super Admin updated successfully for ${email}`);
    } else {
        console.log(`Creating new Super Admin user for ${email}...`);
        user = await User.create({
            firstName: 'Super',
            lastName: 'Admin',
            email: email,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            emailVerified: true,
            onboardingCompleted: true,
            isActive: true,
        });
        console.log(`✅ Super Admin created successfully with ID: ${user._id}`);
    }

    // Verify created/updated user
    const dbUser = await User.findOne({ email }).select('+password +role +isActive');
    console.log("Verification details:");
    console.log(`- ID: ${dbUser?._id}`);
    console.log(`- Email: ${dbUser?.email}`);
    console.log(`- Role: ${dbUser?.role}`);
    console.log(`- Active: ${dbUser?.isActive}`);
    console.log(`- Email Verified: ${dbUser?.emailVerified}`);
    console.log(`- Password Hashed: ${!!dbUser?.password}`);

    process.exit(0);
}

seedSuperAdmin().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
