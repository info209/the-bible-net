import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { UserRepository } from '@/repositories/user/userRepository';
import { z } from 'zod';

const profileUpdateSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(1, 'Last name is required'),
    country: z.enum(['New Zealand', 'United States', 'United Kingdom', 'India', 'Australia', 'Canada']),
    preferredLanguage: z.enum(['English', 'Spanish', 'French', 'Hindi', 'Telugu']),
    preferredBibleVersion: z.enum(['NKJV', 'KJV', 'NIV', 'ESV']),
    onboardingCompleted: z.boolean().optional(),
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
        const userObj = user.toObject ? user.toObject() : user;
        const { password, passwordResetTokenHash, passwordResetExpires, ...safeUser } = userObj;

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
        console.log(`[Profile Update] User ID: ${session.user.id}`, body);
        
        // Use partial for general updates if needed, but for setup we want full validation
        // The user request specified these fields are required now
        const validatedData = profileUpdateSchema.parse(body);

        const updatedUser = await UserRepository.update(session.user.id, validatedData);
        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.issues[0].message, errors: error.issues }, { status: 400 });
        }
        console.error('Profile update error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
