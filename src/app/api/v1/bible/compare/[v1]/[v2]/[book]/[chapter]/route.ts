import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/compare/{v1}/{v2}/{book}/{chapter}:
 *   get:
 *     summary: Compare two Bible versions side-by-side
 *     description: Retrieve aligned verses from two different versions for a specific book and chapter.
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: v1
 *         required: true
 *         schema: { type: string }
 *         description: First Bible version (e.g., KJV)
 *       - in: path
 *         name: v2
 *         required: true
 *         schema: { type: string }
 *         description: Second Bible version (e.g., NKJV)
 *       - in: path
 *         name: book
 *         required: true
 *         schema: { type: string }
 *         description: Book ID or slug (e.g., genesis)
 *       - in: path
 *         name: chapter
 *         required: true
 *         schema: { type: integer }
 *         description: Chapter number
 *     responses:
 *       200:
 *         description: Aligned verses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     version1: { $ref: '#/components/schemas/BibleVersion' }
 *                     version2: { $ref: '#/components/schemas/BibleVersion' }
 *                     book: { $ref: '#/components/schemas/BibleBook' }
 *                     chapter: { type: number }
 *                     verses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           number: { type: number }
 *                           v1: { type: string }
 *                           v2: { type: string }
 *       404:
 *         description: One or both versions not found for this book/chapter
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
    { params }: { params: { v1: string, v2: string, book: string, chapter: string } }
) {
    try {
        await connectDB();
        const { v1, v2, book, chapter } = params;
        const chapterNum = parseInt(chapter);

        console.log("Comparison Request:", {
            version1: v1,
            version2: v2,
            bookId: book,
            chapter: chapterNum
        });

        const [content1, content2] = await Promise.all([
            BibleService.getChapterContent(v1, book, chapterNum).catch(() => null),
            BibleService.getChapterContent(v2, book, chapterNum).catch(() => null)
        ]) as any[];

        if (!content1 || !content2) {
            return NextResponse.json({ 
                success: false, 
                error: 'One or both versions not found for this book/chapter' 
            }, { status: 404 });
        }

        // Align verses by number
        const allVerseNumbers = Array.from(new Set([
            ...content1.verses.map((v: any) => v.number),
            ...content2.verses.map((v: any) => v.number)
        ])).sort((a, b) => a - b);

        const alignedVerses = allVerseNumbers.map(num => {
            const v1Text = content1.verses.find((v: any) => v.number === num)?.text || '';
            const v2Text = content2.verses.find((v: any) => v.number === num)?.text || '';
            return {
                number: num,
                v1: v1Text,
                v2: v2Text
            };
        });

        return NextResponse.json({
            success: true,
            data: {
                version1: content1.version,
                version2: content2.version,
                book: content1.book,
                chapter: content1.chapter,
                verses: alignedVerses
            }
        });
    } catch (error: any) {
        console.error('Error in Bible compare API:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        }, { status: 500 });
    }
}
