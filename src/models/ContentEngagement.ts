import mongoose, { Document, Model } from 'mongoose';

export interface IContentEngagement extends Document {
  type: 'dailyVerse' | 'dailyDevotional';
  date: string;
  shareCount: number;
  likeCount?: number;
  viewCount?: number;
  bookmarkCount?: number;
  copyCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ContentEngagementSchema = new mongoose.Schema<IContentEngagement>({
  type: {
    type: String,
    required: true,
    enum: ['dailyVerse', 'dailyDevotional'],
  },
  date: {
    type: String,
    required: true,
  },
  shareCount: {
    type: Number,
    default: 0,
  },
  likeCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  bookmarkCount: {
    type: Number,
    default: 0,
  },
  copyCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound unique index for fast lookups and preventing duplicates
ContentEngagementSchema.index({ type: 1, date: 1 }, { unique: true });

export const ContentEngagement: Model<IContentEngagement> = 
  mongoose.models.ContentEngagement || mongoose.model<IContentEngagement>('ContentEngagement', ContentEngagementSchema);
