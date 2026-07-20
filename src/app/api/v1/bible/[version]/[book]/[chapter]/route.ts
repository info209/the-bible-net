import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/{book}/{chapter}:
 *   get:
 *     summary: Get verses for a specific Bible chapter
 *     description: Retrieve all verses for a given chapter, optionally filtered by a search query.
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
 *       - in: path
 *         name: chapter
 *         required: true
 *         schema: { type: integer }
 *         description: Chapter number
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Optional text search filter within the chapter
 *     responses:
 *       200:
 *         description: Successfully retrieved chapter content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BibleVerse' }
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Chapter or version not found
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
    { params }: { params: { version: string; book: string; chapter: string } }
) {
    try {
        await connectDB();
        const versionId = decodeURIComponent(params.version || '');
        const bookId = decodeURIComponent(params.book || '');
        const chapterNum = parseInt(params.chapter);

        if (isNaN(chapterNum)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter number' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const verseParam = searchParams.get('verse') || searchParams.get('verses');

        const content = (await BibleService.getChapterContent(versionId, bookId, chapterNum, q || undefined)) as any;

        let filteredVerses = content.verses || [];
        if (verseParam) {
            let targetNumbers: number[] = [];
            if (verseParam.includes('-')) {
                const [start, end] = verseParam.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = start; i <= end; i++) targetNumbers.push(i);
                }
            } else if (verseParam.includes(',')) {
                targetNumbers = verseParam.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
            } else {
                const singleNum = parseInt(verseParam.trim());
                if (!isNaN(singleNum)) targetNumbers.push(singleNum);
            }

            if (targetNumbers.length > 0) {
                const set = new Set(targetNumbers);
                filteredVerses = filteredVerses.filter((v: any) => set.has(v.number));
            }
        }

        const finalData = {
            ...content,
            verses: filteredVerses
        };

        return NextResponse.json({
            success: true,
            data: finalData,
            verses: filteredVerses
        });
    } catch (error: any) {
        console.error('Error fetching chapter content:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch chapter content' },
            { status: error.message?.includes('not found') ? 404 : 500 }
        );
    }
}
