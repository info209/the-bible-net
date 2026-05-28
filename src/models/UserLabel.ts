import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserLabel extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  createdAt: Date;
}

const UserLabelSchema = new Schema<IUserLabel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'user_labels',
  }
);

// Each user can only have one entry per label (case-sensitive dedup enforced at app layer)
UserLabelSchema.index({ userId: 1, label: 1 }, { unique: true });
// Listing all labels for a user
UserLabelSchema.index({ userId: 1, createdAt: -1 });

export const UserLabel: Model<IUserLabel> =
  mongoose.models.UserLabel ||
  mongoose.model<IUserLabel>('UserLabel', UserLabelSchema);
