import { NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/verses:
 *   get:
 *     summary: Get raw verses for a chapter
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: chapterId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 100 }
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);

        const chapterId = searchParams.get('chapterId');
        const versionParam = searchParams.get('version') || searchParams.get('versionId') || 'KJV';
        const bookParam = searchParams.get('book') || searchParams.get('bookId') || searchParams.get('bookName');
        const chapterParam = searchParams.get('chapter') || searchParams.get('chapterNum');
        const verseParam = searchParams.get('verse') || searchParams.get('verses');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100');

        // Mode A: Query by Mongo chapterId
        if (chapterId) {
            const versesData = await BibleService.getVersesByChapter(chapterId, page, limit);
            const versesList = Array.isArray(versesData) ? versesData : (versesData?.verses || []);
            return NextResponse.json({
                success: true,
                data: versesData,
                verses: versesList
            });
        }

        // Mode B: Query by version, book, chapter (and optional verse filtering)
        if (bookParam && chapterParam) {
            const chapterNum = parseInt(chapterParam);
            if (isNaN(chapterNum)) {
                return NextResponse.json({ success: false, error: 'Invalid chapter number' }, { status: 400 });
            }

            const content = (await BibleService.getChapterContent(versionParam, bookParam, chapterNum)) as any;

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
        }

        return NextResponse.json({
            success: false,
            error: 'Missing required parameters. Provide either chapterId OR book and chapter query parameters.'
        }, { status: 400 });

    } catch (error: any) {
        console.error('Error fetching verses:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch verses' }, { status: 500 });
    }
}
