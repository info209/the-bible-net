/**
 * Query parser for Bible search
 * Extracts: exact references, version codes, book names, and semantic intent
 */

import { BIBLE_BOOKS } from '@/utils/bibleBooks';

export interface ParsedQuery {
    raw: string;
    query: string; // Residual search text after extraction
    versionCode?: string;
    bookName?: string;
    bookAbbr?: string;
    chapter?: number;
    verse?: number;
    isExactReference: boolean;
    hasVersionFilter: boolean;
    hasBookFilter: boolean;
    hasChapterFilter: boolean;
    hasVerseFilter: boolean;
    detectMode: 'exact' | 'keyword' | 'semantic';
}

// Common version abbreviations and aliases
const VERSION_ALIASES: Record<string, string> = {
    'KJV': 'KJV',
    'KING JAMES': 'KJV',
    'KING JAMES VERSION': 'KJV',
    'NIV': 'NIV',
    'NEW INTERNATIONAL': 'NIV',
    'NEW INTERNATIONAL VERSION': 'NIV',
    'ESV': 'ESV',
    'ENGLISH STANDARD': 'ESV',
    'ENGLISH STANDARD VERSION': 'ESV',
    'NASB': 'NASB',
    'NEW AMERICAN STANDARD': 'NASB',
    'NKJV': 'NKJV',
    'NEW KING JAMES': 'NKJV',
    'NLT': 'NLT',
    'NEW LIVING': 'NLT',
    'IRV': 'IRV',
    'TE_IRV': 'TE_IRV',
};

/**
 * Extract book name and abbreviation from text
 * Handles various formats: "John", "Gospel of John", "Jn", "John's Gospel"
 */
export async function extractBookName(text: string): Promise<{
    name?: string;
    abbr?: string;
    remaining: string;
}> {
    const cleanText = text.trim();
    if (!cleanText) return { remaining: '' };
    
    const { resolveBook } = await import('@/utils/bibleBooksServer');
    
    // Split the text into tokens to search for book names
    const words = cleanText.split(/\s+/);
    
    // Check all sub-phrases from length 3 down to 1
    for (let len = Math.min(words.length, 3); len >= 1; len--) {
        for (let i = 0; i <= words.length - len; i++) {
            const subPhrase = words.slice(i, i + len).join(' ');
            const bookMatch = await resolveBook(subPhrase);
            if (bookMatch) {
                // Remove matched phrase
                const remaining = words.filter((_, idx) => idx < i || idx >= i + len).join(' ').trim();
                return { name: bookMatch.name, abbr: bookMatch.abbreviation, remaining };
            }
        }
    }
    
    return { remaining: cleanText };
}

/**
 * Extract version code from text
 * Handles: "KJV", "King James", "NIV", etc.
 */
export function extractVersionCode(text: string): {
    code?: string;
    remaining: string;
} {
    const cleanText = text.toUpperCase();
    
    for (const [alias, code] of Object.entries(VERSION_ALIASES)) {
        const pattern = new RegExp(`\\b${alias}\\b`);
        if (pattern.test(cleanText)) {
            const remaining = cleanText
                .replace(pattern, '')
                .trim();
            return { code, remaining };
        }
    }
    
    return { remaining: text };
}

/**
 * Extract exact Bible reference
 * Formats: "John 3:16", "John 3", "John:3:16" (error), "Psalms 23:4"
 */
export async function extractExactReference(text: string): Promise<{
    bookName?: string;
    bookAbbr?: string;
    chapter?: number;
    verse?: number;
    isExact: boolean;
    remaining: string;
}> {
    const result: {
        bookName?: string;
        bookAbbr?: string;
        chapter?: number;
        verse?: number;
        isExact: boolean;
        remaining: string;
    } = {
        isExact: false,
        remaining: text
    };
    
    // Pattern: BookName chapter:verse or BookName chapter or BookName:chapter:verse
    // Uses Unicode property escapes \p{L} and \p{M} to match any localized letters/marks and supports multi-word books
    const refPattern = /([1-3]?\s*[\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+)*)\s+(\d+)(?::(\d+))?/iu;
    const match = text.match(refPattern);
    
    if (!match) {
        return result;
    }
    
    const potentialBook = match[1].trim();
    const chapter = parseInt(match[2], 10);
    const verse = match[3] ? parseInt(match[3], 10) : undefined;
    
    // Try to match book
    const bookExtract = await extractBookName(potentialBook);
    if (!bookExtract.name) {
        return result;
    }
    
    // If we found book + chapter, it's at least a partial exact reference
    result['bookName'] = bookExtract.name;
    result['bookAbbr'] = bookExtract.abbr;
    result['chapter'] = chapter;
    if (verse) {
        result['verse'] = verse;
        result['isExact'] = true; // Full reference: book + chapter + verse
    } else {
        result['isExact'] = false; // Partial: book + chapter only
    }
    
    // Remove matched portion from remaining text
    result['remaining'] = text.replace(match[0], '').trim();
    
    return result;
}

