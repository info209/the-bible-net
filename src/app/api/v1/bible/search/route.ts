import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Verse, Book, Chapter } from '@/models/Bible';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/search:
 *   get:
 *     summary: Search for verses across the entire Bible
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search query
 *       - in: query
 *         name: versionId
 *         required: true
 *         schema: { type: string }
 *         description: Bible version ID
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *     responses:
 *       200:
 *         description: Search results
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const versionId = searchParams.get('versionId');
        const limit = parseInt(searchParams.get('limit') || '30');

        if (!q || q.trim().length < 2) {
            return NextResponse.json({ success: false, error: 'Query must be at least 2 characters' }, { status: 400 });
        }

        if (!versionId) {
            return NextResponse.json({ success: false, error: 'versionId is required' }, { status: 400 });
        }

        // Search verses matching the query in the given version
        const verses = await Verse.find({
            version: versionId,
            text: { $regex: q.trim(), $options: 'i' }
        })
        .limit(limit)
        .lean();

        // Populate book and chapter info for each verse
        const results = await Promise.all(
            verses.map(async (verse: any) => {
                const [book, chapter] = await Promise.all([
                    Book.findById(verse.book).select('name abbreviation').lean(),
                    Chapter.findById(verse.chapter).select('number').lean(),
                ]);

                return {
                    verseId: verse._id,
                    number: verse.number,
                    text: verse.text,
                    book: book ? { id: book._id, name: (book as any).name } : null,
                    chapter: chapter ? { number: (chapter as any).number } : null,
                };
            })
        );

        const validResults = results.filter(r => r.book && r.chapter);

        return NextResponse.json({
            success: true,
            data: {
                results: validResults,
                total: validResults.length,
                query: q
            }
        });
    } catch (error: any) {
        console.error('Bible search error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Search failed' },
            { status: 500 }
        );
    }
}
