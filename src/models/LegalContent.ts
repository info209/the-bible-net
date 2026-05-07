import mongoose, { Schema, Document, Model } from 'mongoose';

export type LegalContentType = 'terms' | 'privacy';

export interface ILegalContent extends Document {
    type: LegalContentType;
    title: string;
    content: string; // HTML content
    isActive: boolean;
    lastUpdated: Date;
    createdAt: Date;
    updatedAt: Date;
}

const LegalContentSchema = new Schema<ILegalContent>(
    {
        type: {
            type: String,
            enum: ['terms', 'privacy'],
            required: [true, 'Type is required (terms or privacy)'],
            unique: true, // Ensuring only one active version per type is easiest, or we can allow multiple and pick the active one.
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        content: {
            type: String,
            required: [true, 'Content is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for type
LegalContentSchema.index({ type: 1 });

export const LegalContent: Model<ILegalContent> =
    mongoose.models.LegalContent || mongoose.model<ILegalContent>('LegalContent', LegalContentSchema);
