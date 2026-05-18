import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getEmbeddingProvider } from '@/lib/search/embeddingProvider';
import { getReranker } from '@/lib/search/reranker';
import { createBibleSearchService } from '@/lib/search/bibleSearchService';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/search-hybrid:
 *   get:
 *     summary: Search Bible verses with hybrid search (exact, keyword, semantic)
 *     description: |
 *       Unified Bible search supporting:
 *       - Exact reference lookup (e.g., "John 3:16")
 *       - Keyword/phrase search (e.g., "fear not")
 *       - Semantic/emotion search (e.g., "anxiety", "hope in suffering")
 *       
 *       Query parser automatically detects format and chooses search mode.
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         description: |
 *           Search query. Examples:
 *           - "John 3:16" (exact reference)
 *           - "KJV John 3:16" (exact ref with version)
 *           - "fear not" (keyword search)
 *           - "anxiety" (semantic/emotion search)
 *           - "hope in Psalms" (semantic + book filter)
 *           - "comfort Romans KJV" (semantic + book + version)
 *       - in: query
 *         name: mode
 *         schema: 
 *           type: string
 *           enum: [auto, exact, keyword, semantic]
 *           default: auto
 *         description: Search mode. Auto-detect recommended.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 100 }
 *         description: Results per page
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Page number
 *       - in: query
 *         name: rerank
 *         schema: { type: boolean, default: false }
 *         description: Apply cross-encoder reranking to semantic results (slower)
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 query: { type: string }
 *                 mode: { type: string, enum: [exact, keyword, semantic] }
 *                 filters:
 *                   type: object
 *                   properties:
 *                     versionCode: { type: string }
 *                     bookName: { type: string }
 *                     chapter: { type: number }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit: { type: number }
 *                     page: { type: number }
 *                     total: { type: number }
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       verseId: { type: string }
 *                       reference: { type: string, example: "John 3:16" }
 *                       text: { type: string }
 *                       version: 
 *                         type: object
 *                         properties:
 *                           code: { type: string }
 *                           name: { type: string }
 *                       book:
 *                         type: object
 *                         properties:
 *                           name: { type: string }
 *                           abbreviation: { type: string }
 *                       chapter: { type: number }
 *                       verse: { type: number }
 *                       themes: { type: array, items: { type: string } }
 *                       emotions: { type: array, items: { type: string } }
 *                       score:
 *                         type: object
 *                         properties:
 *                           vector: { type: number, example: 0.92 }
 *                           rerank: { type: number }
 *                           lexical: { type: number }
 *                           final: { type: number }
 *                 processingTimeMs: { type: number }
 *       400:
 *         description: Invalid query parameters
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const mode = searchParams.get('mode') as 'auto' | 'exact' | 'keyword' | 'semantic' | undefined;
        const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
        const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
        const rerank = searchParams.get('rerank') === 'true';
        
        // Validate input
        if (!q || q.trim().length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Query parameter "q" is required and must be non-empty'
                },
                { status: 400 }
            );
        }
        
        // Initialize services
        const embeddingProvider = getEmbeddingProvider();
        const rerankerService = getReranker();
        const searchService = createBibleSearchService(embeddingProvider, rerankerService);
        
        // Execute search
        const response = await searchService.search(q, {
            mode,
            limit,
            page,
            rerank
        });
        
        if (!response.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: response.error || 'Search failed'
                },
                { status: 500 }
            );
        }
        
        // Return results
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Bible hybrid search error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Search failed'
            },
            { status: 500 }
        );
    }
}

/**
 * POST endpoint for complex search queries
 * Allows request body for better filtering options
 */
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        
        const body = await req.json();
        const {
            q,
            query,
            mode,
            limit = 30,
            page = 1,
            rerank = false
        } = body;
        
        const searchQuery = q || query;
        
        if (!searchQuery || searchQuery.trim().length === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Query field is required'
                },
                { status: 400 }
            );
        }
        
        // Initialize services
        const embeddingProvider = getEmbeddingProvider();
        const rerankerService = getReranker();
        const searchService = createBibleSearchService(embeddingProvider, rerankerService);
        
        // Execute search
        const response = await searchService.search(searchQuery, {
            mode: mode || 'auto',
            limit: Math.min(limit, 100),
            page: Math.max(page, 1),
            rerank
        });
        
        if (!response.success) {
            return NextResponse.json(response, { status: 500 });
        }
        
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('Bible hybrid search error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Search failed'
            },
            { status: 500 }
        );
    }
}
