import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPlanDayProgress {
  dayNumber: number;
  dayId?: string;
  completed: boolean;
  completedAt?: Date;
  scrollPosition?: number; // store last scroll position
  readingState: 'not-started' | 'in-progress' | 'completed';
  completedItemIds: string[];
}

export interface IPlanProgress extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: 'not-started' | 'in-progress' | 'completed';
  currentDay: number;
  totalDays: number;
  daysProgress: IPlanDayProgress[];
  completedItemIds: string[];
  completedDayNumbers: number[];
  startedAt: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  rating?: number; // 1-5, only after completion
  review?: string;
  isSaved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlanDayProgressSchema = new Schema<IPlanDayProgress>(
  {
    dayNumber: {
      type: Number,
      required: true,
    },
    dayId: {
      type: String,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    scrollPosition: {
      type: Number,
      default: 0,
    },
    readingState: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed'],
      default: 'not-started',
    },
    completedItemIds: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const PlanProgressSchema = new Schema<IPlanProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'completed'],
      default: 'not-started',
      index: true,
    },
    currentDay: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    daysProgress: {
      type: [PlanDayProgressSchema],
      default: [],
    },
    completedItemIds: {
      type: [String],
      default: [],
    },
    completedDayNumbers: {
      type: [Number],
      default: [],
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review cannot exceed 1000 characters'],
    },
    isSaved: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'plan_progress',
  }
);

// Indexes for efficient queries
PlanProgressSchema.index({ userId: 1, status: 1 });
PlanProgressSchema.index({ userId: 1, planId: 1 }, { unique: true });
PlanProgressSchema.index({ userId: 1, lastAccessedAt: -1 });

export const PlanProgress: Model<IPlanProgress> =
  mongoose.models.PlanProgress ||
  mongoose.model<IPlanProgress>('PlanProgress', PlanProgressSchema);

