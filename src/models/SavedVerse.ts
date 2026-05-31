import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISavedVerse extends Document {
  userId: mongoose.Types.ObjectId;

  bookId: string;
  bookName: string;

  chapter: number;

  /** Sorted array of verse numbers, e.g. [2, 5, 6, 7] */
  verses: number[];

  /** Human-readable range, e.g. "Genesis 1:2, 5-7" */
  verseRangeText: string;

  labels: string[];

  note: string;

  version: string;

  isPrivate: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const SavedVerseSchema = new Schema<ISavedVerse>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookId: {
      type: String,
      required: true,
      trim: true,
    },
    bookName: {
      type: String,
      required: true,
      trim: true,
    },
    chapter: {
      type: Number,
      required: true,
    },
    verses: {
      type: [Number],
      required: true,
    },
    verseRangeText: {
      type: String,
      default: '',
    },
    labels: {
      type: [String],
      default: [],
    },
    note: {
      type: String,
      default: '',
    },
    version: {
      type: String,
      default: 'NKJV',
      trim: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: 'saved_verses',
  }
);

// Fast lookup per chapter (to build savedVerseIds for current chapter)
SavedVerseSchema.index({ userId: 1, bookId: 1, chapter: 1 });
// Fast lookup for listing saved verses by user
SavedVerseSchema.index({ userId: 1, createdAt: -1 });
// Unique constraint — one save per user per (book, chapter, verse set)
SavedVerseSchema.index(
  { userId: 1, bookId: 1, chapter: 1, verses: 1 },
  { unique: false } // verses is an array — enforce uniqueness at app layer instead
);

export const SavedVerse: Model<ISavedVerse> =
  mongoose.models.SavedVerse ||
  mongoose.model<ISavedVerse>('SavedVerse', SavedVerseSchema);
