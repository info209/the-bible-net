import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDailyContent extends Document {
    date: string; // ISO format: YYYY-MM-DD (UTC)
    verseId: mongoose.Types.ObjectId;
    devotionId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const DailyContentSchema = new Schema<IDailyContent>(
    {
        date: {
            type: String, // String for easier matching (YYYY-MM-DD)
            required: [true, 'Date is required in YYYY-MM-DD format'],
            unique: true,
            index: true,
        },
        verseId: {
            type: Schema.Types.ObjectId,
            ref: 'Content',
            required: true,
        },
        devotionId: {
            type: Schema.Types.ObjectId,
            ref: 'Content',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const DailyContent: Model<IDailyContent> =
    mongoose.models.DailyContent ||
    mongoose.model<IDailyContent>('DailyContent', DailyContentSchema);
