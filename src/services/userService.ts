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
        if (!user || !user.password) return null;

        if (!user.emailVerified) throw new Error('Email not verified. Please verify your account first.');

        const isMatch = await bcrypt.compare(passwordAttempt, user.password);
        return isMatch ? user : null;
    }
}
