import mongoose from 'mongoose';
import { BibleVersion, Book, Chapter, Verse, IBibleVersion, IBook, IChapter, IVerse } from '@/models/Bible';
import { getPaginationMeta, PaginationMeta } from '@/utils/pagination';
import { getBookDetails, BIBLE_BOOKS, TELUGU_BOOK_NAMES } from '@/utils/bibleBooks';
import connectDB from '@/lib/db';
import { CacheService, CacheKeys, CACHE_TTL } from '@/services/cacheService';


/**
 * Bible Service Layer
 * Handles all Bible content-related business logic
 */

export class BibleService {

    /**
     * Get all Bible versions with optional pagination
     * @param page - Page number for pagination
     * @param limit - Items per page
     * @param includeInactive - Include inactive versions (default: false)
     */
    static async getAllVersions(page?: number, limit?: number, includeInactive: boolean = false): Promise<any> {
        const cacheKey = CacheKeys.bibleVersions(page, limit, includeInactive);
        return CacheService.getOrSet(cacheKey, async () => {
            await connectDB();
            const filter = includeInactive ? {} : { isActive: true };
            
            let query = BibleVersion.find(filter).sort({ language: 1, abbreviation: 1 });
            let total = 0;

            if (page && limit) {
                total = await BibleVersion.countDocuments(filter);
                query = query.skip((page - 1) * limit).limit(limit);
            }

            const versions = await query.lean();

            if (!versions || versions.length === 0) {
                console.warn('getAllVersions: No active Bible versions found in MongoDB.');
            }

            return page && limit ? {
                versions,
                pagination: getPaginationMeta(total, page, limit)
            } : versions;
        }, CACHE_TTL.BIBLE);
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
        const cacheKey = `tbnet:bible:version:${abbreviation.toUpperCase()}`;
        return CacheService.getOrSet(cacheKey, async () => {
            await connectDB();
            const version = await BibleVersion.findOne({ abbreviation: abbreviation.toUpperCase() }).lean() as any;
            if (!version) {
                console.warn(`getVersionByAbbreviation: Bible version not found for abbreviation: ${abbreviation}`);
            }
            return version;
        }, CACHE_TTL.BIBLE);
    }

    /**
     * Get books for a specific version with optional pagination
     */
    static async getBooksByVersion(versionId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = CacheKeys.bibleBooks(versionId) + (page ? `:p=${page}:l=${limit}` : '');
        return CacheService.getOrSet(cacheKey, async () => {
            await connectDB();
            let query = Book.find({ version: versionId }).sort({ order: 1 });
            let total = 0;

            if (page && limit) {
                total = await Book.countDocuments({ version: versionId });
                query = query.skip((page - 1) * limit).limit(limit);
            }

            const books = await query.lean();
            if (!books || books.length === 0) {
                console.warn(`getBooksByVersion: No books found for version ${versionId}`);
            }

            return page && limit ? {
                books,
                pagination: getPaginationMeta(total, page, limit)
            } : books;
        }, CACHE_TTL.BIBLE);
    }

    /**
     * Get chapters for a specific book with optional pagination
     */
    static async getChaptersByBook(bookId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = CacheKeys.bibleChapters(bookId, '') + (page ? `:p=${page}:l=${limit}` : '');
        return CacheService.getOrSet(cacheKey, async () => {
            await connectDB();
            let query = Chapter.find({ book: bookId }).sort({ number: 1 });
            let total = 0;

            if (page && limit) {
                total = await Chapter.countDocuments({ book: bookId });
                query = query.skip((page - 1) * limit).limit(limit);
            }

            const chapters = await query.lean();
            if (!chapters || chapters.length === 0) {
                console.warn(`getChaptersByBook: No chapters found for book ${bookId}`);
            }

            return page && limit ? {
                chapters,
                pagination: getPaginationMeta(total, page, limit)
            } : chapters;
        }, CACHE_TTL.BIBLE);
    }

