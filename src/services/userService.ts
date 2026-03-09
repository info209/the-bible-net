import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { UserRepository } from '@/repositories/user/userRepository';
import { OTPRepository } from '@/repositories/otp/otpRepository';
import { OTPUtils } from '@/utils/otpUtils';
import { EmailService } from '@/utils/email/emailService';
import { IUser } from '@/models/User';
import { UserRole } from '@/types/user';

export class UserService {
    /**
     * Registers a new user and sends an OTP for verification.
     */
    static async registerUser(userData: Partial<IUser>): Promise<{ userId: string; email: string }> {
        const { email, password } = userData;
        if (!email || !password) throw new Error('Email and password are required');

        // 1. Check if user already exists
        const existingUser = await UserRepository.findByEmail(email);
        if (existingUser) {
            if (!existingUser.emailVerified) {
                // Resend OTP if not verified
                await this.resendOTP(existingUser.id, email);
                return { userId: existingUser.id, email: existingUser.email };
            }
            throw new Error('Email already registered and verified');
        }

        // 2. Hash Password
        const hashedPassword = await bcrypt.hash(password, 12);

        // 3. Create User
        const user = await UserRepository.create({
            ...userData,
            password: hashedPassword,
            emailVerified: false,
        });

        // 4. Send OTP
        await this.sendNewOTP(user.id, email);

        return { userId: user.id, email: user.email };
    }

    /**
     * Generates, hashes, stores, and sends a new OTP.
     */
    static async sendNewOTP(userId: string, email: string): Promise<void> {
        const rawOTP = OTPUtils.generateOTP();
        const otpHash = await OTPUtils.hashOTP(rawOTP);
        const expiresAt = OTPUtils.getExpirationDate();

        // Store in DB (Clear previous ones)
        await OTPRepository.clearAllForUser(userId);
        await OTPRepository.create({ userId: userId as any, otpHash, expiresAt });

        // Send Email
        await EmailService.sendOTP(email, rawOTP);
    }

    static async resendOTP(userId: string, email: string) {
        await this.sendNewOTP(userId, email);
    }

    /**
     * Verifies the OTP and activates the user account.
     */
    static async verifyOTP(userId: string, otp: string): Promise<boolean> {
        const otpRecord = await OTPRepository.findLatestByUserId(userId);
        if (!otpRecord) throw new Error('OTP not found or expired');

        const isValid = await OTPUtils.verifyOTP(otp, otpRecord.otpHash);
        if (!isValid) return false;

        // Success: Mark user as verified
        await UserRepository.update(userId, { emailVerified: true });
        await OTPRepository.clearAllForUser(userId);
        return true;
    }

    /**
     * For Social Logins: auto-creates verified user or finds existing.
     */
    static async findOrCreateOAuthUser(data: {
        email: string;
        firstName: string;
        lastName: string;
        image?: string;
        provider: string;
        providerAccountId: string;
    }): Promise<IUser> {
        const existing = await UserRepository.findByEmail(data.email);
        if (existing) {
            // If found, update provider info if not set
            if (!existing.provider) {
                return await UserRepository.update(existing.id, {
                    provider: data.provider,
                    providerAccountId: data.providerAccountId,
                    emailVerified: true // OAuth providers verify email
                }) as IUser;
            }
            return existing;
        }

        // Create new account
        return await UserRepository.create({
            ...data,
            emailVerified: true,
            onboardingCompleted: false, // Must complete profile fields later
        });
    }

    /**
     * Completes onboarding fields.
     */
    static async completeOnboarding(userId: string, fields: Partial<IUser>): Promise<IUser | null> {
        return await UserRepository.update(userId, {
            ...fields,
            onboardingCompleted: true,
        });
    }

    static async verifyCredentials(email: string, passwordAttempt: string): Promise<IUser | null> {
        const user = await UserRepository.findByEmail(email);

        // No detail leaking: If user doesn't exist, just return null
        if (!user) return null;

        // Check if account is deactivated
        if (!user.isActive) {
            throw new Error('Your account has been deactivated. Please contact support.');
        }

        // Check if account is currently locked
        if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
            const minutesLeft = Math.ceil((user.accountLockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Account is temporarily locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`);
        }

        if (!user.password) return null;

        const isMatch = await bcrypt.compare(passwordAttempt, user.password);

        if (!isMatch) {
            // Increment failed attempts
            const attempts = (user.failedLoginAttempts || 0) + 1;
            const updateData: any = { failedLoginAttempts: attempts };

            if (attempts >= 5) {
                // Lock for 15 minutes
                updateData.accountLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await UserRepository.update(user.id, updateData);
            return null; // Return null for generic "Invalid credentials" message in auth handler
        }

        // Success: Clear failed attempts and update last login
        await UserRepository.update(user.id, {
            failedLoginAttempts: 0,
            accountLockedUntil: undefined,
            lastLoginAt: new Date()
        });

        // Still check email verification after successful login
        if (!user.emailVerified) {
            throw new Error('Email not verified. Please verify your account first.');
        }

        return user;
    }

    /**
     * Initiates the forgot password flow by generating a reset token and sending an email.
     */
    static async forgotPassword(email: string): Promise<void> {
        const user = await UserRepository.findByEmail(email);
        if (!user) {
            // SECURITY: Don't reveal if user exists. Just resolve.
            return;
        }

        // 1. Generate random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 2. Hash it for DB storage
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // 3. Set expiration (15 minutes)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // 4. Update user record
        await UserRepository.update(user.id, {
            passwordResetTokenHash: hashedToken,
            passwordResetExpires: expiresAt,
        } as any);

        // 5. Send Email
        const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
        await EmailService.sendPasswordReset(email, resetLink);
    }

    /**
     * Resets the user's password using a valid reset token.
     */
    static async resetPassword(token: string, newPassword: string): Promise<void> {
        // 1. Hash the incoming token to match DB
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        // 2. Find user with this token and not expired
        const user = await UserRepository.findUserByResetToken(hashedToken);

        if (!user || (user.passwordResetExpires && user.passwordResetExpires < new Date())) {
            throw new Error('Password reset token is invalid or has expired');
        }

        // 3. Hash New Password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 4. Update User & Clear token fields
        await UserRepository.update(user.id, {
            password: hashedPassword,
            passwordResetTokenHash: undefined,
            passwordResetExpires: undefined,
            failedLoginAttempts: 0,
            accountLockedUntil: undefined,
        } as any);
    }
}
