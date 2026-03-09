import { Content, IContent, ContentType } from '@/models/Content';
import mongoose from 'mongoose';

export class ContentRepository {
    static async create(data: Partial<IContent>): Promise<IContent> {
        const content = new Content(data);
        return await content.save();
    }

    static async findByType(type: ContentType): Promise<IContent[]> {
        return await Content.find({ type }).sort({ createdAt: -1 });
    }

    static async findById(id: string): Promise<IContent | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        return await Content.findById(id);
    }

    static async update(id: string, data: Partial<IContent>): Promise<IContent | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) return null;
        return await Content.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
    }

    static async delete(id: string): Promise<boolean> {
        if (!mongoose.Types.ObjectId.isValid(id)) return false;
        const result = await Content.findByIdAndDelete(id);
        return !!result;
    }

    /**
     * For daily rotation: Get a random content of specific type
     */
    static async getRandom(type: ContentType): Promise<IContent | null> {
        const count = await Content.countDocuments({ type });
        if (count === 0) return null;
        const randomIndex = Math.floor(Math.random() * count);
        return await Content.findOne({ type }).skip(randomIndex);
    }
}
