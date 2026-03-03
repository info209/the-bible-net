import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { ContentRepository } from '@/repositories/contentRepository';
import { IDailyContent } from '@/models/DailyContent';
import { ContentType, IContent } from '@/models/Content';

export class DailyContentService {
    /**
     * Retrieves daily content (verse or devotion) for the current UTC date.
     * If doesn't exist, selects and stores it.
     */
    static async getDailyContent(type: ContentType): Promise<IContent | null> {
        const todayStr = new Date().toISOString().split('T')[0]; // Current UTC date in YYYY-MM-DD

        let dailySelection = await DailyContentRepository.findByDate(todayStr);

        if (!dailySelection) {
            // Rotate and create for today
            dailySelection = await this.rotateDailyContent(todayStr);
        }

        if (!dailySelection) return null;

        if (type === 'verse') {
            return dailySelection.verseId as unknown as IContent;
        } else {
            return dailySelection.devotionId as unknown as IContent;
        }
    }

    /**
     * Rotates daily content by selecting one random verse and one random devotion for the date.
     * This handles the 00:00 UTC rotation logic automatically on the first request of the day.
     */
    private static async rotateDailyContent(date: string): Promise<IDailyContent | null> {
        const [verse, devotion] = await Promise.all([
            ContentRepository.getRandom('verse'),
            ContentRepository.getRandom('devotion')
        ]);

        if (!verse || !devotion) {
            // Fallback or log: cannot rotate if both aren't available
            return null;
        }

        try {
            // Attempt to create daily selection. Use try-catch because of potential race conditions 
            // leading to duplicate key error (if multiple users request simultaneously).
            return await DailyContentRepository.create({
                date,
                verseId: verse._id as any,
                devotionId: devotion._id as any
            });
        } catch (error: any) {
            // Handle race condition: check if already created by another request
            if (error.code === 11000) {
                return await DailyContentRepository.findByDate(date);
            }
            throw error;
        }
    }
}
