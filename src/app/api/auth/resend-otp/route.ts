import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const resendOtpSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    email: z.string().email('Invalid email address'),
});

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend verification OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, email]
 *             properties:
 *               userId: { type: string }
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: OTP resent
 *       400:
 *         description: User not found
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, email } = resendOtpSchema.parse(body);

        await UserService.resendOTP(userId, email);

        return NextResponse.json({
            success: true,
            message: 'New verification code sent.',
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Resend OTP error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
