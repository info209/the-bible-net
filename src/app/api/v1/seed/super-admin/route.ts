import { NextRequest, NextResponse } from 'next/server';
import { User, UserRole } from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/v1/seed/super-admin:
 *   post:
 *     summary: Bootstrap initial SuperAdmin account
 *     description: Only runs if NO super admin exists.
 *     tags: [Utility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Already bootstrapped
 */
export async function POST(req: NextRequest) {
    try {
        const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });
        if (existingSuperAdmin) {
            return NextResponse.json({ success: false, error: 'Super Admin already exists.' }, { status: 400 });
        }

        const { email, password, firstName, lastName } = await req.json();

        if (!email || !password || !firstName || !lastName) {
            return NextResponse.json({ success: false, error: 'Missing required fields (email, password, firstName, lastName).' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const superAdmin = await User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: UserRole.SUPER_ADMIN,
            emailVerified: true,
            onboardingCompleted: true,
        });

        return NextResponse.json({
            success: true,
            message: 'Super Admin seeded successfully.',
            data: { id: superAdmin._id, email: superAdmin.email }
        });
    } catch (error: any) {
        console.error('Seeding error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
