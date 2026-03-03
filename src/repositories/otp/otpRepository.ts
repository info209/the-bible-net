import { OTPVerification, IOTPVerification } from '@/models/OTP';

export class OTPRepository {
    static async create(data: Partial<IOTPVerification>): Promise<IOTPVerification> {
        const otp = new OTPVerification(data);
        return await otp.save();
    }

    static async findLatestByUserId(userId: string): Promise<IOTPVerification | null> {
        return await OTPVerification.findOne({ userId }).sort({ createdAt: -1 });
    }

    static async clearAllForUser(userId: string): Promise<void> {
        await OTPVerification.deleteMany({ userId });
    }

    static async deleteById(id: string): Promise<void> {
        await OTPVerification.findByIdAndDelete(id);
    }
}
