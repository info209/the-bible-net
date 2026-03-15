import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/{book}/{chapter}:
 *   get:
 *     summary: Get verses for a specific chapter
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
 *       - in: path
 *         name: chapter
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Optional search query
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { version: string; book: string; chapter: string } }
) {
    try {
        await connectDB();
        const versionId = params.version;
        const bookId = params.book;
        const chapterNum = parseInt(params.chapter);

        if (isNaN(chapterNum)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter number' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const data = await BibleService.getChapterContent(versionId, bookId, chapterNum, q || undefined);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error fetching chapter content:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch chapter content' },
            { status: error.message?.includes('not found') ? 404 : 500 }
        );
    }
}
