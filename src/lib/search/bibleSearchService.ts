/**
 * Bible semantic search service
 * Supports: exact reference, keyword/lexical, and semantic (vector) search
 */

import { Verse, BibleVersion } from '@/models/Bible';
import { ParsedQuery, parseQuery, normalizeBookName } from './queryParser';
import { EmbeddingProvider } from './embeddingProvider';
import { Reranker, mergeScores } from './reranker';

export interface SearchFilters {
    versionCode?: string;
    bookName?: string;
    testament?: 'OT' | 'NT';
    chapter?: number;
}

export interface SearchOptions {
    limit?: number;
    page?: number;
    mode?: 'exact' | 'keyword' | 'semantic' | 'auto';
    rerank?: boolean;
    versionCode?: string;
}

export interface VerseSearchResult {
    verseId: string;
    reference: string;
    text: string;
    version: {
        code: string;
        name: string;
    };
    book: {
        name: string;
        abbreviation: string;
    };
    chapter: number;
    verse: number;
    themes: string[];
    emotions: string[];
    score: {
        vector?: number;
        rerank?: number;
        lexical?: number;
        final: number;
    };
}

export interface SearchResponse {
    success: boolean;
    query: string;
    mode: 'exact' | 'keyword' | 'semantic';
    parsed: ParsedQuery;
    filters: SearchFilters;
    pagination: {
        limit: number;
        page: number;
        total: number;
    };
    results: VerseSearchResult[];
    processingTimeMs: number;
    error?: string;
}

/**
 * Main Bible search service
 */
export class BibleSearchService {
    constructor(
        private embeddingProvider: EmbeddingProvider,
        private reranker: Reranker
    ) {}
    
    /**
     * Execute search with automatic mode selection or specified mode
     */
    async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResponse> {
        const startTime = Date.now();
        
        try {
            const limit = Math.min(options.limit || 30, 100);
            const page = Math.max(options.page || 1, 1);
            const parsed = parseQuery(query);
            
            // Override with out-of-band versionCode if explicitly supplied
            if (options.versionCode) {
                parsed.versionCode = options.versionCode;
                parsed.hasVersionFilter = true;
            }
            
            // Determine search mode
            let mode = options.mode || parsed.detectMode;
            if (mode === 'auto') {
                mode = parsed.detectMode;
            }
            
            let results: VerseSearchResult[] = [];
            
            // Execute appropriate search
            if (mode === 'exact') {
                results = await this.searchExact(parsed, limit);
            } else if (mode === 'keyword') {
                results = await this.searchKeyword(parsed, limit, page);
            } else {
                results = await this.searchSemantic(parsed, limit, page, options.rerank);
            }
            
            const processingTimeMs = Date.now() - startTime;
            
            return {
                success: true,
                query,
                mode,
                parsed,
                filters: {
                    versionCode: parsed.versionCode,
                    bookName: parsed.bookName,
                    chapter: parsed.chapter
                },
                pagination: {
                    limit,
                    page,
                    total: results.length
                },
                results,
                processingTimeMs
            };
        } catch (error: any) {
            const processingTimeMs = Date.now() - startTime;
            
            return {
                success: false,
                query,
                mode: 'keyword',
                parsed: parseQuery(query),
                filters: {},
                pagination: { limit: 0, page: 1, total: 0 },
                results: [],
                processingTimeMs,
                error: error.message || 'Search failed'
            };
        }
    }
    
    /**
     * Exact reference search
     * Fast lookup for "John 3:16" style queries
     */
    private async searchExact(parsed: ParsedQuery, limit: number): Promise<VerseSearchResult[]> {
        if (!parsed.bookName || parsed.chapter === undefined) {
            return [];
        }
        
        const filters: any = {
            bookName: parsed.bookName,
            chapterNumber: parsed.chapter
        };
        
        if (parsed.verse !== undefined) {
            filters.number = parsed.verse;
        }
        
        if (parsed.versionCode) {
            filters.versionCode = parsed.versionCode;
        }
        
        const verses = await Verse.find(filters)
            .select('_id reference text versionCode versionName bookName bookAbbr chapterNumber number themes emotions')
            .lean()
            .limit(limit);
        
        return verses.map((v: any) => this.mapVerseToResult(v, 1.0));
    }
    
    /**
     * Keyword/lexical search
     * Uses text index or Atlas Search for phrase matching
     */
    private async searchKeyword(
        parsed: ParsedQuery,
        limit: number,
        page: number
    ): Promise<VerseSearchResult[]> {
        const skip = (page - 1) * limit;
        
        const filters: any = {};
        
        // Build search text query
        let searchQuery = parsed.query;
        if (!searchQuery || searchQuery.length < 2) {
            // If no residual query, use all filters as search terms
            if (parsed.bookName) searchQuery = parsed.bookName;
            else if (parsed.versionCode) searchQuery = parsed.versionCode;
            else return [];
        }
        
        // Apply filters
        if (parsed.versionCode) {
            filters.versionCode = parsed.versionCode;
        }
        if (parsed.bookName) {
            filters.bookName = parsed.bookName;
        }
        if (parsed.chapter) {
            filters.chapterNumber = parsed.chapter;
        }
        
        // Text search
        const textFilters = {
            ...filters,
            $text: { $search: searchQuery }
        };
        
        const verses = await Verse.find(textFilters)
            .select('_id reference text versionCode versionName bookName bookAbbr chapterNumber number themes emotions score')
            .sort({ score: { $meta: 'textScore' } })
            .skip(skip)
            .limit(limit)
            .lean();
        
        return verses.map((v: any) => {
            const textScore = v.score?.['$meta'] ? (v.score['$meta'] as number) / 10 : 0.5;
            return this.mapVerseToResult(v, textScore);
        });
    }
    
