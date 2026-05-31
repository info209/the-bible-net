import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserFolder extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
}

const UserFolderSchema = new Schema<IUserFolder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'user_folders',
  }
);

// Ensure a user cannot have two folders with the exact same name
UserFolderSchema.index({ userId: 1, name: 1 }, { unique: true });

export const UserFolder: Model<IUserFolder> =
  mongoose.models.UserFolder ||
  mongoose.model<IUserFolder>('UserFolder', UserFolderSchema);
