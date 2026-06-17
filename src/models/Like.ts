import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILike extends Document {
    contentId: mongoose.Types.ObjectId;
    contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion';
    userId?: mongoose.Types.ObjectId;
    guestIdentifier?: string; // cookie, fingerprint, or session id
    createdAt: Date;
    updatedAt: Date;
}

const LikeSchema = new Schema<ILike>(
    {
        contentId: {
            type: Schema.Types.ObjectId,
            required: true,
            // ref is omitted because it can refer to Content or DailyContent
        },
        contentType: {
            type: String,
            enum: ['verse', 'devotion', 'daily-verse', 'daily-devotion'],
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
LikeSchema.index(
    { contentId: 1, contentType: 1, userId: 1 }, 
    { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);
LikeSchema.index(
    { contentId: 1, contentType: 1, guestIdentifier: 1 }, 
    { unique: true, partialFilterExpression: { guestIdentifier: { $exists: true } } }
);

export const Like: Model<ILike> =
    mongoose.models.Like || mongoose.model<ILike>('Like', LikeSchema);

// Drop obsolete index if it exists, to fix duplicate key error for guests
Like.collection.dropIndex('userId_verseId').catch(() => {
    // Index might not exist, silently ignore
});
Like.collection.dropIndex('contentId_1_userId_1').catch(() => {
    // Index might not exist, silently ignore
});
Like.collection.dropIndex('contentId_1_guestIdentifier_1').catch(() => {
    // Index might not exist, silently ignore
});