    /**
     * Get verses for a specific chapter with natively supported pagination
     */
    static async getVersesByChapter(chapterId: string, page?: number, limit?: number): Promise<any> {
        const cacheKey = `tbnet:bible:verses:${chapterId}${page ? `:p=${page}:l=${limit}` : ''}`;
        return CacheService.getOrSet(cacheKey, async () => {
            await connectDB();
            let query = Verse.find({ chapter: chapterId }).sort({ number: 1 });
            let total = 0;

            if (page && limit) {
                total = await Verse.countDocuments({ chapter: chapterId });
                query = query.skip((page - 1) * limit).limit(limit);
            }

            const verses = await query.lean();
            if (!verses || verses.length === 0) {
                console.warn(`getVersesByChapter: No verses found for chapter ${chapterId}`);
            }

            return page && limit ? {
                verses,
                pagination: getPaginationMeta(total, page, limit)
            } : verses;
        }, CACHE_TTL.BIBLE);
    }

    /**
     * Get a complete chapter with verses
     * @param versionId - Version abbreviation or ID
     * @param bookId - Book abbreviation, name, or ID
     * @param chapterNum - Chapter number
     * @param search - Optional search query to filter verses within the chapter
     */
    static async getChapterContent(versionId: string, bookId: string, chapterNum: number, search?: string) {
        try {
            await connectDB();
            // Find version
            let version = null;
            if (mongoose.Types.ObjectId.isValid(versionId)) {
                version = await BibleVersion.findById(versionId).lean();
            }
            if (!version) {
                const escapedVer = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                version = await BibleVersion.findOne({ abbreviation: new RegExp(`^${escapedVer}$`, 'i') }).lean();
            }
            if (!version) {
                const escapedVer = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                version = await BibleVersion.findOne({ name: new RegExp(`^${escapedVer}$`, 'i') }).lean();
            }
            if (!version) {
                const escapedVer = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                version = await BibleVersion.findOne({
                    $or: [
                        { abbreviation: new RegExp(escapedVer, 'i') },
                        { name: new RegExp(escapedVer, 'i') },
                        { language: new RegExp(`^${escapedVer}$`, 'i') }
                    ]
                }).lean();
            }

            if (!version) {
                console.error(`getChapterContent: Version not found for versionId: ${versionId}`);
                throw new Error('Version not found');
            }

            const resolvedVersionId = version._id;

            // Find initial book
            let book = null;
            if (mongoose.Types.ObjectId.isValid(bookId)) {
                book = await Book.findById(bookId).lean();
            }
            if (!book) {
                const normalizedBookId = bookId.replace(/-/g, ' ').trim();
                const escapedBookId = normalizedBookId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // First try finding in the requested version by exact name or abbreviation
                book = await Book.findOne({
                    version: resolvedVersionId,
                    $or: [
                        { name: { $regex: new RegExp(`^${escapedBookId}$`, 'i') } },
                        { abbreviation: { $regex: new RegExp(`^${escapedBookId}$`, 'i') } }
                    ]
                }).lean();
                
                // If not found, try canonical order resolution for requested version
                if (!book) {
                    const canonicalEng = BIBLE_BOOKS.find(b => 
                        b.name.toLowerCase() === normalizedBookId.toLowerCase() || 
                        b.abbreviation.toLowerCase() === normalizedBookId.toLowerCase()
                    );
                    let canonicalOrder = canonicalEng?.order;
                    if (!canonicalOrder) {
                        for (const [engName, teName] of Object.entries(TELUGU_BOOK_NAMES)) {
                            if (teName.toLowerCase() === normalizedBookId.toLowerCase() || normalizedBookId.includes(teName)) {
                                const match = BIBLE_BOOKS.find(b => b.name === engName);
                                if (match) { canonicalOrder = match.order; break; }
                            }
                        }
                    }
                    if (canonicalOrder) {
                        book = await Book.findOne({ version: resolvedVersionId, order: canonicalOrder }).lean();
                    }
                }

                // If still not found in the requested version, try finding in ANY version to support cross-version fallback
                if (!book) {
                    book = await Book.findOne({
                        $or: [
                            { name: { $regex: new RegExp(`^${escapedBookId}$`, 'i') } },
                            { abbreviation: { $regex: new RegExp(`^${escapedBookId}$`, 'i') } }
                        ]
                    }).lean();
                }
            }

            if (!book) {
                console.error(`getChapterContent: Book not found for bookId: ${bookId}`);
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
                    console.warn(`getChapterContent: Equivalent book for ${book.name} not found in version ${version.abbreviation}`);
                     // Fallback to searching by order if abbreviation/name didn't work
                     const fallbackBookByOrder = await Book.findOne({
                        version: resolvedVersionId,
                        order: book.order
                    }).lean();
                    if (fallbackBookByOrder) {
                        targetBook = fallbackBookByOrder;
                    }
                }
            }

            // Calculate canonical cache key using resolved IDs
            const cacheKey = CacheKeys.bibleChapter(resolvedVersionId.toString(), targetBook._id.toString(), chapterNum) + (search ? `:s=${search}` : '');
            return CacheService.getOrSet(cacheKey, async () => {
                // Find chapter using the target book
                const chapter = await Chapter.findOne({
                    book: targetBook._id,
                    number: chapterNum,
                }).lean();
                
                if (!chapter) {
                    console.error(`getChapterContent: Chapter ${chapterNum} not found for book ${targetBook.name} in version ${version.abbreviation}`);
                    throw new Error(`Chapter ${chapterNum} not found for book ${targetBook.name} in version ${version.abbreviation}`);
                }

                // Get verses for chapter
                const verseQuery: any = { chapter: chapter._id };
                if (search) {
                    verseQuery.text = { $regex: search, $options: 'i' };
                }

                const verses = await Verse.find(verseQuery).sort({ number: 1 }).lean();
                if (!verses || verses.length === 0) {
                    console.warn(`getChapterContent: No verses found for chapter ${chapter._id} (search: "${search || ''}")`);
                }

                return {
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
            }, CACHE_TTL.BIBLE);
        } catch (error: any) {
            console.error(`Error in getChapterContent for version ${versionId}, book ${bookId}, chapter ${chapterNum}:`, error);
            throw error;
        }
    }

