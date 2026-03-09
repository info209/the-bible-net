import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdminLog extends Document {
    adminId: mongoose.Types.ObjectId;
    action: string;
    details?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
    {
        adminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        details: {
            type: String,
        },
        ipAddress: {
            type: String,
        },
        userAgent: {
            type: String,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Index for better query performance
AdminLogSchema.index({ adminId: 1, createdAt: -1 });
AdminLogSchema.index({ action: 1 });

export const AdminLog: Model<IAdminLog> =
    mongoose.models.AdminLog || mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);
