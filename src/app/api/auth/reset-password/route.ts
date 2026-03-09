import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token, password } = resetPasswordSchema.parse(body);

        await UserService.resetPassword(token, password);

        return NextResponse.json({
            success: true,
            message: 'Password updated successfully.',
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Reset password error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
