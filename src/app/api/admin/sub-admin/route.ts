import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user';
import { UserRepository } from '@/repositories/user/userRepository';
import { User } from '@/models/User';
import { subAdminSchema } from '@/lib/validations/admin';
import bcrypt from 'bcryptjs';
import { LoggingService } from '@/services/loggingService';

/**
 * @swagger
 * /api/admin/sub-admin:
 *   get:
 *     summary: List all sub-admins (Super Admin only)
 *     description: Retrieve a list of all users with the SUB_ADMIN role. Restricted to Super Admins.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of sub-admins retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 *       403:
 *         description: Forbidden - Super Admin access required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   post:
 *     summary: Create a new sub-admin (Super Admin only)
 *     description: Create a new account with the SUB_ADMIN role. Restricted to Super Admins.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       201:
 *         description: Sub-admin created successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Email already in use or validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Forbidden - Super Admin access required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET() {
    const session = await auth();
    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const subAdmins = await User.find({ role: UserRole.SUB_ADMIN }).select('-password');
        return NextResponse.json(subAdmins);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validatedData = subAdminSchema.parse(body);

        // Check if email already exists
        const existing = await UserRepository.findByEmail(validatedData.email);
        if (existing) {
            return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 12);

        const newSubAdmin = await UserRepository.create({
            ...validatedData,
            password: hashedPassword,
            role: UserRole.SUB_ADMIN,
            emailVerified: true, // Manual creation by Super Admin
        });

        await LoggingService.logAdminAction({
            adminId: session.user.id as string,
            action: 'CREATE_SUB_ADMIN',
            details: `Created sub-admin: ${newSubAdmin.email}`,
        });

        return NextResponse.json(newSubAdmin, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
