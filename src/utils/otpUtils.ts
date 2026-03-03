import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class OTPUtils {
    /**
     * Generates a random 6-digit numeric OTP.
     */
    static generateOTP(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Hashes the OTP using bcrypt.
     */
    static async hashOTP(otp: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(otp, salt);
    }

    /**
     * Compares the provided OTP with the stored hash.
     */
    static async verifyOTP(otp: string, storedHash: string): Promise<boolean> {
        return await bcrypt.compare(otp, storedHash);
    }

    /**
     * Calculates the expiration date for the OTP.
     * Default: 10 minutes from now.
     */
    static getExpirationDate(minutes: number = 10): Date {
        return new Date(Date.now() + minutes * 60 * 1000);
    }
}
