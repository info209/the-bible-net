import { PorterStemmer } from 'natural';
import { SynonymEngine } from '../synonyms/synonymEngine';

// Common English stop words list (tailored for search but preserving critical Biblical terms if needed)
const STOP_WORDS = new Set<string>([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 
    'by', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 
    'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 
    'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'me', 
    'more', 'most', 'my', 'myself', 'no', 'nor', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 
    'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 
    'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface NormalizedQuery {
    raw: string;
    cleanText: string;             // Lowercase, stripped of punctuation
    tokens: string[];              // Original clean word tokens
    filteredTokens: string[];      // Tokens with stop words removed
    stemmedTokens: string[];       // Stemmed filtered tokens
    expandedTokens: string[];      // Stemmed & filtered tokens expanded with synonyms
}

export class QueryNormalizer {
    /**
     * Normalize a raw query string into a structured NormalizedQuery
     */
    public static normalize(query: string): NormalizedQuery {
        const raw = query || '';
        
        // 1. Lowercase and strip punctuation/special characters, keeping alphanumeric and spaces
        const cleanText = raw
            .toLowerCase()
            .replace(/[^\w\s\-\']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        // 2. Tokenize by space
        const tokens = cleanText.split(/\s+/).filter(Boolean);
        
        // 3. Filter stop words
        const filteredTokens = tokens.filter(token => !STOP_WORDS.has(token));
        
        // 4. Stem tokens using natural's PorterStemmer
        const stemmedTokens = filteredTokens.map(token => PorterStemmer.stem(token));
        
        // Remove duplicate stems
        const uniqueStems = Array.from(new Set(stemmedTokens));
        
        // 5. Expand tokens with synonyms
        const synonymEngine = SynonymEngine.getInstance();
        
        // We expand the filtered raw tokens, then stem all the expanded synonym tokens
        const expandedRawTokens = synonymEngine.expandTokens(filteredTokens);
        const expandedStems = expandedRawTokens.map(token => PorterStemmer.stem(token));
        const expandedTokens = Array.from(new Set(expandedStems));

        return {
            raw,
            cleanText,
            tokens,
            filteredTokens,
            stemmedTokens: uniqueStems,
            expandedTokens
        };
    }

    /**
     * Normalize a single word or verse text to its stems for indexing/comparison
     */
    public static stemText(text: string): string[] {
        if (!text) return [];
        const clean = text
            .toLowerCase()
            .replace(/[^\w\s\-\']/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        
        return clean
            .split(/\s+/)
            .filter(token => token.length > 1 && !STOP_WORDS.has(token))
            .map(token => PorterStemmer.stem(token));
    }
}
