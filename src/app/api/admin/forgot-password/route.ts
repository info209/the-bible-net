import { NextResponse } from 'next/server';
import { UserRepository } from '@/repositories/user/userRepository';
import { EmailService } from '@/utils/email/emailService';
import { forgotPasswordSchema } from '@/lib/validations/admin';
import crypto from 'crypto';
import { UserRole } from '@/types/user';

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

        // Send Email (pass raw token)
        await EmailService.sendPasswordResetEmail(email, resetToken);

        return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 400 });
    }
}
