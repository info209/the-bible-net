import Fuse from 'fuse.js';
import { IVerse } from '@/models/Bible';
import { QueryNormalizer, NormalizedQuery } from '../normalization/normalizer';

export interface ScoredVerse {
    verse: IVerse;
    score: {
        exactPhrase: number;
        keyword: number;
        emotion: number;
        theme: number;
        fuzzy: number;
        partial: number;
        final: number;
    };
}

export class WeightedReranker {
    private static DEFAULT_WEIGHTS = {
        exactPhrase: 1.0,
        keywordMatch: 0.6,
        emotionMatch: 0.5,
        themeMatch: 0.4,
        fuzzyMatch: 0.3,
        partialOverlap: 0.2
    };

    /**
     * Rerank and score a list of candidate verses against a normalized query
     */
    public static rerank(
        verses: IVerse[],
        normalizedQuery: NormalizedQuery,
        weights = WeightedReranker.DEFAULT_WEIGHTS
    ): ScoredVerse[] {
        if (!verses || verses.length === 0) return [];

        const rawQuery = normalizedQuery.raw.toLowerCase().trim();
        const cleanQuery = normalizedQuery.cleanText;
        const queryStems = normalizedQuery.stemmedTokens;
        const expandedStems = normalizedQuery.expandedTokens;

        // 1. Initialize Fuse.js for in-memory fuzzy string matching on the candidate verses
        // We match on both the verse text and the reference
        const fuseOptions = {
            keys: [
                { name: 'text', weight: 0.8 },
                { name: 'reference', weight: 0.2 }
            ],
            includeScore: true,
            threshold: 0.6, // Allow moderate fuzzy variance for typo tolerance
            ignoreLocation: true
        };
        const fuse = new Fuse(verses, fuseOptions);
        const fuseResults = fuse.search(cleanQuery);
        
        // Map Fuse results by verse ID for O(1) lookup
        const fuseScoresMap = new Map<string, number>();
        for (const res of fuseResults) {
            if (res.item && res.score !== undefined) {
                fuseScoresMap.set((res.item as any)._id.toString(), res.score);
            }
        }

        const scoredVerses: ScoredVerse[] = verses.map(verse => {
            const verseId = verse._id.toString();
            const verseText = (verse.text || '').toLowerCase();
            const verseRef = (verse.reference || '').toLowerCase();
            
            // Stemmed verse tokens for keyword/token overlap checking
            const verseStems = QueryNormalizer.stemText(verseText);
            const verseStemsSet = new Set(verseStems);

            // A. Exact phrase match boost
            // If the full cleaned query matches as a substring in the verse text
            let exactPhraseScore = 0;
            if (cleanQuery && verseText.includes(cleanQuery)) {
                exactPhraseScore = weights.exactPhrase;
            } else if (cleanQuery && verseRef.includes(cleanQuery)) {
                exactPhraseScore = weights.exactPhrase * 0.8; // slightly less for matching in book name/ref
            }

            // B. Keyword match boost
            // Compare expanded query stems with verse keywords (stemmed)
            let keywordScore = 0;
            const keywords = verse.keywords || [];
            if (keywords.length > 0 && expandedStems.length > 0) {
                const stemmedKeywords = keywords.map(kw => QueryNormalizer.stemText(kw)[0]).filter(Boolean);
                const matchedKeywords = stemmedKeywords.filter(kwStem => expandedStems.includes(kwStem));
                if (matchedKeywords.length > 0) {
                    // Score is proportional to matched keywords, capped at 1.0
                    keywordScore = Math.min(1.0, matchedKeywords.length / Math.min(3, expandedStems.length)) * weights.keywordMatch;
                }
            }

            // C. Emotion match boost
            // Match expanded query stems with verse emotions
            let emotionScore = 0;
            const emotions = verse.emotions || [];
            if (emotions.length > 0 && expandedStems.length > 0) {
                const matchedEmotions = emotions.filter(emo => expandedStems.includes(emo.toLowerCase().trim()));
                if (matchedEmotions.length > 0) {
                    emotionScore = Math.min(1.0, matchedEmotions.length / Math.min(2, expandedStems.length)) * weights.emotionMatch;
                }
            }

            // D. Theme match boost
            // Match expanded query stems with verse themes
            let themeScore = 0;
            const themes = verse.themes || [];
            if (themes.length > 0 && expandedStems.length > 0) {
                const matchedThemes = themes.filter(th => expandedStems.includes(th.toLowerCase().trim()));
                if (matchedThemes.length > 0) {
                    themeScore = Math.min(1.0, matchedThemes.length / Math.min(2, expandedStems.length)) * weights.themeMatch;
                }
            }

            // E. Fuzzy string match score (Fuse.js)
            // Fuse score is [0, 1] where 0 is perfect. We invert it so 1 is perfect.
            const fuseScore = fuseScoresMap.get(verseId);
            const fuzzyScore = fuseScore !== undefined ? (1 - fuseScore) * weights.fuzzyMatch : 0;

            // F. Partial token stem overlap
            // Percentage of query stems present in the verse stems
            let partialScore = 0;
            if (queryStems.length > 0) {
                const matchedStems = queryStems.filter(stem => verseStemsSet.has(stem));
                partialScore = (matchedStems.length / queryStems.length) * weights.partialOverlap;
            }

            // G. popularity score boost (subtle tie-breaker)
            const popularityBoost = ((verse.popularityScore || 50) / 100) * 0.05;

            // Compute composite final score
            const finalScore = exactPhraseScore + keywordScore + emotionScore + themeScore + fuzzyScore + partialScore + popularityBoost;

            return {
                verse,
                score: {
                    exactPhrase: exactPhraseScore,
                    keyword: keywordScore,
                    emotion: emotionScore,
                    theme: themeScore,
                    fuzzy: fuzzyScore,
                    partial: partialScore,
                    final: parseFloat(finalScore.toFixed(4))
                }
            };
        });

        // Sort scored verses in descending order of their final score
        return scoredVerses.sort((a, b) => b.score.final - a.score.final);
    }
}
