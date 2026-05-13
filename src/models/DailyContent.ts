import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyContent extends Document {
    date: string; // ISO format: YYYY-MM-DD (UTC)
    verse: string;
    verseReference: string;
    devotionalTitle?: string;
    devotionalContent?: string;
    prayerTitle?: string;
    prayerContent?: string;
    backgroundImage?: string;
    isPublished: boolean;
    verseLikeCount: number;
    verseCommentCount: number;
    devotionLikeCount: number;
    devotionCommentCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const DailyContentSchema = new Schema<IDailyContent>(
    {
        date: {
            type: String, // String for easier matching (YYYY-MM-DD)
            required: [true, 'Date is required in YYYY-MM-DD format'],
            unique: true,
            index: true,
        },
        verse: {
            type: String,
        },
        verseReference: {
            type: String,
        },
        devotionalTitle: {
            type: String,
        },
        devotionalContent: {
            type: String,
        },
        prayerTitle: {
            type: String,
        },
        prayerContent: {
            type: String,
        },
        backgroundImage: {
            type: String,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        verseLikeCount: {
            type: Number,
            default: 0,
        },
        verseCommentCount: {
            type: Number,
            default: 0,
        },
        devotionLikeCount: {
            type: Number,
            default: 0,
        },
        devotionCommentCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

export const DailyContent: Model<IDailyContent> =
    mongoose.models.DailyContent ||
    mongoose.model<IDailyContent>('DailyContent', DailyContentSchema);
