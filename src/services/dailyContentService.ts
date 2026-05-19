import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { IDailyContent } from '@/models/DailyContent';
import { Book, Chapter, Verse, BibleVersion } from '@/models/Bible';
import connectDB from '@/lib/db';

// Static caches for dynamic scripture text resolutions
const verseTextCache = new Map<string, string>();
const referenceTextCache = new Map<string, string>();

export class DailyContentService {
    /**
     * Retrieves daily content for the last N days, with verse text resolved
     * dynamically based on the user's preferred Bible version.
     */
    static async getRecentDailyContent(days: number = 7, version: string = 'KJV'): Promise<any[]> {
        const todayStr = new Date().toISOString().split('T')[0];
        const contents = await DailyContentRepository.findLastNDays(todayStr, days);

        // Resolve verse text for each content item
        const enriched = await Promise.all(
            contents.map(c => this.enrichWithVerseText(c, version))
        );

        return enriched;
    }

    /**
     * Legacy method for fetching a specific type (used by older APIs)
     */
    static async getDailyContent(type: 'verse' | 'devotion', version: string = 'KJV'): Promise<any | null> {
        const todayStr = new Date().toISOString().split('T')[0];

        let dailySelection = await DailyContentRepository.findByDate(todayStr);
        if (!dailySelection) return null;

        if (type === 'verse') {
            const resolvedText = dailySelection.verseBook && dailySelection.verseBook !== 'Unknown'
                ? await this.resolveVerseText(
                    dailySelection.verseBook,
                    dailySelection.verseChapter!,
                    dailySelection.verseNumber!,
                    version
                )
                : '';
            return {
                _id: dailySelection._id,
                type: 'daily-verse',
                reference: dailySelection.verseReference || '',
                text: resolvedText,
                version,
                likeCount: dailySelection.verseLikeCount || 0,
                commentCount: dailySelection.verseCommentCount || 0,
            };
        } else {
            return {
                _id: dailySelection._id,
                type: 'daily-devotion',
                title: dailySelection.devotionalTitle || '',
                text: dailySelection.devotionalContent || '',
                verseRef: dailySelection.devotionalVerseRef || '',
                likeCount: dailySelection.devotionLikeCount || 0,
                commentCount: dailySelection.devotionCommentCount || 0,
            };
        }
    }

    /**
     * Enriches a DailyContent record with version-resolved verse text.
     */
    static async enrichWithVerseText(content: IDailyContent, version: string): Promise<any> {
        const hasVerse = content.verseBook && content.verseBook !== 'Unknown';
        const resolvedText = hasVerse
            ? await this.resolveVerseText(
                content.verseBook!,
                content.verseChapter!,
                content.verseNumber!,
                version
            )
            : '';

        return {
            _id: content._id,
            date: content.date,
            verseReference: content.verseReference || '',
            verseBook: content.verseBook || '',
            verseChapter: content.verseChapter || null,
            verseNumber: content.verseNumber || null,
            verse: resolvedText,
            version,
            devotionalTitle: content.devotionalTitle || '',
            devotionalContent: content.devotionalContent || '',
            devotionalVerseRef: content.devotionalVerseRef || '',
            devotionalVerseText: content.devotionalVerseRef ? await this.resolveReferenceText(content.devotionalVerseRef, version) : '',
            backgroundImage: content.backgroundImage || '',
            devotionalBackgroundImage: content.devotionalBackgroundImage || '',
            prayerTitle: (content as any).prayerTitle || '',
            prayerContent: (content as any).prayerContent || '',
            isPublished: content.isPublished,
            verseLikeCount: content.verseLikeCount || 0,
            verseCommentCount: content.verseCommentCount || 0,
            devotionLikeCount: content.devotionLikeCount || 0,
            devotionCommentCount: content.devotionCommentCount || 0,
        };
    }

