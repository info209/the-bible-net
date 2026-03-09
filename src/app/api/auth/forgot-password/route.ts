import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email } = forgotPasswordSchema.parse(body);

        await UserService.forgotPassword(email);

        return NextResponse.json({
            success: true,
            message: 'If an account exists with that email, a password reset link has been sent.',
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Forgot password error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
