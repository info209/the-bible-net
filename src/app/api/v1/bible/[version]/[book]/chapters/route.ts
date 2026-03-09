import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

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
        const versionAbbr = params.version.toUpperCase();
        const bookAbbr = params.book;

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Find Version first
        const version = await BibleService.getVersionByAbbreviation(versionAbbr);
        if (!version) {
            return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
        }

        // Find Book
        const booksData = await BibleService.getBooksByVersion(version._id);
        const book = booksData.find((b: any) =>
            b.abbreviation.toLowerCase() === bookAbbr.toLowerCase() ||
            b.name.toLowerCase() === bookAbbr.toLowerCase()
        );

        if (!book) {
            return NextResponse.json({ success: false, error: 'Book not found' }, { status: 404 });
        }

        const data = await BibleService.getChaptersByBook(book._id, page, limit);

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
