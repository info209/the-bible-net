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

    static async findByYear(year: number): Promise<IDailyContent[]> {
        return await DailyContent.find({ contentYear: year }).sort({ date: 1 });
    }

    static async findExistingVerseRefsForYear(year: number): Promise<Set<string>> {
        const records = await DailyContent.find(
            { contentYear: year },
            { verseBook: 1, verseChapter: 1, verseNumber: 1 }
        ).lean();

        const set = new Set<string>();
        for (const r of records) {
            set.add(`${r.verseBook.toLowerCase()}:${r.verseChapter}:${r.verseNumber}`);
        }
        return set;
    }

    static async findExistingDatesForYear(year: number): Promise<Set<string>> {
        const records = await DailyContent.find(
            { contentYear: year },
            { date: 1 }
        ).lean();
        return new Set(records.map(r => r.date));
    }

    static async create(data: Partial<IDailyContent>): Promise<IDailyContent> {
        const daily = new DailyContent(data);
        return await daily.save();
    }

    static async upsertByDate(date: string, data: Partial<IDailyContent>): Promise<IDailyContent> {
        return await DailyContent.findOneAndUpdate(
            { date },
            { $set: data },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ) as IDailyContent;
    }

    static async bulkUpsert(records: Partial<IDailyContent>[]): Promise<{ upserted: number; modified: number }> {
        if (records.length === 0) return { upserted: 0, modified: 0 };

        const ops = records.map(record => ({
            updateOne: {
                filter: { date: record.date },
                update: { $set: record },
                upsert: true,
            }
        }));

        const result = await DailyContent.bulkWrite(ops, { ordered: false });
        return {
            upserted: result.upsertedCount,
            modified: result.modifiedCount,
        };
    }

    static async getCoverageForYear(year: number): Promise<string[]> {
        const records = await DailyContent.find(
            { contentYear: year, isPublished: true },
            { date: 1 }
        ).lean();
        return records.map(r => r.date);
    }

    static async deleteAll(): Promise<number> {
        const result = await DailyContent.deleteMany({});
        return result.deletedCount;
    }

    static async clearBeforeDate(date: string): Promise<number> {
        const result = await DailyContent.deleteMany({ date: { $lt: date } });
        return result.deletedCount;
    }

    static async findById(id: string): Promise<IDailyContent | null> {
        return await DailyContent.findById(id);
    }

    static async updateById(id: string, data: Partial<IDailyContent>): Promise<IDailyContent | null> {
        return await DailyContent.findByIdAndUpdate(
            id,
            { $set: data },
            { returnDocument: 'after', runValidators: true }
        );
    }

    static async deleteById(id: string): Promise<boolean> {
        const result = await DailyContent.findByIdAndDelete(id);
        return !!result;
    }

    static async findAll(filter?: { year?: number; month?: number }, page = 1, limit = 50): Promise<{ data: IDailyContent[]; total: number }> {
        const query: any = {};
        if (filter?.year) query.contentYear = filter.year;
        if (filter?.month) {
            const y = filter.year || new Date().getFullYear();
            const monthStr = String(filter.month).padStart(2, '0');
            query.date = { $gte: `${y}-${monthStr}-01`, $lte: `${y}-${monthStr}-31` };
        }

        const [data, total] = await Promise.all([
            DailyContent.find(query).sort({ date: -1 }).skip((page - 1) * limit).limit(limit),
            DailyContent.countDocuments(query),
        ]);
        return { data, total };
    }
}
