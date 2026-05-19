import { PorterStemmer } from 'natural';
import { NormalizedQuery } from '../normalization/normalizer';

export interface HighlightSegment {
    text: string;
    isHighlighted: boolean;
    type?: 'exact' | 'synonym' | 'fuzzy';
}

export class SearchHighlighter {
    /**
     * Highlights matched terms in a verse text.
     * Returns an HTML string with `<mark>` tags.
     */
    public static highlightHtml(text: string, normalizedQuery: NormalizedQuery): string {
        if (!text) return '';
        if (!normalizedQuery || normalizedQuery.tokens.length === 0) return text;

        const segments = this.segmentText(text, normalizedQuery);
        return segments.map(seg => {
            if (seg.isHighlighted) {
                const typeClass = `highlight-${seg.type || 'exact'}`;
                return `<mark class="search-highlight ${typeClass}" data-type="${seg.type}">${seg.text}</mark>`;
            }
            return seg.text;
        }).join('');
    }

    /**
     * Break text into highlighted and non-highlighted segments
     */
    public static segmentText(text: string, normalizedQuery: NormalizedQuery): HighlightSegment[] {
        if (!text) return [];
        
        const rawTokens = normalizedQuery.tokens.map(t => t.toLowerCase());
        const filteredTokens = normalizedQuery.filteredTokens.map(t => t.toLowerCase());
        const stemmedQuery = normalizedQuery.stemmedTokens;
        const expandedStems = normalizedQuery.expandedTokens;

        // Regex to split text into words and non-words (spaces, punctuation)
        const regex = /(\b[a-zA-Z0-9\-\']+\b)/g;
        const parts = text.split(regex);
        
        const segments: HighlightSegment[] = [];

        for (const part of parts) {
            // If it is punctuation or whitespace, do not highlight
            if (!part || !part.match(/^[a-zA-Z0-9\-\']+$/)) {
                segments.push({ text: part, isHighlighted: false });
                continue;
            }

            const cleanWord = part.toLowerCase().trim();
            const wordStem = PorterStemmer.stem(cleanWord);

            // A. Check for Exact Match
            // Exact raw token match or matches standard query stems
            if (rawTokens.includes(cleanWord) || stemmedQuery.includes(wordStem)) {
                segments.push({
                    text: part,
                    isHighlighted: true,
                    type: 'exact'
                });
                continue;
            }

            // B. Check for Synonym Match
            // Matches any of the expanded synonym stems
            if (expandedStems.includes(wordStem)) {
                segments.push({
                    text: part,
                    isHighlighted: true,
                    type: 'synonym'
                });
                continue;
            }

            // C. Check for Fuzzy/Prefix Match
            // E.g. starts with one of the raw query tokens (minimum length 3)
            let isFuzzyMatch = false;
            for (const token of filteredTokens) {
                if (token.length >= 3 && (cleanWord.startsWith(token) || token.startsWith(cleanWord))) {
                    isFuzzyMatch = true;
                    break;
                }
            }

            if (isFuzzyMatch) {
                segments.push({
                    text: part,
                    isHighlighted: true,
                    type: 'fuzzy'
                });
                continue;
            }

            // D. No match
            segments.push({ text: part, isHighlighted: false });
        }

        return segments;
    }
}
