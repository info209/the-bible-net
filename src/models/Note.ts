import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INoteVerse {
  bookId: string;
  bookName: string;
  chapter: number;
  verses: number[];
}

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  noteText: string;
  labels: string[];
  verses: INoteVerse[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const NoteVerseSchema = new Schema<INoteVerse>({
  bookId: { type: String, required: true },
  bookName: { type: String, required: true },
  chapter: { type: Number, required: true },
  verses: { type: [Number], required: true }
}, { _id: false });

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    noteText: {
      type: String,
      required: true,
      default: '',
    },
    labels: {
      type: [String],
      default: [],
    },
    verses: {
      type: [NoteVerseSchema],
      default: [],
    },
    version: {
      type: String,
      default: 'NKJV',
      trim: true,
    }
  },
  {
    timestamps: true,
    collection: 'notes',
  }
);

// Fast lookups per user
NoteSchema.index({ userId: 1, createdAt: -1 });

export const Note: Model<INote> =
  mongoose.models.Note ||
  mongoose.model<INote>('Note', NoteSchema);
