import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { ContentRepository } from '@/repositories/contentRepository';
import { IDailyContent } from '@/models/DailyContent';
import { ContentType, IContent } from '@/models/Content';

export class DailyContentService {
    /**
     * Retrieves daily content for the last 7 days.
     * Ensures today's content exists (rotates if not).
     */
    static async getRecentDailyContent(days: number = 7): Promise<IDailyContent[]> {
        const todayStr = new Date().toISOString().split('T')[0];

        // Ensure today's content exists
        let todayContent = await DailyContentRepository.findByDate(todayStr);
        if (!todayContent) {
            todayContent = await this.rotateDailyContent(todayStr);
        }

        return await DailyContentRepository.findLastNDays(todayStr, days);
    }

    /**
     * Legacy method for fetching a specific type (used by older APIs)
     */
    static async getDailyContent(type: ContentType): Promise<any | null> {
        const todayStr = new Date().toISOString().split('T')[0];

        let dailySelection = await DailyContentRepository.findByDate(todayStr);

        if (!dailySelection) {
            dailySelection = await this.rotateDailyContent(todayStr);
        }

        if (!dailySelection) return null;

        if (type === 'verse') {
            return {
                _id: dailySelection._id,
                type: 'daily-verse',
                reference: dailySelection.verseReference,
                text: dailySelection.verse,
                likeCount: 0,
                commentCount: 0
            };
        } else {
            return {
                _id: dailySelection._id,
                type: 'daily-devotion',
                title: dailySelection.devotionalTitle,
                text: dailySelection.devotionalContent,
                likeCount: 0,
                commentCount: 0
            };
        }
    }

    /**
     * Rotates daily content by selecting one random verse and one random devotion for the date.
     * Maps the Content fields to the new DailyContent flat structure.
     */
    private static async rotateDailyContent(date: string): Promise<IDailyContent | null> {
        const [verse, devotion] = await Promise.all([
            ContentRepository.getRandom('verse'),
            ContentRepository.getRandom('devotion')
        ]);

        if (!verse || !devotion) {
            return null;
        }

        try {
            return await DailyContentRepository.create({
                date,
                verse: verse.text,
                verseReference: verse.reference || '',
                devotionalTitle: devotion.title || '',
                devotionalContent: devotion.text,
                isPublished: true,
            });
        } catch (error: any) {
            if (error.code === 11000) {
                return await DailyContentRepository.findByDate(date);
            }
            throw error;
        }
    }
}
