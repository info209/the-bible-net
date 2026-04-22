import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanDay {
  dayNumber: number;
  title: string;
  description?: string;
  scripture: string; // e.g., "James 1:18-24 NIV"
  devotional: string; // devotional text
  reflection?: string; // optional reflection questions
}

export interface IPlan extends Document {
  title: string;
  description: string;
  duration: number; // number of days
  category: string; // e.g., 'spiritual-growth', 'faith-building', etc.
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  imageUrl?: string;
  author: string;
  days: IPlanDay[];
  totalLikes: number;
  totalRatings: number;
  averageRating: number; // 0-5
  isPublished: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlanDaySchema = new Schema<IPlanDay>(
  {
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
      required: [true, 'Scripture reference is required'],
      trim: true,
      maxlength: [100, 'Scripture reference cannot exceed 100 characters'],
    },
    devotional: {
      type: String,
      required: [true, 'Devotional text is required'],
      trim: true,
    },
    reflection: {
      type: String,
      trim: true,
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
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
    },
    days: {
      type: [PlanDaySchema],
      required: [true, 'Plan days are required'],
      validate: {
        validator: function (v: IPlanDay[]) {
          return v.length > 0 && v.length === this.duration;
        },
        message: 'Number of days must match the plan duration',
      },
    },
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
