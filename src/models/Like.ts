import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILike extends Document {
    contentId: mongoose.Types.ObjectId;
    contentType: 'verse' | 'devotion';
    userId?: mongoose.Types.ObjectId;
    guestIdentifier?: string; // cookie, fingerprint, or session id
    createdAt: Date;
    updatedAt: Date;
}

const LikeSchema = new Schema<ILike>(
    {
        contentId: {
            type: Schema.Types.ObjectId,
            ref: 'Content',
            required: true,
        },
        contentType: {
            type: String,
            enum: ['verse', 'devotion'],
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
        guestIdentifier: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fast count and duplicate prevention
LikeSchema.index({ contentId: 1, contentType: 1 });
LikeSchema.index({ contentId: 1, userId: 1 }, { unique: true, sparse: true });
LikeSchema.index({ contentId: 1, guestIdentifier: 1 }, { unique: true, sparse: true });

export const Like: Model<ILike> =
    mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);
