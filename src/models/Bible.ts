import mongoose, { Schema, Document, Model } from 'mongoose';

// --- Interfaces ---

export interface IBibleVersion extends Document {
    name: string;      // e.g. "King James Version"
    abbreviation: string; // e.g. "KJV"
    language: string;  // e.g. "en"
    copyright?: string;
    status: 'active' | 'inactive' | 'importing' | 'failed';
    importProgress: number;
    isActive: boolean; // Simplified active/inactive state
    createdAt?: Date;
    updatedAt?: Date;

    // Enhanced fields added in place
    licenseType?: 'public-domain' | 'licensed' | 'proprietary' | 'unknown';
    embeddingsGenerated?: boolean;
    embeddingsGeneratedAt?: Date;
    versesCount?: number;
}


export interface IBook extends Document {
    name: string;        // e.g. "Genesis"
    abbreviation: string;// e.g. "Gen"
    testament: 'OT' | 'NT';
    version: mongoose.Types.ObjectId;
    order: number;       // For sorting

    // Enhanced fields added in place
    chaptersCount?: number;
    versesCount?: number;
}

export interface IChapter extends Document {
    number: number;
    book: mongoose.Types.ObjectId;
    version: mongoose.Types.ObjectId; // Denormalized for easier querying

    // Enhanced fields added in place
    versesCount?: number;
    footnotes?: Array<{ verse?: number; verseNumber?: number; text?: string; note?: string; marker?: string; reference?: string } | string>;
}

export interface IVerse extends Document {
    number: number;
    text: string;
    chapter: mongoose.Types.ObjectId;
    book: mongoose.Types.ObjectId;    // Denormalized
    version: mongoose.Types.ObjectId; // Denormalized

    // Optional footnotes for this verse
    footnotes?: Array<{ text?: string; note?: string; marker?: string; reference?: string } | string>;

    // Enhanced denormalized metadata (optional for safety with existing documents)
    versionCode?: string;      // e.g., "KJV"
    bookName?: string;         // e.g., "Psalms"
    chapterNumber?: number;

    // Derived reference
    reference?: string;        // e.g., "Psalms 23:4"

    // Text variations
    normalizedText?: string;   // lowercase, minimal punctuation

    // Enrichment fields
    themes?: string[];         // e.g., ["comfort", "protection", "faith"]
    emotions?: string[];       // e.g., ["fear", "hope", "peace"]
    keywords?: string[];       // extracted important nouns/concepts

    // Scoring and model metadata
    popularityScore?: number;  // 0-100, for boost in ranking
}

// --- Schemas ---

const BibleVersionSchema = new Schema<IBibleVersion>({
    name: {
        type: String,
        required: true,
        maxlength: [100, 'Version name cannot exceed 100 characters'],
        trim: true
    },
    abbreviation: {
        type: String,
        required: true,
        unique: true,
        maxlength: [10, 'Abbreviation cannot exceed 10 characters'],
        uppercase: true,
        trim: true,
        match: [/^[A-Z0-9]+$/, 'Abbreviation must be alphanumeric']
    },
    language: {
        type: String,
        required: true,
        match: [/^[a-z]{2,3}$/, 'Language must be a 2 or 3 letter ISO code'],
        lowercase: true,
        trim: true
    },
    copyright: { type: String, maxlength: [500, 'Copyright notice too long'] },
    status: {
        type: String,
        enum: ['active', 'inactive', 'importing', 'failed'],
        default: 'inactive'
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true
    },
    importProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    // Enhanced fields
    licenseType: {
        type: String,
        enum: ['public-domain', 'licensed', 'proprietary', 'unknown'],
        default: 'unknown'
    },
    embeddingsGenerated: {
        type: Boolean,
        default: false
    },
    embeddingsGeneratedAt: {
        type: Date,
        sparse: true
    },
    versesCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });


const BookSchema = new Schema<IBook>({
    name: {
        type: String,
        required: true,
        maxlength: [50, 'Book name cannot exceed 50 characters'],
        trim: true
    },
    abbreviation: {
        type: String,
        required: true,
        maxlength: [10, 'Book abbreviation cannot exceed 10 characters'],
        trim: true
    },
    testament: { type: String, enum: ['OT', 'NT'], required: true },
    version: { type: Schema.Types.ObjectId, ref: 'BibleVersion', required: true },
    order: { type: Number, required: true, min: 1 },
    // Enhanced fields
    chaptersCount: {
        type: Number,
        default: 0
    },
    versesCount: {
        type: Number,
        default: 0
    }
});
// Index for fast lookup of books in a version
BookSchema.index({ version: 1, order: 1 });
BookSchema.index({ version: 1, abbreviation: 1 });
BookSchema.index({ name: 1, version: 1 });

const ChapterSchema = new Schema<IChapter>({
    number: { type: Number, required: true, min: [1, 'Chapter must be at least 1'] },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    version: { type: Schema.Types.ObjectId, ref: 'BibleVersion', required: true },
    // Enhanced fields
    versesCount: {
        type: Number,
        default: 0
    },
    footnotes: {
        type: [Schema.Types.Mixed],
        default: undefined
    }
});
ChapterSchema.index({ book: 1, number: 1 }, { unique: true });
ChapterSchema.index({ version: 1, book: 1 });

const VerseSchema = new Schema<IVerse>({
    number: { type: Number, required: true, min: [1, 'Verse must be at least 1'] },
    text: {
        type: String,
        required: true,
        maxlength: [3000, 'Verse text too long (checking sanity limit)'],
        trim: true
    },
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    version: { type: Schema.Types.ObjectId, ref: 'BibleVersion', required: true },
    footnotes: {
        type: [Schema.Types.Mixed],
        default: undefined
    },
    
    // Enhanced denormalized metadata
    versionCode: {
        type: String,
        maxlength: 10,
        uppercase: true
    },
    bookName: {
        type: String,
        maxlength: 50
    },
    chapterNumber: {
        type: Number
    },

    // Derived reference
    reference: {
        type: String,
        maxlength: 50
    },

    // Text variations
    normalizedText: {
        type: String,
        maxlength: 3000
    },

    // Enrichment fields
    themes: {
        type: [String],
        default: []
    },
    emotions: {
        type: [String],
        default: []
    },
    keywords: {
        type: [String],
        default: []
    },

    // Scoring and model metadata
    popularityScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    }
}, { timestamps: true });

// Core lookup indexes for free-tier optimized production
VerseSchema.index({ versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 });
VerseSchema.index({ normalizedText: 'text', keywords: 'text', emotions: 'text', themes: 'text' });
VerseSchema.index({ reference: 1 });
// Emotion-based search index (Use Case 3)
VerseSchema.index({ emotions: 1 });

// --- Models ---
// Prevent overwriting models in dev hot-reload
export const BibleVersion: Model<IBibleVersion> = mongoose.models.BibleVersion || mongoose.model<IBibleVersion>('BibleVersion', BibleVersionSchema);
export const Book: Model<IBook> = mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
export const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', ChapterSchema);
export const Verse: Model<IVerse> = mongoose.models.Verse || mongoose.model<IVerse>('Verse', VerseSchema);
