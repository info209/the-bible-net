import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanReadingItem {
  itemId: string;
  type: 'devotional' | 'scripture';
  title: string;
  devotionalText?: string;
  mediaUrl?: string;
  scriptureRef?: string;
  bibleVersion?: string;
}

export interface IPlanDay {
  dayId: string;
  dayNumber: number;
  title: string;
  description?: string;
  scripture?: string; // legacy fallback
  devotional?: string; // legacy fallback
  reflection?: string;
  items: IPlanReadingItem[];
}

export interface IPlan extends Document {
  title: string;
  description: string;
  duration: number; // number of days
  category: string; // e.g., 'spiritual-growth', 'faith-building', etc.
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl?: string; // cover image
  thumbnailUrl?: string; // thumbnail / list image
  author: string;
  days: IPlanDay[];
  relatedPlanIds?: mongoose.Types.ObjectId[];
  totalLikes: number;
  totalRatings: number;
  averageRating: number; // 0-5
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlanReadingItemSchema = new Schema<IPlanReadingItem>(
  {
    itemId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['devotional', 'scripture'],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Item title is required'],
      trim: true,
    },
    devotionalText: {
      type: String,
      trim: true,
    },
    mediaUrl: {
      type: String,
      trim: true,
    },
    scriptureRef: {
      type: String,
      trim: true,
    },
    bibleVersion: {
      type: String,
      trim: true,
      default: 'NIV',
    },
  },
  { _id: false }
);

const PlanDaySchema = new Schema<IPlanDay>(
  {
    dayId: {
      type: String,
      required: true,
      trim: true,
    },
    dayNumber: {
      type: Number,
      required: [true, 'Day number is required'],
    },
    title: {
      type: String,
      required: [true, 'Day title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
    },
    scripture: {
      type: String,
      trim: true,
    },
    devotional: {
      type: String,
      trim: true,
    },
    reflection: {
      type: String,
      trim: true,
    },
    items: {
      type: [PlanReadingItemSchema],
      default: [],
    },
  },
  { _id: false }
);

const PlanSchema = new Schema<IPlan>(
  {
    title: {
      type: String,
      required: [true, 'Plan title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    duration: {
      type: Number,
      required: [true, 'Duration (days) is required'],
      min: [1, 'Duration must be at least 1 day'],
      max: [365, 'Duration cannot exceed 365 days'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    days: {
      type: [PlanDaySchema],
      required: [true, 'Plan days are required'],
      validate: {
        validator: function (this: any, v: IPlanDay[]) {
          return v.length > 0 && v.length === this.duration;
        },
        message: 'Number of days must match the plan duration',
      },
    },
    relatedPlanIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Plan',
    }],
    totalLikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'plans',
  }
);

// Indexes
PlanSchema.index({ isPublished: 1, createdAt: -1 });
PlanSchema.index({ category: 1, isPublished: 1 });
PlanSchema.index({ createdBy: 1 });

export const Plan: Model<IPlan> =
  mongoose.models.Plan || mongoose.model<IPlan>('Plan', PlanSchema);

