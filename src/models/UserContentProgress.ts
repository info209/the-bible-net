import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Generic, reusable progress tracking model for any user-consumable content.
 *
 * contentType values (extensible):
 *  - 'dailyDevotional'   — Daily Devotional (current)
 *  - 'readingPlan'       — Reading Plans (future)
 *  - 'bibleBook'         — Bible Book reading (future)
 *  - 'studyModule'       — Study Modules (future)
 *
 * The `date` field serves as the canonical content identifier for date-keyed
 * content (e.g. dailyDevotional). For non-date content, use `contentId` instead.
 */
export type ProgressStatus = 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETED';

export interface IUserContentProgress extends Document {
  userId: mongoose.Types.ObjectId;
  contentType: string;
  date: string;                  // YYYY-MM-DD — canonical content date key
  contentId?: string;            // Optional: for non-date-keyed content
  status: ProgressStatus;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserContentProgressSchema = new Schema<IUserContentProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      trim: true,
    },
    contentId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['INCOMPLETE', 'IN_PROGRESS', 'COMPLETED'],
      default: 'INCOMPLETE',
      required: true,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'user_content_progress',
  }
);

// Primary lookup index — one record per user + contentType + date
UserContentProgressSchema.index(
  { userId: 1, contentType: 1, date: 1 },
  { unique: true }
);

// Future: streak and analytics queries
UserContentProgressSchema.index({ userId: 1, contentType: 1, status: 1 });
UserContentProgressSchema.index({ userId: 1, contentType: 1, completedAt: -1 });

export const UserContentProgress: Model<IUserContentProgress> =
  mongoose.models.UserContentProgress ||
  mongoose.model<IUserContentProgress>('UserContentProgress', UserContentProgressSchema);
