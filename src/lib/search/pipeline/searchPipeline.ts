import { Verse, BibleVersion } from '@/models/Bible';
import { ParsedQuery, parseQuery } from '../queryParser';
import { QueryNormalizer, NormalizedQuery } from '../normalization/normalizer';
import { WeightedReranker, ScoredVerse } from '../ranking/reranker';
import { SearchHighlighter } from '../highlighting/highlighter';
import { SynonymEngine } from '../synonyms/synonymEngine';
import { getLocalizedBookName } from '@/utils/bibleBooks';

function detectQueryLanguage(query: string): 'hi' | 'te' | 'en' {
    if (/[\u0900-\u097F]/.test(query)) return 'hi'; // Devanagari range
    if (/[\u0C00-\u0C7F]/.test(query)) return 'te'; // Telugu range
    return 'en';
}

function getDbBookNameFilter(bookName: string): any {
    const hindiName = getLocalizedBookName(bookName, 'hi');
    const teluguName = getLocalizedBookName(bookName, 'te');
    const names = Array.from(new Set([bookName, hindiName, teluguName]));
    return names.length === 1 ? bookName : { $in: names };
}

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
    displayReference?: string;
    text: string;
    highlightedText?: string; // Enhanced feature!
    version: {
        code: string;
        name: string;
    };
    book: {
        name: string;
        displayName?: string;
        abbreviation: string;
    };
    chapter: number;
    verse: number;
    themes: string[];
    emotions: string[];
    score: {
        exactPhrase?: number;
        keyword?: number;
        emotion?: number;
        theme?: number;
        fuzzy?: number;
        partial?: number;
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

export class BibleSearchService {
    /**
     * Initialize search service (loads synonym engine DB collections)
     */
    constructor() {
        // Asynchronously load custom synonyms from DB in background
        SynonymEngine.getInstance().loadCustomSynonymsFromDb().catch(err => {
            console.error('Synonym Engine background DB load failed:', err);
        });
    }

    /**
     * Primary entrypoint: search for verses
     */
    public async search(
        query: string,
        options: SearchOptions = {}
    ): Promise<SearchResponse> {
        const startTime = Date.now();
        let parsed: ParsedQuery | null = null;
        
        try {
            const limit = Math.min(options.limit || 30, 100);
            const page = Math.max(options.page || 1, 1);
            parsed = await parseQuery(query);
            
            // Override with out-of-band versionCode if explicitly supplied
            if (options.versionCode) {
                parsed.versionCode = options.versionCode;
                parsed.hasVersionFilter = true;
            } else {
                // Auto-detect language of search term and default target version
                const queryLang = detectQueryLanguage(query);
                if (queryLang === 'hi') {
                    parsed.versionCode = 'IRV';
                    parsed.hasVersionFilter = true;
                } else if (queryLang === 'te') {
                    parsed.versionCode = 'తెలుగు IRV';
                    parsed.hasVersionFilter = true;
                }
            }
            
            // Determine search mode
            let mode = options.mode || parsed.detectMode;
            if (mode === 'auto') {
                mode = parsed.detectMode;
            }
            
            let results: VerseSearchResult[] = [];
            
            // Execute search path
            if (mode === 'exact') {
                results = await this.searchExact(parsed, limit);
            } else {
                // Both keyword and semantic searches run the optimized hybrid pipeline without vectors
                results = await this.searchHybrid(parsed, limit, page);
            }
            
            const processingTimeMs = Date.now() - startTime;
            
            return {
                success: true,
                query,
                mode: mode === 'exact' ? 'exact' : (mode === 'keyword' ? 'keyword' : 'semantic'),
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
            console.error('Search failed in pipeline:', error);
            
            const fallbackParsed = parsed || {
                raw: query,
                query: '',
                isExactReference: false,
                hasVersionFilter: false,
                hasBookFilter: false,
                hasChapterFilter: false,
                hasVerseFilter: false,
                detectMode: 'semantic' as const
            };
            
            return {
                success: false,
                query,
                mode: 'keyword',
                parsed: fallbackParsed,
                filters: {},
                pagination: { limit: 0, page: 1, total: 0 },
                results: [],
                processingTimeMs,
                error: error.message || 'Search failed'
            };
        }
    }

    /**
     * Exact reference lookup
     */
    private async searchExact(parsed: ParsedQuery, limit: number): Promise<VerseSearchResult[]> {
        if (!parsed.bookName || parsed.chapter === undefined) {
            return [];
        }
        
        const filters: any = {
            bookName: getDbBookNameFilter(parsed.bookName),
            chapterNumber: parsed.chapter
        };
        
        if (parsed.verse !== undefined) {
            filters.number = parsed.verse;
        }
        
        if (parsed.versionCode) {
            filters.versionCode = parsed.versionCode;
        }
        
        // Exact reference is super fast and hits the primary lookup index
        const verses = await Verse.find(filters)
            .select('_id reference text versionCode bookName chapterNumber number themes emotions keywords popularityScore')
            .lean()
            .limit(limit);
        
        const normalizedQuery = QueryNormalizer.normalize(parsed.raw);
        
        return verses.map((v: any) => this.mapScoredVerseToResult({
            verse: v,
            score: {
                exactPhrase: 1.0,
                keyword: 0,
                emotion: 0,
                theme: 0,
                fuzzy: 0,
                partial: 0,
                final: 1.0
            }
        }, normalizedQuery));
    }

    /**
     * Optimized Hybrid semantic-like search without vectors
     */
    private async searchHybrid(
        parsed: ParsedQuery,
        limit: number,
        page: number
    ): Promise<VerseSearchResult[]> {
        const skip = (page - 1) * limit;
        
        // Extract residual query or full text if no residual query remains
        const queryText = parsed.query || parsed.raw;
        if (!queryText || queryText.length < 2) {
            return [];
        }

        // 1. Normalize query and expand with synonyms
        const normalizedQuery = QueryNormalizer.normalize(queryText);
        
        // Make sure we have active tokens to search
        if (normalizedQuery.tokens.length === 0) {
            return [];
        }

        // 2. Build MongoDB text search query
        // We include both original tokens and synonym tokens in the search string
        const textSearchTerms = Array.from(new Set([
            ...normalizedQuery.tokens,
            ...normalizedQuery.expandedTokens
        ])).join(' ');

        // Apply filters
        const filters: any = {};
        if (parsed.versionCode) {
            filters.versionCode = parsed.versionCode;
        }
        if (parsed.bookName) {
            filters.bookName = getDbBookNameFilter(parsed.bookName);
        }
        if (parsed.chapter) {
            filters.chapterNumber = parsed.chapter;
        }

        const textFilters = {
            ...filters,
            $text: { $search: textSearchTerms }
        };

        const cleanQuery = normalizedQuery.cleanText;
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = new RegExp(escapeRegExp(cleanQuery), 'i');
        const regexFilters = {
            ...filters,
            $or: [
                { normalizedText: regexPattern },
                { keywords: regexPattern }
            ]
        };

        // 3. Fetch candidate verses in parallel (both text and regex search)
        // We fetch more candidates than the limit (e.g. limit * 4, capped at 200) to allow accurate in-memory reranking
        const candidateLimit = Math.min(limit * 4, 200);

        const [textCandidates, regexCandidates] = await Promise.all([
            Verse.find(textFilters)
                .select('_id reference text versionCode bookName chapterNumber number themes emotions keywords popularityScore')
                .lean()
                .limit(candidateLimit),
            Verse.find(regexFilters)
                .select('_id reference text versionCode bookName chapterNumber number themes emotions keywords popularityScore')
                .lean()
                .limit(candidateLimit)
        ]);

        // Merge and deduplicate
        const candidateMap = new Map<string, any>();
        textCandidates.forEach((c: any) => candidateMap.set(c._id.toString(), c));
        regexCandidates.forEach((c: any) => candidateMap.set(c._id.toString(), c));
        const candidates = Array.from(candidateMap.values());

        if (candidates.length === 0) {
            return [];
        }

        // 4. In-memory reranking and scoring
        const scoredVerses = WeightedReranker.rerank(candidates as any[], normalizedQuery);

        // 5. Paginate and map results
        const paginatedScoredVerses = scoredVerses.slice(skip, skip + limit);

        return paginatedScoredVerses.map(sv => this.mapScoredVerseToResult(sv, normalizedQuery));
    }

    /**
     * Map ScoredVerse to VerseSearchResult API contract
     */
    private mapScoredVerseToResult(
        sv: ScoredVerse,
        normalizedQuery: NormalizedQuery
    ): VerseSearchResult {
        const { verse, score } = sv;
        
        // Generate high-quality highlighted text segment
        const highlightedText = SearchHighlighter.highlightHtml(verse.text, normalizedQuery);

        const lang = (verse.versionCode || '').toUpperCase() === 'IRV' ? 'hi' : (((verse.versionCode || '').toUpperCase() === 'తెలుగు IRV') ? 'te' : 'en');
        const localizedBookName = getLocalizedBookName(verse.bookName || '', lang);
        const displayReference = `${localizedBookName} ${verse.chapterNumber}:${verse.number}`;

        return {
            verseId: verse._id.toString(),
            reference: verse.reference || `${verse.bookName} ${verse.chapterNumber}:${verse.number}`,
            displayReference,
            text: verse.text,
            highlightedText,
            version: {
                code: verse.versionCode || 'NET',
                name: verse.versionCode || 'NET'
            },
            book: {
                name: verse.bookName || '',
                displayName: localizedBookName,
                abbreviation: verse.bookName ? verse.bookName.substring(0, 3).toUpperCase() : ''
            },
            chapter: verse.chapterNumber || 1,
            verse: verse.number,
            themes: verse.themes || [],
            emotions: verse.emotions || [],
            score: {
                exactPhrase: score.exactPhrase,
                keyword: score.keyword,
                emotion: score.emotion,
                theme: score.theme,
                fuzzy: score.fuzzy,
                partial: score.partial,
                final: score.final
            }
        };
    }
}

/**
 * Factory function to create search service
 */
export function createBibleSearchService(): BibleSearchService {
    return new BibleSearchService();
}
