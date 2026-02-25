import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAccount {
    provider: string; // 'google', 'facebook'
    type: string;
    providerAccountId: string;
    access_token?: string;
    expires_at?: number;
    token_type?: string;
    scope?: string;
    id_token?: string;
}

export interface IProfile {
    bio?: string;
    location?: string;
    website?: string;
    country?: string;
}

export interface IPreferences {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    notificationsEnabled: boolean;
    language: string;
    bibleVersion?: string;
}

export interface IUser extends Document {
    name: string;
    email?: string;
    phoneNumber?: string;
    password?: string;
    image?: string;
    emailVerified?: Date;
    phoneVerified?: Date;
    gender?: 'male' | 'female' | 'other';
    dob?: Date;
    accounts: IAccount[];
    role: 'user' | 'admin' | 'moderator';
    profile: IProfile;
    preferences: IPreferences;
    createdAt: Date;
    updatedAt: Date;
}

const AccountSchema = new Schema({
    provider: {
        type: String,
        required: true,
        enum: ['google', 'facebook', 'twitter', 'credentials'], // Allowed providers (twitter/X)
    },
    type: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    access_token: String,
    expires_at: Number,
    token_type: String,
    scope: String,
    id_token: String,
}, { _id: false });

const ProfileSchema = new Schema({
    bio: { type: String, maxlength: [500, 'Bio cannot exceed 500 characters'], trim: true },
    location: { type: String, maxlength: [100, 'Location cannot exceed 100 characters'], trim: true },
    website: {
        type: String,
        match: [/^https?:\/\/[^\s$.?#].[^\s]*$/, 'Please enter a valid URL']
    },
    country: { type: String, trim: true }
}, { _id: false });

const PreferencesSchema = new Schema({
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    fontSize: { type: Number, min: 12, max: 32, default: 16 },
    notificationsEnabled: { type: Boolean, default: true },
    language: { type: String, default: 'en' },
    bibleVersion: { type: String, trim: true }
}, { _id: false });

const UserSchema: Schema<IUser> = new Schema(
    {
        name: {
            type: String,
            required: [true, 'Please provide a name'],
            minlength: [2, 'Name must be at least 2 characters long'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
            trim: true,
        },
        email: {
            type: String,
            unique: true,
            sparse: true, // Allow nulls for unique index
            lowercase: true,
            trim: true,
            match: [
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                'Please provide a valid email address',
            ],
        },
        phoneNumber: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
        },
        password: {
            type: String,
            select: false,
            minlength: [8, 'Password must be at least 8 characters long'],
        },
        image: {
            type: String,
            match: [/^https?:\/\//, 'Image URL must be valid']
        },
        emailVerified: { type: Date },
        phoneVerified: { type: Date },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
        },
        dob: {
            type: Date,
        },
        accounts: [AccountSchema],
        role: {
            type: String,
            enum: ['user', 'admin', 'moderator'],
            default: 'user',
        },
        profile: {
            type: ProfileSchema,
            default: () => ({}),
        },
        preferences: {
            type: PreferencesSchema,
            default: () => ({ theme: 'system', fontSize: 16, notificationsEnabled: true, language: 'en' }),
        },
    },
    {
        timestamps: true,
        minimize: false,
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
