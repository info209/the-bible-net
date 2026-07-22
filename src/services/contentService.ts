import { ContentRepository } from '@/repositories/contentRepository';
import { IContent, ContentType } from '@/models/Content';
import { CacheService, CacheKeys, CACHE_TTL } from '@/services/cacheService';

export class ContentService {
    static async createContent(data: Partial<IContent>): Promise<IContent> {
        const created = await ContentRepository.create(data);
        await CacheService.invalidatePattern('tbnet:content:*');
        return created;
    }

    static async listContent(type: ContentType): Promise<IContent[]> {
        const cacheKey = CacheKeys.contentList(type);
        return CacheService.getOrSet(cacheKey, async () => {
            return await ContentRepository.findByType(type);
        }, CACHE_TTL.CONTENT);
    }

    static async getContentById(id: string): Promise<IContent | null> {
        const cacheKey = CacheKeys.contentById(id);
        return CacheService.getOrSet(cacheKey, async () => {
            return await ContentRepository.findById(id);
        }, CACHE_TTL.CONTENT);
    }

    static async updateContent(id: string, data: Partial<IContent>): Promise<IContent | null> {
        const existing = await ContentRepository.findById(id);
        if (!existing) return null;

        // Enforce consistency between type and fields
        if (data.type) {
            if (data.type === 'verse') data.title = undefined;
            if (data.type === 'devotion') data.reference = undefined;
        }

        const updated = await ContentRepository.update(id, data);
        await CacheService.invalidatePattern('tbnet:content:*');
        return updated;
    }

    static async deleteContent(id: string): Promise<boolean> {
        const deleted = await ContentRepository.delete(id);
        await CacheService.invalidatePattern('tbnet:content:*');
        return deleted;
    }
}
