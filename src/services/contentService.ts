import { ContentRepository } from '@/repositories/contentRepository';
import { IContent, ContentType } from '@/models/Content';

export class ContentService {
    static async createContent(data: Partial<IContent>): Promise<IContent> {
        return await ContentRepository.create(data);
    }

    static async listContent(type: ContentType): Promise<IContent[]> {
        return await ContentRepository.findByType(type);
    }

    static async getContentById(id: string): Promise<IContent | null> {
        return await ContentRepository.findById(id);
    }

    static async updateContent(id: string, data: Partial<IContent>): Promise<IContent | null> {
        const existing = await this.getContentById(id);
        if (!existing) return null;

        // Enforce consistency between type and fields
        if (data.type) {
            if (data.type === 'verse') data.title = undefined;
            if (data.type === 'devotion') data.reference = undefined;
        }

        return await ContentRepository.update(id, data);
    }

    static async deleteContent(id: string): Promise<boolean> {
        return await ContentRepository.delete(id);
    }
}
