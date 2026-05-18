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
}

export interface IVerse extends Document {
    number: number;
    text: string;
    chapter: mongoose.Types.ObjectId;
    book: mongoose.Types.ObjectId;    // Denormalized
    version: mongoose.Types.ObjectId; // Denormalized

    // Enhanced denormalized metadata (optional for safety with existing documents)
    versionCode?: string;      // e.g., "KJV"
    versionName?: string;      // e.g., "King James Version"
    bookName?: string;         // e.g., "Psalms"
    bookAbbr?: string;         // e.g., "PSA"
    testamentName?: 'OT' | 'NT';
    chapterNumber?: number;

    // Derived reference
    reference?: string;        // e.g., "Psalms 23:4"

    // Text variations
    normalizedText?: string;   // lowercase, minimal punctuation

    // Enrichment fields
    themes?: string[];         // e.g., ["comfort", "protection", "faith"]
    emotions?: string[];       // e.g., ["fear", "hope", "peace"]
    keywords?: string[];       // extracted important nouns/concepts

    // Composite search field
    searchText?: string;       // concatenation of reference, text, themes, emotions, keywords

    // Vector embedding (for semantic search)
    embedding?: number[];      // e.g., float array for search

    // Scoring and model metadata
    popularityScore?: number;  // 0-100, for boost in ranking
    embeddingModel?: string;   // e.g., "all-MiniLM-L6-v2"
    embeddingGeneratedAt?: Date;
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
    }
});
ChapterSchema.index({ book: 1, number: 1 }, { unique: true });
ChapterSchema.index({ version: 1, book: 1 });

const VerseSchema = new Schema<IVerse>({
    number: { type: Number, required: true, min: [1, 'Verse must be at least 1'] },
    text: {
        type: String,
        required: true,
        maxlength: [3000, 'Verse text too long (checking sanity limit)'], // Some verses are long, but 3000 is safe upper bound
        trim: true
    },
    chapter: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    version: { type: Schema.Types.ObjectId, ref: 'BibleVersion', required: true },
    
    // Enhanced denormalized metadata (optional for compatibility)
    versionCode: {
        type: String,
        maxlength: 10,
        uppercase: true,
        index: true
    },
    versionName: {
        type: String,
        maxlength: 100
    },
    bookName: {
        type: String,
        maxlength: 50,
        index: true
    },
    bookAbbr: {
        type: String,
        maxlength: 10,
        uppercase: true,
        index: true
    },
    testamentName: {
        type: String,
        enum: ['OT', 'NT'],
        index: true
    },
    chapterNumber: {
        type: Number,
        index: true
    },

    // Derived reference
    reference: {
        type: String,
        maxlength: 50,
        index: true
    },

    // Text variations
    normalizedText: {
        type: String,
        maxlength: 3000
    },

    // Enrichment fields
    themes: {
        type: [String],
        default: [],
        index: true
    },
    emotions: {
        type: [String],
        default: [],
        index: true
    },
    keywords: {
        type: [String],
        default: []
    },

    // Composite search field
    searchText: {
        type: String,
        maxlength: 5000
    },

    // Vector embedding
    embedding: {
        type: [Number],
        sparse: true
    },

    // Scoring and model metadata
    popularityScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100
    },
    embeddingModel: {
        type: String,
        default: 'all-MiniLM-L6-v2',
        maxlength: 100
    },
    embeddingGeneratedAt: {
        type: Date,
        sparse: true
    }
}, { timestamps: true });

VerseSchema.index({ chapter: 1, number: 1 }, { unique: true });
VerseSchema.index({ version: 1, book: 1, chapter: 1, number: 1 });
VerseSchema.index({ versionCode: 1, bookName: 1, chapterNumber: 1, number: 1 });
VerseSchema.index({ reference: 1, versionCode: 1 });

// Text index for keyword search on composite search field
VerseSchema.index({ searchText: 'text' });

// Extra indexes for fast vector filtering
VerseSchema.index({ embeddingModel: 1 });

// --- Models ---
// Prevent overwriting models in dev hot-reload
export const BibleVersion: Model<IBibleVersion> = mongoose.models.BibleVersion || mongoose.model<IBibleVersion>('BibleVersion', BibleVersionSchema);
export const Book: Model<IBook> = mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
export const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', ChapterSchema);
export const Verse: Model<IVerse> = mongoose.models.Verse || mongoose.model<IVerse>('Verse', VerseSchema);
