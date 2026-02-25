import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/authService';
import User from '@/models/User';
import { z } from 'zod';

const verifySchema = z.object({
    identifier: z.string().trim(),
    code: z.string().length(6, 'OTP must be 6 digits'),
    type: z.enum(['email', 'phone']),
});

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify OTP
 *     description: Verify an email or phone number using the 6-digit OTP
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - code
 *               - type
 *             properties:
 *               identifier:
 *                 type: string
 *               code:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [email, phone]
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid OTP or expired
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { identifier, code, type } = verifySchema.parse(body);

        const isValid = await AuthService.verifyOTP(identifier, code, type);

        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired OTP' },
                { status: 400 }
            );
        }

        // Mark as verified in the User model
        const updateData: any = {};
        if (type === 'email') {
            updateData.emailVerified = new Date();
        } else {
            updateData.phoneVerified = new Date();
        }

        const user = await User.findOneAndUpdate(
            { [type === 'email' ? 'email' : 'phoneNumber']: identifier.toLowerCase() },
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: `${type === 'email' ? 'Email' : 'Phone number'} verified successfully`,
        });

    } catch (error: any) {
        if (error.name === 'ZodError') {
            return NextResponse.json(
                { success: false, error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        console.error('Verification error:', error);
        return NextResponse.json(
            { success: false, error: 'Verification failed', message: error.message },
            { status: 500 }
        );
    }
}
