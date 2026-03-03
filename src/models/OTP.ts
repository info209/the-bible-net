import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOTPVerification extends Document {
    userId: mongoose.Types.ObjectId;
    otpHash: string;
    expiresAt: Date;
    createdAt: Date;
}

const OTPSchema = new Schema<IOTPVerification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        otpHash: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: '0s' }, // Auto-delete document on expiration using MongoDB TTL index
        },
    },
    {
        timestamps: true,
    }
);

export const OTPVerification: Model<IOTPVerification> =
    mongoose.models.OTPVerification ||
    mongoose.model<IOTPVerification>('OTPVerification', OTPSchema);
