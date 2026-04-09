import mongoose, { Schema, Document, Model } from 'mongoose';

export type ContentType = 'verse' | 'devotion';

export interface IContent extends Document {
    type: ContentType;
    title?: string;
    reference?: string;
    text: string;
    summary?: string;
    highlightQuote?: string;
    likeCount: number;
    commentCount: number;
    audioUrl?: string;
    bgColor?: string;
    version?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
    {
        type: {
            type: String,
            enum: ['verse', 'devotion'],
            required: [true, 'Content type is required (verse or devotion)'],
        },
        title: {
            type: String,
            required: function (this: IContent) {
                return this.type === 'devotion';
            },
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        reference: {
            type: String,
            required: function (this: IContent) {
                return this.type === 'verse' || this.type === 'devotion'; // Devotions also have a reference
            },
            trim: true,
            maxlength: [100, 'Reference cannot exceed 100 characters'],
        },
        text: {
            type: String,
            required: [true, 'Text content is required'],
            trim: true,
        },
        summary: {
            type: String,
            trim: true,
            maxlength: [1000, 'Summary cannot exceed 1000 characters'],
        },
        highlightQuote: {
            type: String,
            trim: true,
            maxlength: [500, 'Highlight quote cannot exceed 500 characters'],
        },
        likeCount: {
            type: Number,
            default: 0,
        },
        commentCount: {
            type: Number,
            default: 0,
        },
        audioUrl: {
            type: String,
            trim: true,
        },
        bgColor: {
            type: String,
            trim: true,
        },
        version: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster lookups
ContentSchema.index({ type: 1, createdAt: -1 });

export const Content: Model<IContent> =
    mongoose.models.Content || mongoose.model<IContent>('Content', ContentSchema);
