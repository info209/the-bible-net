import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from '@/types/user';

export interface IUser extends Document {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: UserRole;
    preferredLanguage: string;
    preferredBibleVersion: string;
    country: string;
    emailVerified: boolean;
    onboardingCompleted: boolean;
    image?: string;
    provider?: string;
    providerAccountId?: string;
    failedLoginAttempts: number;
    accountLockedUntil?: Date;
    lastLoginAt?: Date;
    passwordResetTokenHash?: string;
    passwordResetExpires?: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: 50,
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: 50,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please provide a valid email address',
            ],
        },
        password: {
            type: String,
            select: false, // Don't return password by default
            minlength: [8, 'Password must be at least 8 characters'],
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.USER,
        },
        preferredLanguage: {
            type: String,
            default: 'en',
        },
        preferredBibleVersion: {
            type: String,
            default: 'KJV',
        },
        country: {
            type: String,
            default: 'Unknown',
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        onboardingCompleted: {
            type: Boolean,
            default: false,
        },
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        accountLockedUntil: {
            type: Date,
        },
        lastLoginAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        passwordResetTokenHash: String,
        passwordResetExpires: Date,
        image: String,
        provider: String,
        providerAccountId: String,
    },
    {
        timestamps: true,
    }
);

// Indexes
UserSchema.index({ role: 1 });

export const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