    /**
     * Get a random verse
     */
    static async getRandomVerse(): Promise<any> {
        try {
            await connectDB();
            const randomVerses = await Verse.aggregate([
                { $sample: { size: 1 } }
            ]);

            if (!randomVerses || randomVerses.length === 0) {
                console.error('getRandomVerse: No verses found in the database');
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
        } catch (error: any) {
            console.error('Error in getRandomVerse service:', error);
            throw error;
        }
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
            await CacheService.invalidatePattern('tbnet:bible:*');
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
        await CacheService.invalidatePattern('tbnet:bible:*');
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

    /**
     * Find text of verses in a highly robust manner, resolving target version
     * and books with language/abbreviation/order-based fallbacks.
     */
    static async findVersesText(
        versionCode: string,
        bookId: string,
        bookName: string,
        chapter: number,
        verses: number[]
    ): Promise<string> {
        try {
            if (!verses || verses.length === 0) return '';

            // 1. Resolve target version
            let versionDoc = null;
            if (versionCode && mongoose.Types.ObjectId.isValid(versionCode)) {
                versionDoc = await BibleVersion.findById(versionCode).lean();
            }
            if (!versionDoc && versionCode) {
                versionDoc = await BibleVersion.findOne({
                    abbreviation: versionCode.toUpperCase()
                }).lean();
            }

            // Fallback: search for active version or default NKJV/KJV if requested version not active/found
            if (!versionDoc) {
                versionDoc = await BibleVersion.findOne({ abbreviation: 'NKJV' }).lean() ||
                             await BibleVersion.findOne({ abbreviation: 'KJV' }).lean() ||
                             await BibleVersion.findOne({ isActive: true }).lean() ||
                             await BibleVersion.findOne({}).lean();
            }

            if (!versionDoc) {
                console.warn(`[findVersesText] No bible version found in DB`);
                return '';
            }

            const targetVersionId = versionDoc._id;

            // 2. Resolve book document under this version
            let bookDoc = await Book.findOne({
                version: targetVersionId,
                $or: [
                    { abbreviation: { $regex: new RegExp(`^${bookId}$`, 'i') } },
                    { name: { $regex: new RegExp(`^${bookId.replace(/-/g, ' ')}$`, 'i') } },
                    { name: { $regex: new RegExp(`^${bookName.replace(/-/g, ' ')}$`, 'i') } },
                    { abbreviation: { $regex: new RegExp(`^${bookName}$`, 'i') } }
                ]
            }).lean();

            // Fallback: If not found, find equivalent book index/order across any version, and lookup by order in target version
            if (!bookDoc) {
                const anyBookDoc = await Book.findOne({
                    $or: [
                        { abbreviation: { $regex: new RegExp(`^${bookId}$`, 'i') } },
                        { name: { $regex: new RegExp(`^${bookId.replace(/-/g, ' ')}$`, 'i') } },
                        { name: { $regex: new RegExp(`^${bookName.replace(/-/g, ' ')}$`, 'i') } },
                        { abbreviation: { $regex: new RegExp(`^${bookName}$`, 'i') } }
                    ]
                }).lean();

                if (anyBookDoc) {
                    bookDoc = await Book.findOne({
                        version: targetVersionId,
                        order: anyBookDoc.order
                    }).lean();
                }
            }

            if (!bookDoc) {
                console.warn(`[findVersesText] Book not resolved for bookId: ${bookId}, bookName: ${bookName}`);
                return '';
            }

            // 3. Resolve the Chapter document — Verse.chapter is an ObjectId ref,
            //    not a plain integer. Using chapterNumber (denormalized) is unreliable
            //    because it is often absent in non-English (Hindi, Telugu) imports.
            const chapterDoc = await Chapter.findOne({
                book: bookDoc._id,
                number: chapter,
            }).lean();

            if (!chapterDoc) {
                console.warn(`[findVersesText] Chapter ${chapter} not found for book ${bookDoc.name} in version ${versionDoc.abbreviation}`);
                // Fall through to denormalized fallbacks below
            }

            // 3a. Primary lookup via ObjectId refs — works for all languages
            if (chapterDoc) {
                const verseDocs = await Verse.find({
                    version: targetVersionId,
                    book: bookDoc._id,
                    chapter: chapterDoc._id,
                    number: { $in: verses }
                }).sort({ number: 1 }).lean();

                if (verseDocs && verseDocs.length > 0) {
                    return verseDocs.map(v => v.text).join(' ');
                }
            }

            // 4. Denormalized string-matching fallback (for legacy documents that
            //    have versionCode / bookName / chapterNumber pre-populated)
            const fallbackDocs = await Verse.find({
                versionCode: versionDoc.abbreviation,
                bookName: bookDoc.name,
                chapterNumber: chapter,
                number: { $in: verses }
            }).sort({ number: 1 }).lean();

            if (fallbackDocs && fallbackDocs.length > 0) {
                return fallbackDocs.map(v => v.text).join(' ');
            }

            // 5. Last-resort: broaden the query to any chapter document belonging
            //    to this book/version with the right chapter number, in case the
            //    Chapter document was linked to a different Book instance during
            //    an import (e.g. cross-version chapter mismatch).
            if (chapterDoc) {
                const broadDocs = await Verse.find({
                    chapter: chapterDoc._id,
                    number: { $in: verses }
                }).sort({ number: 1 }).lean();

                if (broadDocs && broadDocs.length > 0) {
                    return broadDocs.map(v => v.text).join(' ');
                }
            }

            return '';
        } catch (error) {
            console.error('[findVersesText] Error fetching verse text:', error);
            return '';
        }
    }
}


