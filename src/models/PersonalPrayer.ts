import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPersonalPrayerVerse {
  bookName: string;
  chapter: number;
  verses: number[];
}

export interface IPersonalPrayer extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  labels: string[];
  verses: IPersonalPrayerVerse[];
  folderId?: mongoose.Types.ObjectId;
  isPinned: boolean;
  isBookmarked: boolean;
  status: 'active' | 'prayed';
  createdAt: Date;
  updatedAt: Date;
}

const PersonalPrayerVerseSchema = new Schema<IPersonalPrayerVerse>({
  bookName: { type: String, required: true },
  chapter: { type: Number, required: true },
  verses: { type: [Number], required: true }
}, { _id: false });

const PersonalPrayerSchema = new Schema<IPersonalPrayer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 120,
      trim: true,
    },
    content: {
      type: String,
      default: '',
    },
    labels: {
      type: [String],
      default: [],
    },
    verses: {
      type: [PersonalPrayerVerseSchema],
      default: [],
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'UserFolder',
      index: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'prayed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
    collection: 'personal_prayers',
  }
);

// Optimize sorting for fetching pinned items first, then by date updated
PersonalPrayerSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

export const PersonalPrayer: Model<IPersonalPrayer> =
  mongoose.models.PersonalPrayer ||
  mongoose.model<IPersonalPrayer>('PersonalPrayer', PersonalPrayerSchema);
