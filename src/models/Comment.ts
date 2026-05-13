import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
    userId: mongoose.Types.ObjectId;
    contentId: mongoose.Types.ObjectId;
    contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion';
    commentText: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
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
        commentText: {
            type: String,
            required: true,
            trim: true,
            maxlength: [500, 'Comment cannot exceed 500 characters'],
        },
    },
    {
        timestamps: true,
    }
);

CommentSchema.index({ contentId: 1, contentType: 1, createdAt: -1 });

export const Comment: Model<IComment> =
    mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
