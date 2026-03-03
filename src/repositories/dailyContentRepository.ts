import { DailyContent, IDailyContent } from '@/models/DailyContent';

export class DailyContentRepository {
    static async findByDate(date: string): Promise<IDailyContent | null> {
        return await DailyContent.findOne({ date }).populate('verseId devotionId');
    }

    static async create(data: Partial<IDailyContent>): Promise<IDailyContent> {
        const daily = new DailyContent(data);
        return await daily.save();
    }

    static async clearBeforeDate(date: string): Promise<number> {
        const result = await DailyContent.deleteMany({ date: { $lt: date } });
        return result.deletedCount;
    }
}
