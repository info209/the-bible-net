import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPrayer extends Document {
  userId: mongoose.Types.ObjectId;
  text: string;
  isPublic: boolean;
  anonymous: boolean;
  intercessionCount: number;
  intercessors: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PrayerSchema = new Schema<IPrayer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Prayer text is required'],
      maxlength: [1000, 'Prayer text cannot exceed 1000 characters'],
      trim: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    anonymous: {
      type: Boolean,
      default: false,
    },
    intercessionCount: {
      type: Number,
      default: 0,
    },
    intercessors: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Index for latest public prayers
PrayerSchema.index({ isPublic: 1, createdAt: -1 });

export const Prayer: Model<IPrayer> =
  mongoose.models.Prayer || mongoose.model<IPrayer>('Prayer', PrayerSchema);
