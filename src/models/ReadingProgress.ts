import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReadingProgress extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: string;
  bookName?: string;
  chapter: number;
  versionId: string;
  versionName?: string;
  lastReadAt: Date;
  completed: boolean;
  progressPercent?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ReadingProgressSchema = new Schema<IReadingProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bookId: {
      type: String,
      required: true,
    },
    bookName: {
      type: String,
    },
    chapter: {
      type: Number,
      required: true,
    },
    versionId: {
      type: String,
      required: true,
    },
    versionName: {
      type: String,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    progressPercent: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'reading_progress',
  }
);

// Indexes
ReadingProgressSchema.index({ userId: 1 });
ReadingProgressSchema.index({ userId: 1, bookId: 1, chapter: 1 }, { unique: true });

export const ReadingProgress: Model<IReadingProgress> =
  mongoose.models.ReadingProgress || mongoose.model<IReadingProgress>('ReadingProgress', ReadingProgressSchema);
