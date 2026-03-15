import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';
import { Book } from '@/models/Bible';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/{book}/chapters:
 *   get:
 *     summary: Get chapters for a specific book
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: book
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Success
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

        // Verify Book exists
        const book = await Book.findById(bookId).catch(() => null);

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
