import OTP from '@/models/OTP';
import crypto from 'crypto';

export class AuthService {
    /**
     * Generate a 6-digit OTP and store it
     */
    static async generateOTP(identifier: string, type: 'email' | 'phone'): Promise<string> {
        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Expiration: 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Delete any existing OTPs for this identifier/type
        await OTP.deleteMany({ identifier, type });

        // Create new OTP
        await OTP.create({
            identifier: identifier.toLowerCase(),
            code,
            type,
            expiresAt,
        });

        // SIMULATION: Log to console. In real world, send via Twilio/Nodemailer
        console.log(`\n--- [OTP SERVICE] ---`);
        console.log(`TO: ${identifier}`);
        console.log(`CODE: ${code}`);
        console.log(`TYPE: ${type}`);
        console.log(`---------------------\n`);

        return code;
    }

    /**
     * Verify OTP
     */
    static async verifyOTP(identifier: string, code: string, type: 'email' | 'phone'): Promise<boolean> {
        const otp = await OTP.findOne({
            identifier: identifier.toLowerCase(),
            code,
            type,
            expiresAt: { $gt: new Date() },
        });

        if (!otp) {
            return false;
        }

        // Delete successful OTP
        await OTP.deleteOne({ _id: otp._id });

        return true;
    }
}
