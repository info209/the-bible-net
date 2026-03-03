import mongoose, { Schema, Document, Model } from 'mongoose';

export type ContentType = 'verse' | 'devotion';

export interface IContent extends Document {
    type: ContentType;
    title?: string;
    reference?: string;
    text: string;
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
                return this.type === 'verse';
            },
            trim: true,
            maxlength: [100, 'Reference cannot exceed 100 characters'],
        },
        text: {
            type: String,
            required: [true, 'Text content is required'],
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
