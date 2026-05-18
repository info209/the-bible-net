/**
 * Bible verse enrichment: themes, emotions, and keywords extraction
 * This module assigns themes and emotions to verses using deterministic rules
 * No external LLM required - all rules are hard-coded based on Bible knowledge
 */

/**
 * Emotion/Theme taxonomy for Bible search
 * These represent common user intents when searching scripture
 */
export const THEME_TAXONOMY = {
    // Negative emotions and struggles
    ANXIETY: { name: 'anxiety', keywords: ['anxious', 'worry', 'worry', 'worried', 'troubled', 'afraid', 'fear'] },
    FEAR: { name: 'fear', keywords: ['fear', 'afraid', 'terror', 'frightened', 'dread'] },
    GRIEF: { name: 'grief', keywords: ['grief', 'mourn', 'mourning', 'sorrow', 'weep', 'weeping', 'tears'] },
    LONELINESS: { name: 'loneliness', keywords: ['lonely', 'alone', 'forsaken', 'abandoned', 'desolate'] },
    DEPRESSION: { name: 'depression', keywords: ['depressed', 'despair', 'hopeless', 'darkness', 'heavy', 'heavy-hearted'] },
    SHAME: { name: 'shame', keywords: ['shame', 'shameful', 'ashamed', 'disgrace', 'humiliation'] },
    ANGER: { name: 'anger', keywords: ['anger', 'angry', 'wrath', 'rage', 'furious'] },
    
    // Positive emotions and states
    HOPE: { name: 'hope', keywords: ['hope', 'hope', 'hopeful', 'trust', 'confidence'] },
    PEACE: { name: 'peace', keywords: ['peace', 'peaceful', 'calm', 'rest', 'tranquil'] },
    JOY: { name: 'joy', keywords: ['joy', 'joyful', 'rejoice', 'gladness', 'happy', 'delight'] },
    LOVE: { name: 'love', keywords: ['love', 'loved', 'compassion', 'kindness', 'charity'] },
    HEALING: { name: 'healing', keywords: ['heal', 'healing', 'wholeness', 'recovery', 'restoration', 'restore', 'mending'] },
    FORGIVENESS: { name: 'forgiveness', keywords: ['forgive', 'forgiveness', 'pardon', 'grace', 'mercy'] },
    STRENGTH: { name: 'strength', keywords: ['strength', 'strong', 'power', 'mighty', 'endurance', 'courage'] },
    FAITH: { name: 'faith', keywords: ['faith', 'faithful', 'believe', 'belief', 'trust', 'conviction'] },
    GUIDANCE: { name: 'guidance', keywords: ['guide', 'guidance', 'direction', 'wisdom', 'counsel', 'lead', 'path'] },
    PROTECTION: { name: 'protection', keywords: ['protection', 'protect', 'shelter', 'refuge', 'safe', 'safety', 'shield'] },
    SALVATION: { name: 'salvation', keywords: ['salvation', 'save', 'saved', 'redemption', 'redeemed', 'rescue', 'deliverance'] },
} as const;

/**
 * Book-specific theme defaults
 * These themes are commonly associated with certain books
 */
export const BOOK_THEME_DEFAULTS: Record<string, string[]> = {
    'Psalms': ['comfort', 'protection', 'faith', 'praise', 'lament'],
    'Proverbs': ['wisdom', 'guidance', 'discipline', 'prudence'],
    'Ecclesiastes': ['meaning', 'vanity', 'purpose', 'time'],
    'Song of Solomon': ['love', 'romance', 'devotion'],
    'Isaiah': ['salvation', 'redemption', 'prophecy', 'comfort', 'healing'],
    'Jeremiah': ['repentance', 'judgment', 'lament', 'restoration'],
    'Lamentations': ['grief', 'mourning', 'lament', 'suffering'],
    'Job': ['suffering', 'faith', 'perseverance', 'grief'],
    'Romans': ['faith', 'salvation', 'grace', 'love'],
    'Galatians': ['faith', 'grace', 'freedom', 'love'],
    'Ephesians': ['grace', 'love', 'unity', 'spiritual'],
    '1 Corinthians': ['love', 'faith', 'resurrection', 'spiritual gifts'],
    '1 John': ['love', 'faith', 'light', 'fellowship'],
    'Revelation': ['salvation', 'prophecy', 'hope', 'eternal'],
    'Matthew': ['kingdom', 'mercy', 'faith', 'discipleship'],
    'Mark': ['discipleship', 'faith', 'redemption', 'grace'],
    'Luke': ['mercy', 'grace', 'joy', 'inclusion'],
    'John': ['love', 'light', 'eternal life', 'faith'],
};

/**
 * Extract keywords from verse text
 * Simple approach: extract capitalized words (likely proper nouns) and common Biblical terms
 */
