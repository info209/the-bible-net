import { LegalContent, ILegalContent, LegalContentType } from '@/models/LegalContent';
import { connectDB } from '@/lib/db';

export class LegalService {
    static async getLegalContent(type: LegalContentType): Promise<ILegalContent | null> {
        await connectDB();
        return await LegalContent.findOne({ type, isActive: true }).exec();
    }

    static async getAllLegalContent(): Promise<ILegalContent[]> {
        await connectDB();
        return await LegalContent.find().sort({ type: 1 }).exec();
    }

    static async upsertLegalContent(data: Partial<ILegalContent>): Promise<ILegalContent> {
        await connectDB();
        const { type, title, content, isActive } = data;
        
        if (!type) throw new Error('Type is required');

        const existing = await LegalContent.findOne({ type });
        
        if (existing) {
            existing.title = title || existing.title;
            existing.content = content || existing.content;
            existing.isActive = isActive !== undefined ? isActive : existing.isActive;
            existing.lastUpdated = new Date();
            return await existing.save();
        } else {
            const newContent = new LegalContent({
                type,
                title: title || (type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'),
                content: content || '',
                isActive: isActive !== undefined ? isActive : true,
                lastUpdated: new Date(),
            });
            return await newContent.save();
        }
    }

    static async deleteLegalContent(id: string): Promise<boolean> {
        await connectDB();
        const result = await LegalContent.findByIdAndDelete(id).exec();
        return !!result;
    }
}
