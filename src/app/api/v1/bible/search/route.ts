import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Verse, Book, Chapter, BibleVersion } from '@/models/Bible';
import { getEmbeddingProvider } from '@/lib/search/embeddingProvider';
import { getReranker } from '@/lib/search/reranker';
import { createBibleSearchService } from '@/lib/search/bibleSearchService';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/search:
 *   get:
 *     summary: Search for verses across the entire Bible
 *     description: Perform a full-text search (hybrid/semantic or legacy fallback) for verses matching a query.
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: versionId
 *         required: false
 *         schema: { type: string }
 *         description: Bible version ID or abbreviation (e.g., KJV)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30 }
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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

        // Dynamically detect if database has been enriched with semantic search metadata
        const isEnriched = Boolean(await Verse.exists({ searchText: { $ne: null } }));

        if (isEnriched) {
            // --- Unified Semantic/Hybrid Search Path ---
            
            // Resolve out-of-band version code/abbreviation from versionIdParam
            let resolvedVersionCode: string | undefined = undefined;
            if (versionIdParam) {
                if (versionIdParam.match(/^[0-9a-fA-F]{24}$/)) {
                    const versionDoc = await BibleVersion.findById(versionIdParam).select('abbreviation');
                    if (versionDoc) {
                        resolvedVersionCode = versionDoc.abbreviation;
                    }
                } else {
                    resolvedVersionCode = versionIdParam.toUpperCase();
                }
            }

            // Initialize search service components
            const embeddingProvider = getEmbeddingProvider();
            const rerankerService = getReranker();
            const searchService = createBibleSearchService(embeddingProvider, rerankerService);

            // Execute unified search
            const searchResponse = await searchService.search(q, {
                limit,
                versionCode: resolvedVersionCode
            });

            if (searchResponse.success) {
                // Map result list to match the original API schema expected by the React frontend
                const results = searchResponse.results.map((r: any) => ({
                    verseId: r.verseId,
                    number: r.verse,
                    text: r.text,
                    book: {
                        id: r.book.name,
                        name: r.book.name,
                        abbreviation: r.book.abbreviation
                    },
                    chapter: {
                        id: `${r.book.name}-${r.chapter}`,
                        number: r.chapter
                    },
                    version: {
                        id: r.version.code,
                        abbreviation: r.version.code,
                        name: r.version.name
                    },
                    themes: r.themes,
                    emotions: r.emotions,
                    score: r.score
                }));

                return NextResponse.json({
                    success: true,
                    data: {
                        results,
                        total: results.length,
                        query: q,
                        mode: searchResponse.mode,
                        processingTimeMs: searchResponse.processingTimeMs
                    }
                });
            }
        }

        // --- Legacy Regex Search Path (Fallback/Unpopulated) ---

        const legacyQuery: any = {
            text: { $regex: q.trim(), $options: 'i' }
        };

        // Handle version filtering for legacy path
        if (versionIdParam) {
            if (versionIdParam.match(/^[0-9a-fA-F]{24}$/)) {
                legacyQuery.version = versionIdParam;
            } else {
                const versionDoc = await BibleVersion.findOne({ abbreviation: versionIdParam.toUpperCase() }).select('_id');
                if (versionDoc) {
                    legacyQuery.version = versionDoc._id;
                } else {
                    return NextResponse.json({ success: false, error: `Version not found: ${versionIdParam}` }, { status: 404 });
                }
            }
        } else {
            const activeVersions = await BibleVersion.find({ isActive: true }).select('_id');
            if (activeVersions.length > 0) {
                legacyQuery.version = { $in: activeVersions.map(v => v._id) };
            }
        }

        const verses = await Verse.find(legacyQuery)
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
                query: q,
                mode: 'legacy'
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

