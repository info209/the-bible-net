import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyContent extends Document {
    date: string;             // ISO format: YYYY-MM-DD (UTC)
    contentYear: number;      // Extracted from date for year-based uniqueness queries

    // Structured verse reference — text is resolved at runtime per user's Bible version
    verseBook?: string;        // e.g. "Psalms"
    verseChapter?: number;     // e.g. 23
    verseNumber?: number;      // e.g. 1
    verseReference?: string;   // Human-readable label: "Psalms 23:1"

    // Daily devotional
    devotionalTitle?: string;
    devotionalContent?: string;
    devotionalVerseRef?: string;         // e.g. "Romans 8:28"
    devotionalBackgroundImage?: string; // Separate background for devotionals

    // Optional Prayer fields
    prayerTitle?: string;
    prayerContent?: string;

    // Verse card background
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
            type: String,
            required: [true, 'Date is required in YYYY-MM-DD format'],
            unique: true,
            index: true,
        },
        contentYear: {
            type: Number,
            required: true,
            index: true,
        },
        verseBook: {
            type: String,
            trim: true,
        },
        verseChapter: {
            type: Number,
            min: 1,
        },
        verseNumber: {
            type: Number,
            min: 1,
        },
        verseReference: {
            type: String,
            trim: true,
        },
        devotionalTitle: {
            type: String,
            default: '',
        },
        devotionalContent: {
            type: String,
            default: '',
        },
        devotionalVerseRef: {
            type: String,
            trim: true,
        },
        devotionalBackgroundImage: {
            type: String,
        },
        prayerTitle: {
            type: String,
            default: '',
        },
        prayerContent: {
            type: String,
            default: '',
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

// Enforce year-based verse uniqueness: same verse can't appear twice in a calendar year if verse is configured
DailyContentSchema.index(
    { verseBook: 1, verseChapter: 1, verseNumber: 1, contentYear: 1 },
    { 
        unique: true, 
        name: 'unique_verse_per_year',
        partialFilterExpression: { verseBook: { $exists: true } }
    }
);

export const DailyContent: Model<IDailyContent> =
    mongoose.models.DailyContent ||
    mongoose.model<IDailyContent>('DailyContent', DailyContentSchema);
