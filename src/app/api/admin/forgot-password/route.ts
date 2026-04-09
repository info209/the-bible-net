import { NextResponse } from 'next/server';
import { UserRepository } from '@/repositories/user/userRepository';
import { EmailService } from '@/utils/email/emailService';
import { forgotPasswordSchema } from '@/lib/validations/admin';
import crypto from 'crypto';
import { UserRole } from '@/types/user';

/**
 * @swagger
 * /api/admin/forgot-password:
 *   post:
 *     summary: Request a password reset link (Admin only)
 *     description: Sends a password reset email if the provided email belongs to an existing admin account. Always returns a generic success message to prevent user enumeration.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, description: The admin's email address }
 *     responses:
 *       200:
 *         description: Generic success message (even if user is not found)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: If an account exists, a reset link has been sent. }
 *       400:
 *         description: Invalid input or validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = forgotPasswordSchema.parse(body);

        const user = await UserRepository.findByEmail(email);

        // Security: Always return success even if user not found (prevent enumeration)
        if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        // Store hashed token with 15 mins expiry
        await UserRepository.update(user.id, {
            passwordResetTokenHash: resetTokenHash,
            passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
        } as any);

        // Send Email with reset link
        const resetLink = `${process.env.NEXTAUTH_URL}/admin/reset-password?token=${resetToken}`;
        await EmailService.sendPasswordReset(email, resetLink);

        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 400 });
    }
}
