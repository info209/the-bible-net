import mongoose, { Schema, Document, Model } from 'mongoose';

// --- Interfaces ---

export interface IBibleVersion extends Document {
    name: string;      // e.g. "King James Version"
    abbreviation: string; // e.g. "KJV"
    language: string;  // e.g. "en"
    copyright?: string;
    status: 'active' | 'importing' | 'failed';
    importProgress: number;
}


export interface IBook extends Document {
    name: string;        // e.g. "Genesis"
    abbreviation: string;// e.g. "Gen"
    testament: 'OT' | 'NT';
    version: mongoose.Types.ObjectId;
    order: number;       // For sorting
}

export interface IChapter extends Document {
    number: number;
    book: mongoose.Types.ObjectId;
    version: mongoose.Types.ObjectId; // Denormalized for easier querying
}

export interface IVerse extends Document {
    number: number;
    text: string;
    chapter: mongoose.Types.ObjectId;
    book: mongoose.Types.ObjectId;    // Denormalized
    version: mongoose.Types.ObjectId; // Denormalized
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
        enum: ['active', 'importing', 'failed'],
        default: 'active'
    },
    importProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
});


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
});
// Index for fast lookup of books in a version
BookSchema.index({ version: 1, order: 1 });
BookSchema.index({ version: 1, abbreviation: 1 });

const ChapterSchema = new Schema<IChapter>({
    number: { type: Number, required: true, min: [1, 'Chapter must be at least 1'] },
    book: { type: Schema.Types.ObjectId, ref: 'Book', required: true },
    version: { type: Schema.Types.ObjectId, ref: 'BibleVersion', required: true },
});
ChapterSchema.index({ book: 1, number: 1 }, { unique: true }); // A book can't have two chapter 1s (in the same version - wait, book is unique to version? No, book model should be unique per version properly). 
// Correction: If Book is generic "Genesis" shared across versions, that's one design.
// If Book is "Genesis (KJV)", that's another.
// My design: Book has schema ref to Version. So "Genesis KJV" is a document, "Genesis NIV" is another.
// So { book: 1, number: 1 } unique is correct.

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
});
VerseSchema.index({ chapter: 1, number: 1 }, { unique: true });
VerseSchema.index({ version: 1, book: 1, chapter: 1, number: 1 });
VerseSchema.index({ text: 'text' }); // Full-text search index

// --- Models ---
// Prevent overwriting models in dev hot-reload
export const BibleVersion: Model<IBibleVersion> = mongoose.models.BibleVersion || mongoose.model<IBibleVersion>('BibleVersion', BibleVersionSchema);
export const Book: Model<IBook> = mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);
export const Chapter: Model<IChapter> = mongoose.models.Chapter || mongoose.model<IChapter>('Chapter', ChapterSchema);
export const Verse: Model<IVerse> = mongoose.models.Verse || mongoose.model<IVerse>('Verse', VerseSchema);
