import mongoose, { Schema, Document, Model } from 'mongoose';

export type SavedItemType = 'bible' | 'journal' | 'reading_plan' | 'highlight' | 'note';

export interface ISavedItemMetadata {
  bookId?: string;
  bookName?: string;
  chapter?: number;
  verse?: number;
  versionId?: string;
  versionName?: string;
  title?: string; // for journals / plans
  [key: string]: unknown;
}

export interface ISavedItem extends Document {
  userId: mongoose.Types.ObjectId;
  type: SavedItemType;
  /** Unique reference – for bible: "{bookId}_{chapter}_{versionId}", for others: their _id */
  refId: string;
  metadata: ISavedItemMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const SavedItemSchema = new Schema<ISavedItem>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['bible', 'journal', 'reading_plan'],
      required: true,
    },
    refId: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'saved_items',
  }
);

// Prevent duplicate saves; also speeds up isSaved() lookups
SavedItemSchema.index({ userId: 1, type: 1, refId: 1 }, { unique: true });
// For listing saved items per user
SavedItemSchema.index({ userId: 1, createdAt: -1 });

export const SavedItem: Model<ISavedItem> =
  mongoose.models.SavedItem ||
  mongoose.model<ISavedItem>('SavedItem', SavedItemSchema);
