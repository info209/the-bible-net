import mongoose, { Schema, Document } from 'mongoose';

export interface IFileMetadata extends Document {
  userId: string;
  filePath: string;
  fileName: string;
  bucket: string;
  size: number;
  mimeType: string;
  isPrivate: boolean;
  createdAt: Date;
}

const FileMetadataSchema = new Schema<IFileMetadata>({
  userId: { type: String, required: true, index: true },
  filePath: { type: String, required: true, unique: true },
  fileName: { type: String, required: true },
  bucket: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const FileMetadata = mongoose.models.FileMetadata || mongoose.model<IFileMetadata>('FileMetadata', FileMetadataSchema);
