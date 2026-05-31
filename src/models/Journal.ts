import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IJournalChecklistItem {
  text: string;
  checked: boolean;
}

export interface IJournalVerse {
  bookName: string;
  chapter: number;
  verses: number[];
}

export interface IJournal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  type: 'text' | 'checklist' | 'audio';
  labels: string[];
  verses: IJournalVerse[];
  folderId?: mongoose.Types.ObjectId;
  audioUrl?: string;
  checklistItems: IJournalChecklistItem[];
  isPinned: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const JournalVerseSchema = new Schema<IJournalVerse>({
  bookName: { type: String, required: true },
  chapter: { type: Number, required: true },
  verses: { type: [Number], required: true }
}, { _id: false });

const JournalChecklistItemSchema = new Schema<IJournalChecklistItem>({
  text: { type: String, required: true, default: '' },
  checked: { type: Boolean, required: true, default: false }
}, { _id: false });

const JournalSchema = new Schema<IJournal>(
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
    type: {
      type: String,
      enum: ['text', 'checklist', 'audio'],
      default: 'text',
    },
    labels: {
      type: [String],
      default: [],
    },
    verses: {
      type: [JournalVerseSchema],
      default: [],
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'UserFolder',
      index: true,
    },
    audioUrl: {
      type: String,
    },
    checklistItems: {
      type: [JournalChecklistItemSchema],
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize sorting for fetching pinned items first, then by date updated
JournalSchema.index({ userId: 1, isPinned: -1, updatedAt: -1 });

export const Journal: Model<IJournal> =
  mongoose.models.Journal ||
  mongoose.model<IJournal>('Journal', JournalSchema);
