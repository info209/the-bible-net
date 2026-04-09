import { NextResponse } from 'next/server';
import { User } from '@/models/User';
import { UserRepository } from '@/repositories/user/userRepository';
import { resetPasswordSchema } from '@/lib/validations/admin';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * @swagger
 * /api/admin/reset-password:
 *   post:
 *     summary: Reset admin password using a token
 *     description: Reset the password for an admin account using a valid reset token received via email.
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string, description: The reset token from the email link }
 *               password: { type: string, format: password, description: The new password }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: Password has been reset successfully }
 *       400:
 *         description: Invalid/expired token or validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { password, token } = resetPasswordSchema.parse(body);

        const resetTokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find user by token and check expiry
        const user = await User.findOne({
            passwordResetTokenHash: resetTokenHash,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return NextResponse.json({ error: 'Token is invalid or has expired' }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update user and clear token fields
        await UserRepository.update(user.id, {
            password: hashedPassword,
            passwordResetTokenHash: undefined,
            passwordResetExpires: undefined,
            failedLoginAttempts: 0,
            accountLockedUntil: undefined,
        } as any);

        return NextResponse.json({ message: 'Password has been reset successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 400 });
    }
}
