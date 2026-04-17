import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Verse, Book, Chapter, BibleVersion } from '@/models/Bible';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/search:
 *   get:
 *     summary: Search for verses across the entire Bible
 *     description: Perform a full-text search for verses matching a query within a specific version.
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: versionId
 *         required: true
 *         schema: { type: string }
 *         description: Bible version ID or abbreviation (e.g., KJV)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           verseId: { type: string }
 *                           number: { type: number }
 *                           text: { type: string }
 *                           book: { type: object, properties: { id: { type: string }, name: { type: string } } }
 *                           chapter: { type: object, properties: { number: { type: number } } }
 *                     total: { type: number }
 *                     query: { type: string }
 *       400:
 *         description: Invalid query or missing parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const versionIdParam = searchParams.get('versionId');
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        if (!q || q.trim().length < 2) {
            return NextResponse.json({ success: false, error: 'Query must be at least 2 characters' }, { status: 400 });
        }

        const query: any = {
            text: { $regex: q.trim(), $options: 'i' }
        };

        // Handle version filtering
        if (versionIdParam) {
            // Check if it's a valid Mongo ID, otherwise treat as abbreviation
            if (versionIdParam.match(/^[0-9a-fA-F]{24}$/)) {
                query.version = versionIdParam;
            } else {
                const versionDoc = await BibleVersion.findOne({ abbreviation: versionIdParam.toUpperCase() }).select('_id');
                if (versionDoc) {
                    query.version = versionDoc._id;
                } else {
                    return NextResponse.json({ success: false, error: `Version not found: ${versionIdParam}` }, { status: 404 });
                }
            }
        } else {
            // Optional: You might want to only search 'active' versions
            const activeVersions = await BibleVersion.find({ isActive: true }).select('_id');
            if (activeVersions.length > 0) {
                query.version = { $in: activeVersions.map(v => v._id) };
            }
        }

        // Perform search with population for efficiency
        const verses = await Verse.find(query)
            .populate({
                path: 'book',
                select: 'name abbreviation'
            })
            .populate({
                path: 'chapter',
                select: 'number'
            })
            .populate({
                path: 'version',
                select: 'abbreviation name'
            })
            .limit(limit)
            .lean();

        const results = verses.map((v: any) => ({
            verseId: v._id,
            number: v.number,
            text: v.text,
            book: v.book ? { 
                id: v.book._id, 
                name: v.book.name, 
                abbreviation: v.book.abbreviation 
            } : null,
            chapter: v.chapter ? { 
                id: v.chapter._id,
                number: v.chapter.number 
            } : null,
            version: v.version ? {
                id: v.version._id,
                abbreviation: v.version.abbreviation,
                name: v.version.name
            } : null
        })).filter(r => r.book && r.chapter && r.version);

        return NextResponse.json({
            success: true,
            data: {
                results,
                total: results.length,
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