    /**
     * Semantic/vector search
     * Uses embeddings and MongoDB Atlas Vector Search
     */
    private async searchSemantic(
        parsed: ParsedQuery,
        limit: number,
        page: number,
        shouldRerank: boolean = false
    ): Promise<VerseSearchResult[]> {
        const skip = (page - 1) * limit;
        
        // Generate query embedding
        const queryText = parsed.query || parsed.raw;
        if (!queryText || queryText.length < 2) {
            return [];
        }
        
        let queryEmbedding: number[];
        try {
            queryEmbedding = await this.embeddingProvider.embed(queryText);
        } catch (error: any) {
            console.error('Failed to generate query embedding:', error);
            // Fallback to keyword search
            return this.searchKeyword(parsed, limit, page);
        }
        
        // Build aggregation pipeline for vector search
        const pipeline: any[] = [
            {
                $search: {
                    cosmosSearch: true,
                    vector: queryEmbedding,
                    k: Math.min(limit * 3, 50), // Retrieve more candidates for reranking
                    path: 'embedding'
                }
            },
            {
                $project: {
                    vectorScore: { $meta: 'searchScore' },
                    _id: 1,
                    reference: 1,
                    text: 1,
                    versionCode: 1,
                    versionName: 1,
                    bookName: 1,
                    bookAbbr: 1,
                    chapterNumber: 1,
                    number: 1,
                    themes: 1,
                    emotions: 1
                }
            }
        ];
        
        // Apply filters
        const match: any = {};
        if (parsed.versionCode) match.versionCode = parsed.versionCode;
        if (parsed.bookName) match.bookName = parsed.bookName;
        if (parsed.chapter) match.chapterNumber = parsed.chapter;
        
        if (Object.keys(match).length > 0) {
            pipeline.push({ $match: match });
        }
        
        // Limit and skip
        pipeline.push({ $limit: limit + skip });
        pipeline.push({ $skip: skip });
        
        let verses = await Verse.aggregate(pipeline).exec();
        
        // Optional reranking
        if (shouldRerank && verses.length > 0) {
            const texts = verses.map((v: any) => v.text);
            try {
                const rerankResults = await this.reranker.rerank(queryText, texts);
                
                // Merge vector scores with rerank scores
                verses = verses.map((v: any, index: number) => {
                    const rerankResult = rerankResults.find(r => r.index === index);
                    const rerankScore = rerankResult?.score || 0;
                    const finalScore = mergeScores(v.vectorScore || 0.5, rerankScore);
                    
                    return {
                        ...v,
                        vectorScore: v.vectorScore,
                        rerankScore,
                        finalScore
                    };
                });
                
                // Sort by final score
                verses.sort((a: any, b: any) => (b.finalScore || 0) - (a.finalScore || 0));
            } catch (error: any) {
                console.warn('Reranking failed, using vector scores:', error.message);
            }
        }
        
        return verses.map((v: any) => {
            const score = {
                vector: v.vectorScore || 0.5,
                rerank: v.rerankScore,
                final: v.finalScore || v.vectorScore || 0.5
            };
            return this.mapVerseToResult(v, score.final, score);
        });
    }
    
    /**
     * Map MongoDB verse to API result
     */
    private mapVerseToResult(
        verse: any,
        finalScore: number,
        scoreDetails?: any
    ): VerseSearchResult {
        return {
            verseId: verse._id.toString(),
            reference: verse.reference || `${verse.bookName} ${verse.chapterNumber}:${verse.number}`,
            text: verse.text,
            version: {
                code: verse.versionCode,
                name: verse.versionName
            },
            book: {
                name: verse.bookName,
                abbreviation: verse.bookAbbr
            },
            chapter: verse.chapterNumber,
            verse: verse.number,
            themes: verse.themes || [],
            emotions: verse.emotions || [],
            score: {
                vector: scoreDetails?.vector,
                rerank: scoreDetails?.rerank,
                lexical: scoreDetails?.lexical,
                final: Math.max(0, Math.min(1, finalScore)) // Clamp to [0, 1]
            }
        };
    }
}

/**
 * Factory function to create search service
 */
export function createBibleSearchService(
    embeddingProvider: EmbeddingProvider,
    reranker: Reranker
): BibleSearchService {
    return new BibleSearchService(embeddingProvider, reranker);
}
