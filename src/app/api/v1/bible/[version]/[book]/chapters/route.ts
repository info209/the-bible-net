import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';
import { BibleVersion, Book } from '@/models/Bible';
import { BIBLE_BOOKS, TELUGU_BOOK_NAMES } from '@/utils/bibleBooks';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/{book}/chapters:
 *   get:
 *     summary: Get chapters for a specific Bible book
 *     description: Retrieve all chapters for a given book ID within a specific version.
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: string }
 *         description: Version ID or abbreviation (e.g., KJV, NKJV)
 *       - in: path
 *         name: book
 *         required: true
 *         schema: { type: string }
 *         description: Book ID or slug (e.g., genesis, john)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved chapters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BibleChapter' }
 *       404:
 *         description: Book not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { version: string; book: string } }
) {
    try {
        await connectDB();
        const versionId = params.version;
        const bookId = params.book;

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Verify version exists
        let version = null;
        if (mongoose.Types.ObjectId.isValid(versionId)) {
            version = await BibleVersion.findById(versionId).catch(() => null);
        }
        if (!version) {
            const escaped = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            version = await BibleVersion.findOne({ abbreviation: new RegExp(`^${escaped}$`, 'i') }).catch(() => null);
        }
        if (!version) {
            const escaped = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            version = await BibleVersion.findOne({ name: new RegExp(`^${escaped}$`, 'i') }).catch(() => null);
        }

        // Verify Book exists
        let book = null;
        if (mongoose.Types.ObjectId.isValid(bookId)) {
            book = await Book.findById(bookId).catch(() => null);
        }
        if (!book && version) {
            const normalizedBookId = bookId.replace(/-/g, ' ').trim();
            const escapedBookId = normalizedBookId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            book = await Book.findOne({
                version: version._id,
                $or: [
                    { name: new RegExp(`^${escapedBookId}$`, 'i') },
                    { abbreviation: new RegExp(`^${escapedBookId}$`, 'i') }
                ]
            }).catch(() => null);

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
                    book = await Book.findOne({ version: version._id, order: canonicalOrder }).catch(() => null);
                }
            }
        }

        if (!book) {
            return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
        }

        const data = await BibleService.getChaptersByBook(book._id.toString(), page, limit);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching chapters:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch chapters' },
            { status: 500 }
        );
    }
}