export function extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const seenKeywords = new Set<string>();
    
    // Important biblical terms (low-hanging fruit)
    const biblicalTerms = [
        'god', 'lord', 'jesus', 'christ', 'spirit', 'holy', 'soul', 'heart',
        'love', 'faith', 'grace', 'mercy', 'forgive', 'salvation', 'redemption',
        'peace', 'joy', 'hope', 'strength', 'power', 'kingdom', 'eternal',
        'life', 'death', 'resurrection', 'light', 'darkness', 'truth', 'wisdom'
    ];
    
    const lowerText = text.toLowerCase();
    
    for (const term of biblicalTerms) {
        if (lowerText.includes(term) && !seenKeywords.has(term)) {
            keywords.push(term);
            seenKeywords.add(term);
        }
    }
    
    // Extract proper nouns (words starting with capitals)
    const words = text.split(/\s+/);
    for (const word of words) {
        const clean = word.replace(/[^\w]/g, '');
        if (clean.length > 2 && /^[A-Z]/.test(clean) && !seenKeywords.has(clean.toLowerCase())) {
            keywords.push(clean.toLowerCase());
            seenKeywords.add(clean.toLowerCase());
        }
    }
    
    return keywords.slice(0, 10); // Limit to 10 keywords
}

/**
 * Detect themes and emotions in verse text
 * Uses keyword matching against taxonomy
 * Returns detected themes and emotions
 */
export function detectThemesAndEmotions(
    text: string,
    bookName?: string
): {
    themes: string[];
    emotions: string[];
} {
    const themes: string[] = [];
    const emotions: string[] = [];
    const seenThemes = new Set<string>();
    const seenEmotions = new Set<string>();
    
    const lowerText = text.toLowerCase();
    
    // Add book-default themes
    if (bookName && BOOK_THEME_DEFAULTS[bookName]) {
        for (const theme of BOOK_THEME_DEFAULTS[bookName]) {
            if (!seenThemes.has(theme)) {
                themes.push(theme);
                seenThemes.add(theme);
            }
        }
    }
    
    // Search for keyword matches in taxonomy
    for (const [key, category] of Object.entries(THEME_TAXONOMY)) {
        const name = category.name;
        
        for (const keyword of category.keywords) {
            if (lowerText.includes(keyword)) {
                // Classify as emotion or theme based on category
                if (['anxiety', 'fear', 'grief', 'loneliness', 'depression', 'shame', 'anger',
                     'hope', 'joy', 'love', 'healing', 'forgiveness', 'strength', 'faith'].includes(name)) {
                    if (!seenEmotions.has(name)) {
                        emotions.push(name);
                        seenEmotions.add(name);
                    }
                } else {
                    if (!seenThemes.has(name)) {
                        themes.push(name);
                        seenThemes.add(name);
                    }
                }
                break; // Don't add same emotion/theme multiple times
            }
        }
    }
    
    // Fallback: if no emotions detected but has sadness markers, suggest comfort/hope themes
    if (emotions.length === 0 && (lowerText.includes('weep') || lowerText.includes('tears') || lowerText.includes('sorrow'))) {
        if (!seenEmotions.has('grief')) emotions.push('grief');
        if (!seenThemes.has('comfort')) themes.push('comfort');
    }
    
    return { themes: themes.slice(0, 5), emotions: emotions.slice(0, 5) };
}

/**
 * Generate a normalized search text for a verse
 * Combines reference + text + themes + emotions + keywords for better search
 */
export function generateSearchText(
    reference: string,
    text: string,
    themes: string[] = [],
    emotions: string[] = [],
    keywords: string[] = []
): string {
    // Normalize text
    const normalizedText = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .join(' ');
    
    const parts = [
        reference,
        text,
        themes.join(' '),
        emotions.join(' '),
        keywords.join(' ')
    ];
    
    return parts
        .filter(p => p && p.trim().length > 0)
        .join(' ')
        .trim();
}

/**
 * Generate normalized text (lowercase, minimal punctuation)
 */
export function generateNormalizedText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .join(' ')
        .trim();
}

/**
 * Enrich a verse with themes, emotions, keywords, and searchText
 * This is called during backfill or when creating new verses
 */
export interface VerseEnrichment {
    themes: string[];
    emotions: string[];
    keywords: string[];
    searchText: string;
    normalizedText: string;
}

export function enrichVerse(
    verseData: {
        reference: string;
        text: string;
        bookName?: string;
    }
): VerseEnrichment {
    const { reference, text, bookName } = verseData;
    
    const { themes, emotions } = detectThemesAndEmotions(text, bookName);
    const keywords = extractKeywords(text);
    const normalizedText = generateNormalizedText(text);
    const searchText = generateSearchText(reference, text, themes, emotions, keywords);
    
    return {
        themes,
        emotions,
        keywords,
        searchText,
        normalizedText
    };
}

/**
 * Batch enrich verses (for backfill operations)
 * Input: array of verse objects with reference, text, bookName
 * Output: array of enrichment data
 */
export function batchEnrichVerses(
    verses: Array<{
        reference: string;
        text: string;
        bookName?: string;
    }>
): VerseEnrichment[] {
    return verses.map(v => enrichVerse(v));
}
