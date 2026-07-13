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
            const blocks = await this.resolveDevotionalVerseBlocks(dailySelection, version);
            const concatenatedText = blocks.map(b => b.text).filter(Boolean).join(' ');
            return {
                _id: dailySelection._id,
                type: 'daily-devotion',
                title: dailySelection.devotionalTitle || '',
                text: dailySelection.devotionalContent || '',
                // Backward-compat single ref
                verseRef: dailySelection.devotionalVerseRef || '',
                verseText: concatenatedText,
                // New: per-ref blocks
                verseBlocks: blocks,
                likeCount: dailySelection.devotionLikeCount || 0,
                commentCount: dailySelection.devotionCommentCount || 0,
            };
        }
    }

    /**
     * Enriches a DailyContent record with version-resolved verse text.
     * For devotionals, resolves ALL referenced verses using batched DB queries.
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

        // Resolve devotional verse blocks (multi-ref aware, backward-compatible)
        const devotionalVerseBlocks = await this.resolveDevotionalVerseBlocks(content, version);

        // For backward compat: concatenate all block texts into a single string
        const devotionalVerseText = devotionalVerseBlocks.map(b => b.text).filter(Boolean).join(' ');

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
            // Legacy single-ref fields — preserved for backward compat
            devotionalVerseRef: content.devotionalVerseRef || '',
            devotionalVerseText,
            // New: per-ref blocks for the expanded view
            devotionalVerseBlocks,
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

    // ─── Devotional Multi-Ref Resolution ─────────────────────────────────────

    /**
     * Resolves devotional verse blocks for a single DailyContent record.
     *
     * Priority:
     *   1. Use content.devotionalVerseRefs (new normalized array) if present and non-empty.
     *   2. Fall back to parsing content.devotionalVerseRef (legacy string) via the parser.
     *   3. If neither is present, return [].
     *
     * Batches DB queries: one query per unique (book, chapter) pair across all refs.
     */
    static async resolveDevotionalVerseBlocks(
        content: IDailyContent,
        version: string
    ): Promise<Array<{ ref: string; text: string }>> {
        const { parseVerseReferences } = await import('@/utils/verseReferenceParser');

        let refs = (content as any).devotionalVerseRefs as Array<{
            book: string; chapter: number; startVerse: number; endVerse: number;
        }> | undefined;

        // Backward compat: promote legacy single-ref string to array on the fly
        if (!refs || refs.length === 0) {
            if (content.devotionalVerseRef) {
                const parsed = parseVerseReferences(content.devotionalVerseRef);
                refs = parsed.refs;
            }
        }

        if (!refs || refs.length === 0) return [];

        return this.resolveMultipleRefs(refs, version);
    }

    /**
     * Batch-resolves an array of ParsedVerseRef into { ref, text } blocks.
     *
     * Groups refs by (book, chapter) — fetches each chapter ONCE,
     * then extracts individual verses from memory.
     * Preserves insertion order. Skips missing refs gracefully (logs a warning).
     */
    static async resolveMultipleRefs(
        refs: Array<{ book: string; chapter: number; startVerse: number; endVerse: number }>,
        versionAbbr: string
    ): Promise<Array<{ ref: string; text: string }>> {
        if (!refs || refs.length === 0) return [];

        try {
            await connectDB();

            // Resolve Bible version once
            let bibleVersion = await BibleVersion.findOne({
                abbreviation: versionAbbr.toUpperCase(),
                isActive: true
            }).lean();
            if (!bibleVersion) {
                bibleVersion = await BibleVersion.findOne({ isActive: true }).lean();
            }
            if (!bibleVersion) {
                return refs.map(r => ({ ref: this._formatRef(r), text: '' }));
            }

            // Group refs by "book:chapter" to batch DB queries
            type ChapterKey = string;
            const keyedRefs = new Map<ChapterKey, Array<typeof refs[0]>>();
            for (const ref of refs) {
                const key: ChapterKey = `${ref.book.toLowerCase()}:${ref.chapter}`;
                if (!keyedRefs.has(key)) keyedRefs.set(key, []);
                keyedRefs.get(key)!.push(ref);
            }

            // For each unique (book, chapter): look up book → chapter → verses in one query
            const chapterVerseMap = new Map<ChapterKey, Map<number, string>>();

            for (const [key] of keyedRefs) {
                const colonIdx = key.indexOf(':');
                const bookNameLower = key.slice(0, colonIdx);
                const chapter = parseInt(key.slice(colonIdx + 1), 10);

                // Escape regex special chars in book name
                const escapedBookName = bookNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                // Find book in target version
                let bookDoc = await Book.findOne({
                    version: bibleVersion._id,
                    name: { $regex: new RegExp(`^${escapedBookName}$`, 'i') }
                }).lean();

                if (!bookDoc) {
                    // Cross-version fallback
                    const anyBook = await Book.findOne({
                        name: { $regex: new RegExp(`^${escapedBookName}$`, 'i') }
                    }).lean();
                    if (anyBook) {
                        bookDoc = await Book.findOne({
                            version: bibleVersion._id,
                            order: anyBook.order
                        }).lean();
                    }
                }

                if (!bookDoc) {
                    console.warn(`[resolveMultipleRefs] Book not found in version: ${bookNameLower}`);
                    continue;
                }

                const chapterDoc = await Chapter.findOne({
                    book: bookDoc._id,
                    number: chapter
                }).lean();

                if (!chapterDoc) {
                    console.warn(`[resolveMultipleRefs] Chapter ${chapter} not found in ${bookNameLower}`);
                    continue;
                }

                // Determine min/max verse range needed for this chapter
                const neededRefs = keyedRefs.get(key)!;
                let minVerse = Infinity, maxVerse = -Infinity;
                for (const r of neededRefs) {
                    minVerse = Math.min(minVerse, r.startVerse);
                    maxVerse = Math.max(maxVerse, r.endVerse);
                }

                // Single DB query for all needed verses in this chapter range
                const versesDocs = await Verse.find({
                    chapter: chapterDoc._id,
                    number: { $gte: minVerse, $lte: maxVerse }
                }).sort({ number: 1 }).lean();

                const verseNumToText = new Map<number, string>();
                for (const v of versesDocs) {
                    verseNumToText.set(v.number, v.text);
                }
                chapterVerseMap.set(key, verseNumToText);
            }

            // Assemble blocks in original insertion order
            const blocks: Array<{ ref: string; text: string }> = [];
            for (const ref of refs) {
                const key: ChapterKey = `${ref.book.toLowerCase()}:${ref.chapter}`;
                const verseMap = chapterVerseMap.get(key);
                const refLabel = this._formatRef(ref);

                if (!verseMap) {
                    console.warn(`[resolveMultipleRefs] No verse data for ${refLabel} — skipping`);
                    blocks.push({ ref: refLabel, text: '' });
                    continue;
                }

                const texts: string[] = [];
                for (let v = ref.startVerse; v <= ref.endVerse; v++) {
                    const t = verseMap.get(v);
                    if (t) texts.push(t);
                }

                blocks.push({ ref: refLabel, text: texts.join(' ') });
            }

            return blocks;
        } catch (error) {
            console.error('[resolveMultipleRefs] Error:', error);
            return refs.map(r => ({ ref: this._formatRef(r), text: '' }));
        }
    }

    /** Format a ref object as a display label e.g. "Genesis 1:13-17" */
    private static _formatRef(ref: {
        book: string; chapter: number; startVerse: number; endVerse: number;
    }): string {
        return ref.startVerse === ref.endVerse
            ? `${ref.book} ${ref.chapter}:${ref.startVerse}`
            : `${ref.book} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`;
    }

    // ─── Daily Verse Resolution (unchanged) ──────────────────────────────────

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

                let bibleVersion = await BibleVersion.findOne({
                    abbreviation: versionAbbr.toUpperCase(),
                    isActive: true
                }).lean();

                if (!bibleVersion) {
                    bibleVersion = await BibleVersion.findOne({ isActive: true }).lean();
                }

                if (!bibleVersion) return `[${bookName} ${chapter}:${verseNum}]`;

                const bookDoc = await Book.findOne({
                    version: bibleVersion._id,
                    name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                }).lean();

                if (!bookDoc) {
                    const anyBook = await Book.findOne({
                        name: { $regex: new RegExp(`^${bookName}$`, 'i') }
                    }).lean();
                    if (!anyBook) return `[${bookName} ${chapter}:${verseNum}]`;

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