/**
 * Parse a user query into structured components
 * Strategy:
 * 1. Extract version code
 * 2. Extract exact reference (book + chapter + verse)
 * 3. Extract book name (if not already in reference)
 * 4. Determine search mode based on what was extracted
 */
export async function parseQuery(rawQuery: string): Promise<ParsedQuery> {
    if (!rawQuery || rawQuery.trim().length === 0) {
        return {
            raw: rawQuery,
            query: '',
            isExactReference: false,
            hasVersionFilter: false,
            hasBookFilter: false,
            hasChapterFilter: false,
            hasVerseFilter: false,
            detectMode: 'semantic'
        };
    }
    
    let remaining = rawQuery.trim();
    
    // Step 1: Extract version
    const versionExtract = extractVersionCode(remaining);
    const versionCode = versionExtract.code;
    remaining = versionExtract.remaining;
    
    // Step 2: Extract exact reference
    const refExtract = await extractExactReference(remaining);
    remaining = refExtract.remaining;
    
    // Step 3: If we didn't get a book from reference, try extracting just book name
    let bookName = refExtract.bookName;
    let bookAbbr = refExtract.bookAbbr;
    
    if (!bookName) {
        const bookExtract = await extractBookName(remaining);
        bookName = bookExtract.name;
        bookAbbr = bookExtract.abbr;
        remaining = bookExtract.remaining;
    }
    
    // Step 4: Determine search mode
    let detectMode: 'exact' | 'keyword' | 'semantic';
    
    if (refExtract.verse !== undefined) {
        // Full reference: book + chapter + verse
        detectMode = 'exact';
    } else if (refExtract.chapter !== undefined && bookName) {
        // Partial reference: book + chapter
        detectMode = 'keyword';
    } else if (remaining.length < 20 && remaining.split(/\s+/).length <= 3) {
        // Short query with few words (likely keyword)
        detectMode = 'keyword';
    } else {
        // Default to semantic for longer, natural-language queries
        detectMode = 'semantic';
    }
    
    return {
        raw: rawQuery,
        query: remaining,
        versionCode,
        bookName,
        bookAbbr,
        chapter: refExtract.chapter,
        verse: refExtract.verse,
        isExactReference: refExtract.isExact,
        hasVersionFilter: Boolean(versionCode),
        hasBookFilter: Boolean(bookName),
        hasChapterFilter: Boolean(refExtract.chapter !== undefined),
        hasVerseFilter: Boolean(refExtract.verse !== undefined),
        detectMode
    };
}

/**
 * Normalize a book name to canonical form
 * Returns the canonical name and abbreviation if found
 */
export function normalizeBookName(input: string): {
    name?: string;
    abbr?: string;
} | null {
    if (!input) return null;
    
    const clean = input.toLowerCase().trim();
    
    for (const book of BIBLE_BOOKS) {
        if (book.name.toLowerCase() === clean || book.abbreviation.toLowerCase() === clean) {
            return { name: book.name, abbr: book.abbreviation };
        }
    }
    
    return null;
}

/**
 * Find closest book matches (for fuzzy matching if needed)
 */
export function findClosestBook(input: string, maxDistance: number = 2): typeof BIBLE_BOOKS[0] | null {
    const clean = input.toLowerCase().trim();
    
    // Exact match first
    for (const book of BIBLE_BOOKS) {
        if (book.name.toLowerCase() === clean || book.abbreviation.toLowerCase() === clean) {
            return book;
        }
    }
    
    // Prefix match as fallback
    for (const book of BIBLE_BOOKS) {
        if (book.name.toLowerCase().startsWith(clean) || book.abbreviation.toLowerCase().startsWith(clean)) {
            return book;
        }
    }
    
    return null;
}

/**
 * Validate chapter and verse numbers for a given book
 */
export function isValidChapterVerse(bookName: string, chapter: number, verse?: number): boolean {
    // This is a simple check; for full validation, cross-reference with actual Bible data
    if (chapter < 1 || chapter > 150) return false; // No book has > ~150 chapters
    if (verse && (verse < 1 || verse > 176)) return false; // No verse > ~176 verses
    return true;
}
