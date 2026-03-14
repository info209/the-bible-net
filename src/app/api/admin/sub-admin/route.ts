import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user';
import { UserRepository } from '@/repositories/user/userRepository';
import { User } from '@/models/User';
import { subAdminSchema } from '@/lib/validations/admin';
import bcrypt from 'bcryptjs';
import { LoggingService } from '@/services/loggingService';

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
