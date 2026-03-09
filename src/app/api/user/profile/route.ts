import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { UserRepository } from '@/repositories/user/userRepository';
import { z } from 'zod';

const profileUpdateSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    country: z.string().optional(),
    preferredLanguage: z.string().optional(),
    preferredBibleVersion: z.string().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const user = await UserRepository.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Remove sensitive fields
        const { password, passwordResetTokenHash, passwordResetExpires, ...safeUser } = user.toObject();

        return NextResponse.json({
            success: true,
            data: safeUser,
        });
    } catch (error: any) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = profileUpdateSchema.parse(body);

        const updatedUser = await UserRepository.update(session.user.id, validatedData);
        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Profile update error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