    /**
     * Resolves verse text from the Bible DB for a given book/chapter/verse and version.
     * Falls back to any available version if the requested one is not found.
     */
    static async resolveVerseText(
        bookName: string,
        chapter: number,
        verseNum: number,
        versionAbbr: string
    ): Promise<string> {
        const cacheKey = `${bookName.toLowerCase()}:${chapter}:${verseNum}:${versionAbbr.toUpperCase()}`;
        if (verseTextCache.has(cacheKey)) {
            return verseTextCache.get(cacheKey)!;
        }

        const resolve = async (): Promise<string> => {
            try {
                await connectDB();

                // Find the requested version
                let bibleVersion = await BibleVersion.findOne({
                    abbreviation: versionAbbr.toUpperCase(),
                    isActive: true
                }).lean();

                // Fallback: any active version
                if (!bibleVersion) {
                    bibleVersion = await BibleVersion.findOne({ isActive: true }).lean();
                }

                if (!bibleVersion) return `[${bookName} ${chapter}:${verseNum}]`;

                // Find the book in this version
                const bookDoc = await Book.findOne({
                    version: bibleVersion._id,
                    name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                }).lean();

                if (!bookDoc) {
                    // Try by order across versions
                    const anyBook = await Book.findOne({
                        name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                    }).lean();
                    if (!anyBook) return `[${bookName} ${chapter}:${verseNum}]`;

                    // Find same order book in target version
                    const sameOrderBook = await Book.findOne({
                        version: bibleVersion._id,
                        order: anyBook.order
                    }).lean();
                    if (!sameOrderBook) return `[${bookName} ${chapter}:${verseNum}]`;

                    const chapterDoc = await Chapter.findOne({ book: sameOrderBook._id, number: chapter }).lean();
                    if (!chapterDoc) return `[${bookName} ${chapter}:${verseNum}]`;

                    const verseDoc = await Verse.findOne({ chapter: chapterDoc._id, number: verseNum }).lean();
                    return verseDoc?.text || `[${bookName} ${chapter}:${verseNum}]`;
                }

                const chapterDoc = await Chapter.findOne({ book: bookDoc._id, number: chapter }).lean();
                if (!chapterDoc) return `[${bookName} ${chapter}:${verseNum}]`;

                const verseDoc = await Verse.findOne({ chapter: chapterDoc._id, number: verseNum }).lean();
                return verseDoc?.text || `[${bookName} ${chapter}:${verseNum}]`;
            } catch (error) {
                console.error('resolveVerseText error:', error);
                return `[${bookName} ${chapter}:${verseNum}]`;
            }
        };

        const result = await resolve();
        verseTextCache.set(cacheKey, result);
        return result;
    }

    /**
     * Parses a reference string like "John 3:16", "Psalm 91:1-4", or "1 John 1:9"
     */
    static parseReference(reference: string): { bookName: string, chapter: number, startVerse: number, endVerse?: number } | null {
        // Matches references like "1 John 3:16-18", "Song of Solomon 1:1"
        const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
        if (!match) return null;
        return {
            bookName: match[1].trim(),
            chapter: parseInt(match[2], 10),
            startVerse: parseInt(match[3], 10),
            endVerse: match[4] ? parseInt(match[4], 10) : undefined
        };
    }

    /**
     * Resolves a full reference string dynamically fetching the exact scripture.
     */
    static async resolveReferenceText(reference: string, versionAbbr: string): Promise<string> {
        const cacheKey = `${reference.toLowerCase()}:${versionAbbr.toUpperCase()}`;
        if (referenceTextCache.has(cacheKey)) {
            return referenceTextCache.get(cacheKey)!;
        }

        const resolve = async (): Promise<string> => {
            const parsed = this.parseReference(reference);
            if (!parsed) return `[${reference}]`;

            const { bookName, chapter, startVerse, endVerse } = parsed;

            try {
                await connectDB();
                let bibleVersion = await BibleVersion.findOne({
                    abbreviation: versionAbbr.toUpperCase(),
                    isActive: true
                }).lean();

                if (!bibleVersion) {
                    bibleVersion = await BibleVersion.findOne({ isActive: true }).lean();
                }
                if (!bibleVersion) return `[${reference}]`;

                // Find book
                let bookDoc = await Book.findOne({
                    version: bibleVersion._id,
                    name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                }).lean();

                if (!bookDoc) {
                    const anyBook = await Book.findOne({
                        name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                    }).lean();
                    if (!anyBook) return `[${reference}]`;

                    bookDoc = await Book.findOne({
                        version: bibleVersion._id,
                        order: anyBook.order
                    }).lean();
                    
                    if (!bookDoc) return `[${reference}]`;
                }

                const chapterDoc = await Chapter.findOne({ book: bookDoc._id, number: chapter }).lean();
                if (!chapterDoc) return `[${reference}]`;

                const query: any = { chapter: chapterDoc._id };
                if (endVerse) {
                    query.number = { $gte: startVerse, $lte: endVerse };
                } else {
                    query.number = startVerse;
                }

                const verses = await Verse.find(query).sort({ number: 1 }).lean();
                if (!verses || verses.length === 0) return `[${reference}]`;

                return verses.map(v => v.text).join(' ');
            } catch (error) {
                console.error('resolveReferenceText error:', error);
                return `[${reference}]`;
            }
        };

        const result = await resolve();
        referenceTextCache.set(cacheKey, result);
        return result;
    }
}
