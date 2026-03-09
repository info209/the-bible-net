import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const verifyOtpSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify email OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, otp]
 *             properties:
 *               userId: { type: string }
 *               otp: { type: string, minLength: 6, maxLength: 6 }
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid OTP
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, otp } = verifyOtpSchema.parse(body);

        const isValid = await UserService.verifyOTP(userId, otp);

        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully.',
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('OTP verification error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
