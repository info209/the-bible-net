import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOTP extends Document {
    identifier: string; // email or phone number
    code: string;
    type: 'email' | 'phone';
    expiresAt: Date;
    createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
    {
        identifier: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        code: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['email', 'phone'],
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index: document will be deleted at expiresAt
        },
    },
    { timestamps: true }
);

const OTP: Model<IOTP> = mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema);

export default OTP;
