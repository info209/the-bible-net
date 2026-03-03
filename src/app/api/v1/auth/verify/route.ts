import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const verifySchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

/**
 * @swagger
 * /api/v1/auth/verify:
 *   post:
 *     summary: Verify OTP and activate account
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
 *         description: Account verified successfully
 *       400:
 *         description: Invalid code
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, otp } = verifySchema.parse(body);

        const isVerified = await UserService.verifyOTP(userId, otp);

        if (!isVerified) {
            return NextResponse.json({ success: false, error: 'Invalid or incorrect code.' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully. You can now login.',
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('OTP Verification error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
