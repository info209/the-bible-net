import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';

/**
 * @swagger
 * /api/chapter/{version}/{book}/{chapter}:
 *   get:
 *     summary: Get chapter content
 *     description: Retrieve text and verses for a specific chapter. Supports filtering by query parameter 'q'.
 *     tags:
 *       - Bible
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *         description: Bible version abbreviation (e.g., KJV)
 *       - in: path
 *         name: book
 *         required: true
 *         schema:
 *           type: string
 *         description: Book name or abbreviation
 *       - in: path
 *         name: chapter
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chapter number
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Optional text search within the chapter
 *     responses:
 *       200:
 *         description: Chapter content (potentially filtered)
 *       404:
 *         description: Content not found
 *       500:
 *         description: Server error
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { version: string; book: string; chapter: string } }
) {
    try {
        const { version, book, chapter } = params;
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');
        const chapterNum = parseInt(chapter);

        if (isNaN(chapterNum)) {
            return NextResponse.json(
                { success: false, error: 'Invalid chapter number' },
                { status: 400 }
            );
        }

        const content = await BibleService.getChapterContent(version, book, chapterNum, q || undefined);

        return NextResponse.json(
            {
                success: true,
                ...content,
            },
            { status: 200 }
        );
    } catch (error: any) {
        if (error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 404 }
            );
        }

        console.error('Get chapter error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch chapter' },
            { status: 500 }
        );
    }
}
