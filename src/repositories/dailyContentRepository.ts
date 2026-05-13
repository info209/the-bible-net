import { DailyContent, IDailyContent } from '@/models/DailyContent';

export class DailyContentRepository {
    static async findByDate(date: string): Promise<IDailyContent | null> {
        return await DailyContent.findOne({ date });
    }

    static async findLastNDays(endDate: string, days: number): Promise<IDailyContent[]> {
        const d = new Date(endDate);
        d.setDate(d.getDate() - days + 1);
        const startDate = d.toISOString().split('T')[0];
        
        return await DailyContent.find({
            date: { $gte: startDate, $lte: endDate },
            isPublished: true
        }).sort({ date: -1 });
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
