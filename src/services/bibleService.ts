import mongoose from 'mongoose';
import { BibleVersion, Book, Chapter, Verse, IBibleVersion, IBook, IChapter, IVerse } from '@/models/Bible';
import redis from '@/lib/redis';
import { getPaginationMeta, PaginationMeta } from '@/utils/pagination';
import { getBookDetails } from '@/utils/bibleBooks';
import connectDB from '@/lib/db';


/**
 * Bible Service Layer
 * Handles all Bible content-related business logic
 */

export class BibleService {
    // Cache TTL in seconds (e.g., 24 hours)
    private static CACHE_TTL = 60 * 60 * 24;

    /**
     * Helper to get cached data
     */
    private static async getFromCache<T>(key: string): Promise<T | null> {
        if (!redis) return null;
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    /**
     * Helper to set cached data
     */
    private static async setInCache(key: string, data: any): Promise<void> {
        if (!redis) return;
        try {
            await redis.set(key, JSON.stringify(data), 'EX', this.CACHE_TTL);
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    /**
     * Get all Bible versions with optional pagination
     * @param page - Page number for pagination
     * @param limit - Items per page
     * @param includeInactive - Include inactive versions (default: false)
     */
    static async getAllVersions(page?: number, limit?: number, includeInactive: boolean = false): Promise<any> {
        // Build filter query
        const filter = includeInactive ? {} : { isActive: true };
        
        let query = BibleVersion.find(filter).sort({ language: 1, abbreviation: 1 });
        let total = 0;

        if (page && limit) {
            total = await BibleVersion.countDocuments(filter);
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const versions = await query.lean();

        const result = page && limit ? {
            versions,
            pagination: getPaginationMeta(total, page, limit)
        } : versions;

        return result;
    }

    /**
     * Get all versions including inactive ones (for admin)
     */
    static async getAllVersionsAdmin(page?: number, limit?: number): Promise<any> {
        return this.getAllVersions(page, limit, true);
    }

    /**
     * Get a specific version by abbreviation
     */
    static async getVersionByAbbreviation(abbreviation: string): Promise<(IBibleVersion & { _id: any }) | null> {
        const cacheKey = `bible:version:${abbreviation.toUpperCase()}`;
        const cached = await this.getFromCache(cacheKey) as any;
        if (cached) return cached;

        const version = await BibleVersion.findOne({ abbreviation: abbreviation.toUpperCase() }).lean() as any;
        await this.setInCache(cacheKey, version);
        return version;
    }

    /**
     * Get books for a specific version with optional pagination
     */
    static async getBooksByVersion(versionId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = `bible:books:${versionId}${page ? `:${page}:${limit}` : ''}`;
        const cached = await this.getFromCache(cacheKey);
        if (cached) return cached;

        let query = Book.find({ version: versionId }).sort({ order: 1 });
        let total = 0;

        if (page && limit) {
            total = await Book.countDocuments({ version: versionId });
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const books = await query.lean();

        const result = page && limit ? {
            books,
            pagination: getPaginationMeta(total, page, limit)
        } : books;

        await this.setInCache(cacheKey, result);
        return result;
    }

    /**
     * Get chapters for a specific book with optional pagination
     */
    static async getChaptersByBook(bookId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = `bible:chapters:${bookId}${page ? `:${page}:${limit}` : ''}`;
        const cached = await this.getFromCache(cacheKey);
        if (cached) return cached;

        let query = Chapter.find({ book: bookId }).sort({ number: 1 });
        let total = 0;

        if (page && limit) {
            total = await Chapter.countDocuments({ book: bookId });
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const chapters = await query.lean();

        const result = page && limit ? {
            chapters,
            pagination: getPaginationMeta(total, page, limit)
        } : chapters;

        await this.setInCache(cacheKey, result);
        return result;
    }

    /**
     * Get verses for a specific chapter with natively supported pagination
     */
    static async getVersesByChapter(chapterId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = `bible:verses:${chapterId}${page ? `:${page}:${limit}` : ''}`;
        const cached = await this.getFromCache(cacheKey);
        if (cached) return cached;

        let query = Verse.find({ chapter: chapterId }).sort({ number: 1 });
        let total = 0;

        if (page && limit) {
            total = await Verse.countDocuments({ chapter: chapterId });
            query = query.skip((page - 1) * limit).limit(limit);
        } else {
            // Even if not paginated, we should probably know the total for consistency in some contexts
            // but for now let's keep it simple
        }

        const verses = await query.lean();

        const result = page && limit ? {
            verses,
            pagination: getPaginationMeta(total, page, limit)
        } : verses;

        await this.setInCache(cacheKey, result);
        return result;
    }

    /**
     * Get a complete chapter with verses
     * @param versionAbbr - Version abbreviation (e.g., 'KJV')
     * @param bookName - Book name or abbreviation
     * @param chapterNum - Chapter number
     * @param search - Optional search query to filter verses within the chapter
     */
    static async getChapterContent(versionId: string, bookId: string, chapterNum: number, search?: string) {
        const cacheKey = `bible:content:${versionId}:${bookId}:${chapterNum}${search ? `:search:${search}` : ''}`;
        const cached = await this.getFromCache(cacheKey);
        if (cached) return cached;

        // Find version
        let version = null;
        if (mongoose.Types.ObjectId.isValid(versionId)) {
            version = await BibleVersion.findById(versionId).lean();
        }
        if (!version) {
            version = await BibleVersion.findOne({ abbreviation: versionId.toUpperCase() }).lean();
        }

        if (!version) {
            throw new Error('Version not found');
        }

        const resolvedVersionId = version._id;

        // Find initial book
        let book = null;
        if (mongoose.Types.ObjectId.isValid(bookId)) {
            book = await Book.findById(bookId).lean();
        }
        if (!book) {
            // First try finding in the requested version
            book = await Book.findOne({
                version: resolvedVersionId,
                $or: [
                    { name: { $regex: new RegExp(`^${bookId.replace(/-/g, ' ')}$`, 'i') } },
                    { abbreviation: { $regex: new RegExp(`^${bookId}$`, 'i') } }
                ]
            }).lean();
            
            // If not found in the requested version, try finding in ANY version to support cross-version fallback
            if (!book) {
                book = await Book.findOne({
                    $or: [
                        { name: { $regex: new RegExp(`^${bookId.replace(/-/g, ' ')}$`, 'i') } },
                        { abbreviation: { $regex: new RegExp(`^${bookId}$`, 'i') } }
                    ]
                }).lean();
            }
        }

        if (!book) {
            throw new Error('Book not found');
        }

        // Cross-version check: If the book's version doesn't match the requested versionId,
        // find the matching book in the target version.
        let targetBook = book;
        if (book.version.toString() !== resolvedVersionId.toString()) {
            const equivalentBook = await Book.findOne({
                version: resolvedVersionId,
                $or: [
                    { abbreviation: book.abbreviation },
                    { order: book.order },
                    { name: book.name }
                ]
            }).lean();
            
            if (equivalentBook) {
                targetBook = equivalentBook;
            } else {
                console.warn(`Equivalent book for ${book.name} not found in version ${version.abbreviation}`);
                 // Fallback to searching by order if abbreviation/name didn't work (already in $or but being explicit)
                 const fallbackBookByOrder = await Book.findOne({
                    version: resolvedVersionId,
                    order: book.order
                }).lean();
                if (fallbackBookByOrder) {
                    targetBook = fallbackBookByOrder;
                }
            }
        }

        // Find chapter using the target book
        const chapter = await Chapter.findOne({
            book: targetBook._id,
            number: chapterNum,
        }).lean();
        
        if (!chapter) {
            throw new Error(`Chapter ${chapterNum} not found for book ${targetBook.name} in version ${version.abbreviation}`);
        }

        // Get verses
        const verseQuery: any = { 
            chapter: chapter._id,
            version: resolvedVersionId // Be explicit
        };
        if (search) {
            verseQuery.text = { $regex: search, $options: 'i' };
        }

        const verses = await Verse.find(verseQuery).sort({ number: 1 }).lean();

        const result = {
            version: {
                name: version.name,
                abbreviation: version.abbreviation,
            },
            book: {
                name: book.name,
                abbreviation: book.abbreviation,
                testament: book.testament,
            },
            chapter: {
                number: chapter.number,
            },
            verses: verses.map((v) => ({
                number: v.number,
                text: v.text,
            })),
        };

        await this.setInCache(cacheKey, result);
        return result;
    }

    /**
     * Get a random verse
     */
    static async getRandomVerse(): Promise<any> {
        const randomVerses = await Verse.aggregate([
            { $sample: { size: 1 } }
        ]);

        if (!randomVerses || randomVerses.length === 0) {
            throw new Error('No verses found in the database');
        }

        const verse = randomVerses[0];

        // Populate details manually since aggregate doesn't support .populate() directly the same way
        const [version, book, chapter] = await Promise.all([
            BibleVersion.findById(verse.version).lean(),
            Book.findById(verse.book).lean(),
            Chapter.findById(verse.chapter).lean(),
        ]);

        return {
            id: verse._id,
            text: verse.text,
            number: verse.number,
            version: version ? {
                name: version.name,
                abbreviation: version.abbreviation,
            } : null,
            book: book ? {
                name: book.name,
                abbreviation: book.abbreviation,
                testament: book.testament,
            } : null,
            chapter: chapter ? {
                number: chapter.number,
            } : null,
        };
    }

    /**
     * Delete a Bible Version and all its associated data
     */
    static async deleteVersion(versionId: string): Promise<boolean> {
        await connectDB();
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Verse.deleteMany({ version: versionId }).session(session);
            await Chapter.deleteMany({ version: versionId }).session(session);
            await Book.deleteMany({ version: versionId }).session(session);
            await BibleVersion.findByIdAndDelete(versionId).session(session);

            await session.commitTransaction();
            return true;
        } catch (error) {
            await session.abortTransaction();
            console.error('Delete version error:', error);
            return false;
        } finally {
            session.endSession();
        }
    }

    /**
     * Import a Bible Version from JSON data (legacy full-upload method)
     * Note: This might fail on serverless platforms for large Bibles
     */
    static async importVersion(data: any): Promise<string> {
        await connectDB();
        const { metadata, verses } = data;

        const versionId = await this.initImport(metadata);

        // Start background import process
        this.runImportProcess(versionId, verses).catch(err => {
            console.error('Background import failed:', err);
            BibleVersion.findByIdAndUpdate(versionId, { status: 'failed' }).catch(console.error);
        });

        return versionId;
    }

    /**
     * Step 1: Initialize Import - Create/Update BibleVersion
     */
    static async initImport(metadata: any): Promise<string> {
        await connectDB();
        const versionDoc = await BibleVersion.findOneAndUpdate(
            { abbreviation: metadata.shortname.toUpperCase() },
            {
                name: metadata.name,
                abbreviation: metadata.shortname.toUpperCase(),
                language: metadata.lang_short,
                copyright: metadata.copyright_statement || `Copyright ${metadata.year || ''}`,
                status: 'importing',
                importProgress: 0
            },
            { upsert: true, returnDocument: 'after' }
        );

        return versionDoc._id.toString();
    }

    /**
     * Step 2: Import verses for a specific book
     */
    static async importBookVerses(versionId: string, bookNum: number, verses: any[], progress?: number): Promise<void> {
        await connectDB();
        if (!verses || verses.length === 0) return;

        const bookDetails = getBookDetails(bookNum);
        const bookName = verses[0].book_name || bookDetails?.name || `Book ${bookNum}`;
        const bookAbbr = bookDetails?.abbreviation || bookName.substring(0, 3).toUpperCase();
        const testament = bookDetails?.testament || (bookNum <= 39 ? 'OT' : 'NT');

        const bookDoc = await Book.findOneAndUpdate(
            { version: versionId, order: bookNum },
            {
                name: bookName,
                abbreviation: bookAbbr,
                testament: testament,
                version: versionId,
                order: bookNum
            },
            { upsert: true, returnDocument: 'after' }
        );

        const bookId = bookDoc._id;

        // Group by chapter
        const versesByChapter = new Map<number, any[]>();
        for (const v of verses) {
            if (!versesByChapter.has(v.chapter)) {
                versesByChapter.set(v.chapter, []);
            }
            versesByChapter.get(v.chapter)!.push(v);
        }

        const chapterNumbers = Array.from(versesByChapter.keys()).sort((a, b) => a - b);

        for (const chapNum of chapterNumbers) {
            const chapVerses = versesByChapter.get(chapNum)!;

            const chapterDoc = await Chapter.findOneAndUpdate(
                { book: bookId, number: chapNum },
                {
                    number: chapNum,
                    book: bookId,
                    version: versionId
                },
                { upsert: true, returnDocument: 'after' }
            );

            const chapterId = chapterDoc._id;

            // Clear existing verses for this chapter if any
            await Verse.deleteMany({ chapter: chapterId });

            const verseDocs = chapVerses.map(v => ({
                number: v.verse,
                text: v.text,
                chapter: chapterId,
                book: bookId,
                version: versionId
            }));

            const batchSize = 1000;
            for (let j = 0; j < verseDocs.length; j += batchSize) {
                const chunk = verseDocs.slice(j, j + batchSize);
                await Verse.insertMany(chunk);
            }
        }

        // Update progress if provided
        if (progress !== undefined) {
            await BibleVersion.findByIdAndUpdate(versionId, { importProgress: progress });
        }
    }

    /**
     * Step 3: Finalize Import - Update status and progress
     */
    static async finalizeImport(versionId: string, progress: number = 100): Promise<void> {
        await connectDB();
        const update: any = { importProgress: progress };
        if (progress >= 100) {
            update.status = 'active';
        }
        await BibleVersion.findByIdAndUpdate(versionId, update);
    }

    private static async runImportProcess(versionId: string, verses: any[]): Promise<void> {
        const batchSize = 1000;

        // Group verses by book
        const versesByBook = new Map<number, any[]>();
        for (const v of verses) {
            if (!versesByBook.has(v.book)) {
                versesByBook.set(v.book, []);
            }
            versesByBook.get(v.book)!.push(v);
        }

        const bookNumbers = Array.from(versesByBook.keys()).sort((a, b) => a - b);
        const totalBooks = bookNumbers.length;

        for (let i = 0; i < totalBooks; i++) {
            const bookNum = bookNumbers[i];
            const bookVerses = versesByBook.get(bookNum)!;
            const bookDetails = getBookDetails(bookNum);

            const bookName = bookVerses[0].book_name || bookDetails?.name || `Book ${bookNum}`;
            const bookAbbr = bookDetails?.abbreviation || bookName.substring(0, 3).toUpperCase();
            const testament = bookDetails?.testament || (bookNum <= 39 ? 'OT' : 'NT');

            const bookDoc = await Book.findOneAndUpdate(
                { version: versionId, order: bookNum },
                {
                    name: bookName,
                    abbreviation: bookAbbr,
                    testament: testament,
                    version: versionId,
                    order: bookNum
                },
                { upsert: true, returnDocument: 'after' }
            );

            const bookId = bookDoc._id;

            // Group by chapter
            const versesByChapter = new Map<number, any[]>();
            for (const v of bookVerses) {
                if (!versesByChapter.has(v.chapter)) {
                    versesByChapter.set(v.chapter, []);
                }
                versesByChapter.get(v.chapter)!.push(v);
            }

            const chapterNumbers = Array.from(versesByChapter.keys()).sort((a, b) => a - b);

            for (const chapNum of chapterNumbers) {
                const chapVerses = versesByChapter.get(chapNum)!;

                const chapterDoc = await Chapter.findOneAndUpdate(
                    { book: bookId, number: chapNum },
                    {
                        number: chapNum,
                        book: bookId,
                        version: versionId
                    },
                    { upsert: true, returnDocument: 'after' }
                );

                const chapterId = chapterDoc._id;

                // Clear existing verses for this chapter if any
                await Verse.deleteMany({ chapter: chapterId });

                const verseDocs = chapVerses.map(v => ({
                    number: v.verse,
                    text: v.text,
                    chapter: chapterId,
                    book: bookId,
                    version: versionId
                }));

                for (let j = 0; j < verseDocs.length; j += batchSize) {
                    const chunk = verseDocs.slice(j, j + batchSize);
                    await Verse.insertMany(chunk);
                }
            }

            // Update progress
            const progress = Math.round(((i + 1) / totalBooks) * 100);
            await BibleVersion.findByIdAndUpdate(versionId, { importProgress: progress });
        }

        // Finalize status
        await BibleVersion.findByIdAndUpdate(versionId, { status: 'active', importProgress: 100 });
    }
}

