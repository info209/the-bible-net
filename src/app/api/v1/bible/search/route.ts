import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Verse, BibleVersion, Book } from '@/models/Bible';
import { BIBLE_BOOKS } from '@/utils/bibleBooks';
import { resolveBook } from '@/utils/bibleBooksServer';
import { getEmbeddingProvider } from '@/lib/search/embeddingProvider';
import { getReranker } from '@/lib/search/reranker';
import { createBibleSearchService } from '@/lib/search/bibleSearchService';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Static chapter-count map (mirrors BibleReaderPageContainer — no DB call)
// ---------------------------------------------------------------------------
const BOOK_CHAPTERS: Record<string, number> = {
    'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
    'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
    '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
    'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
    'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52,
    'Lamentations': 5, 'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3,
    'Amos': 9, 'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
    'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
    'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
    'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6,
    'Ephesians': 6, 'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5,
    '2 Thessalonians': 3, '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3,
    'Philemon': 1, 'Hebrews': 13, 'James': 5, '1 Peter': 5, '2 Peter': 3,
    '1 John': 5, '2 John': 1, '3 John': 1, 'Jude': 1, 'Revelation': 22,
};

// Known emotion / theme vocabulary — expanded to match real emotion tags in DB
const EMOTION_VOCABULARY = new Set([
    'joy', 'peace', 'hope', 'faith', 'fear', 'anxiety', 'depression', 'loneliness',
    'love', 'anger', 'grief', 'sorrow', 'comfort', 'strength', 'courage', 'trust',
    'forgiveness', 'gratitude', 'praise', 'worship', 'patience', 'wisdom', 'humility',
    'guilt', 'shame', 'healing', 'rest', 'refuge', 'protection', 'salvation',
    'doubt', 'suffering', 'perseverance', 'grace', 'mercy', 'righteousness', 'holiness',
]);

// ---------------------------------------------------------------------------
// Intent detection helpers
// ---------------------------------------------------------------------------

interface ParsedReference {
    isValid: boolean;
    error?: string;
    book?: string;
    chapter?: number;
    startVerse?: number;
    endVerse?: number;
    isRange?: boolean;
}

/**
 * Returns the matched BIBLE_BOOKS entry if the query is a book prefix/name/abbreviation.
 * Returns null otherwise.
 */
async function detectBook(query: string): Promise<typeof BIBLE_BOOKS[0] | null> {
    return await resolveBook(query);
}

/**
 * Parses queries containing a colon to detect single verse or verse range searches.
 */
async function parseBibleReference(query: string): Promise<ParsedReference | null> {
    const q = query.trim();

    if (!q.includes(':')) {
        return null;
    }

    const match = q.match(/^(.+?)\s+(\d+)\s*:\s*(.*)$/);
    if (!match) {
        return { isValid: false, error: 'Please enter a valid Bible reference.' };
    }

    const bookStr = match[1].trim();
    const chapterStr = match[2];
    const versePart = match[3].trim();

    const bookEntry = await detectBook(bookStr);
    if (!bookEntry) {
        return { isValid: false, error: 'Book not found.' };
    }

    const chapter = parseInt(chapterStr, 10);
    if (isNaN(chapter) || chapter <= 0) {
        return { isValid: false, error: 'Please enter a valid Bible reference.' };
    }

    const totalChapters = BOOK_CHAPTERS[bookEntry.name] ?? 0;
    if (chapter > totalChapters) {
        return { isValid: false, error: 'Chapter not found.' };
    }

    // Range: e.g. "1-6"
    const rangeMatch = versePart.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
        const startVerse = parseInt(rangeMatch[1], 10);
        const endVerse = parseInt(rangeMatch[2], 10);

        if (isNaN(startVerse) || isNaN(endVerse) || startVerse <= 0 || endVerse <= 0) {
            return { isValid: false, error: 'Please enter a valid Bible reference.' };
        }

        if (endVerse < startVerse) {
            return { isValid: false, error: 'Invalid verse range.\nPlease enter a valid range.' };
        }

        return {
            isValid: true,
            book: bookEntry.name,
            chapter,
            startVerse,
            endVerse,
            isRange: true
        };
    }

    // Single: e.g. "4"
    const singleMatch = versePart.match(/^(\d+)$/);
    if (singleMatch) {
        const verse = parseInt(singleMatch[1], 10);
        if (isNaN(verse) || verse <= 0) {
            return { isValid: false, error: 'Please enter a valid Bible reference.' };
        }

        return {
            isValid: true,
            book: bookEntry.name,
            chapter,
            startVerse: verse,
            endVerse: verse,
            isRange: false
        };
    }

    return { isValid: false, error: 'Please enter a valid Bible reference.' };
}

const LOCALIZED_EMOTIONS: Record<string, string> = {
    // English
    'joy': 'joy', 'peace': 'peace', 'hope': 'hope', 'faith': 'faith', 'fear': 'fear', 'anxiety': 'anxiety', 'depression': 'depression',
    'loneliness': 'loneliness', 'love': 'love', 'anger': 'anger', 'grief': 'grief', 'sorrow': 'grief', 'comfort': 'peace',
    'strength': 'strength', 'courage': 'strength', 'trust': 'faith', 'forgiveness': 'forgiveness', 'healing': 'healing',
    'protection': 'protection', 'refuge': 'protection', 'salvation': 'salvation',
    // Hindi
    'भय': 'fear', 'डर': 'fear', 'आतंक': 'fear',
    'चिंता': 'anxiety', 'चिन्ता': 'anxiety', 'व्याकुलता': 'anxiety',
    'शोक': 'grief', 'दुख': 'grief',
    'अकेलापन': 'loneliness',
    'निराशा': 'depression',
    'लज्जा': 'shame',
    'क्रोध': 'anger', 'गुस्सा': 'anger',
    'आशा': 'hope', 'उम्मीद': 'hope',
    'शांति': 'peace', 'शान्ति': 'peace',
    'आनन्द': 'joy', 'आनंद': 'joy',
    'प्रेम': 'love', 'प्यार': 'love',
    'चंगाई': 'healing',
    'क्षमा': 'forgiveness',
    'बल': 'strength', 'शक्ति': 'strength',
    'विश्वास': 'faith',
    'मार्गदर्शन': 'guidance',
    'रक्षा': 'protection', 'शरण': 'protection',
    'उद्धार': 'salvation',
    // Telugu
    'భయం': 'fear', 'దిగులు': 'fear',
    'ఆందోళన': 'anxiety', 'చింత': 'anxiety',
    'దుఃఖము': 'grief', 'దుఖము': 'grief', 'కన్నీరు': 'grief',
    'ఒంటరి': 'loneliness',
    'నిరాశ': 'depression',
    'సిగ్గు': 'shame',
    'కోపము': 'anger', 'ఉగ్రత': 'anger',
    'నిరీక్షణ': 'hope', 'ఆశ': 'hope',
    'శాంతి': 'peace', 'నెమ్మది': 'peace', 'సమాధానము': 'peace',
    'ఆనందం': 'joy', 'ఆనందము': 'joy', 'సంతోషము': 'joy', 'సంతోషం': 'joy',
    'ప్రేమ': 'love',
    'స్వస్థత': 'healing',
    'క్షమాపణ': 'forgiveness',
    'బలము': 'strength', 'శక్తి': 'strength',
    'విశ్వాసము': 'faith', 'విశ్వాసం': 'faith',
    'నడిపింపు': 'guidance',
    'ఆశ్రయము': 'protection', 'రక్షణ': 'protection',
    'విమోచన': 'salvation'
};

/**
 * Returns canonical emotion when the query is a known localized emotion / theme keyword.
 */
function detectEmotion(query: string): string | null {
    const q = query.trim().toLowerCase();
    return LOCALIZED_EMOTIONS[q] || null;
}

// ---------------------------------------------------------------------------
// Search handlers
// ---------------------------------------------------------------------------

async function bookSearch(bookEntry: typeof BIBLE_BOOKS[0]) {
    const totalChapters = BOOK_CHAPTERS[bookEntry.name] ?? 1;
    const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
    return NextResponse.json({
        success: true,
        data: {
            mode: 'book',
            book: bookEntry.name,
            abbreviation: bookEntry.abbreviation,
            testament: bookEntry.testament,
            totalChapters,
            chapters,
        },
    });
}

async function exactVerseSearch(
    bookName: string,
    chapter: number,
    startVerse: number,
    endVerse: number,
    versionCode?: string,
) {
    // 1. Check max verse in the chapter for validation
    const maxVerseDoc = await Verse.findOne({
        bookName,
        chapterNumber: chapter,
    })
    .sort({ number: -1 })
    .select('number')
    .lean() as any;

    if (!maxVerseDoc) {
        return NextResponse.json(
            { success: false, error: `Chapter not found.` },
            { status: 404 },
        );
    }

    const maxVerse = maxVerseDoc.number;

    if (startVerse > maxVerse) {
        return NextResponse.json(
            { success: false, error: `Verse not found: ${bookName} ${chapter}:${startVerse}` },
            { status: 404 },
        );
    }

    if (endVerse - startVerse + 1 > 100) {
        if (endVerse > maxVerse && maxVerse <= 100) {
            return NextResponse.json(
                { success: false, error: `Verse range exceeds available verses in this chapter.` },
                { status: 400 },
            );
        }
        return NextResponse.json(
            { success: false, error: `Please narrow your verse range.` },
            { status: 400 },
        );
    }

    if (endVerse > maxVerse) {
        return NextResponse.json(
            { success: false, error: `Verse range exceeds available verses in this chapter.` },
            { status: 400 },
        );
    }

    // 2. Fetch all verses in the range across all versions
    const queryFilter = {
        bookName,
        chapterNumber: chapter,
        number: { $gte: startVerse, $lte: endVerse },
    };

    const allVerses = await Verse.find(queryFilter)
        .select('number text versionCode themes emotions')
        .lean() as any[];

    // Group by version code
    const versesByVersion = new Map<string, typeof allVerses>();
    for (const v of allVerses) {
        if (!v.versionCode) continue;
        const code = v.versionCode.toUpperCase();
        if (!versesByVersion.has(code)) {
            versesByVersion.set(code, []);
        }
        versesByVersion.get(code)!.push(v);
    }

    // 3. Resolve target version code
    let targetCode = (versionCode || '').toUpperCase();
    if (!targetCode || !versesByVersion.has(targetCode)) {
        const availableCodes = Array.from(versesByVersion.keys());
        if (availableCodes.length === 0) {
            return NextResponse.json(
                { success: false, error: `Verse not found` },
                { status: 404 },
            );
        }
        targetCode = availableCodes[0];
    }

    // 4. Compile and format text for each available version
    const versionMap = new Map<string, { versionCode: string; text: string }>();
    for (const [code, verses] of versesByVersion.entries()) {
        verses.sort((a, b) => a.number - b.number);
        let text = '';
        if (startVerse === endVerse) {
            text = verses[0].text;
        } else {
            text = verses.map(v => `${v.number}. ${v.text}`).join('\n');
        }
        versionMap.set(code, { versionCode: code, text });
    }

    const targetVerses = versesByVersion.get(targetCode)!;
    const compiledText = versionMap.get(targetCode)!.text;

    // Collect and merge themes and emotions from target range
    const themes = Array.from(new Set(targetVerses.flatMap(v => v.themes || [])));
    const emotions = Array.from(new Set(targetVerses.flatMap(v => v.emotions || [])));

    const reference = startVerse === endVerse
        ? `${bookName} ${chapter}:${startVerse}`
        : `${bookName} ${chapter}:${startVerse}-${endVerse}`;

    return NextResponse.json({
        success: true,
        data: {
            mode: 'exact',
            reference,
            book: bookName,
            chapter,
            verse: startVerse,
            text: compiledText,
            versionCode: targetCode,
            themes,
            emotions,
            availableVersions: Array.from(versionMap.values()),
        },
    });
}

async function emotionSearch(emotion: string, limit: number, versionCode?: string) {
    const queryFilter: any = { emotions: { $in: [emotion] } };
    const verses = await Verse.find(queryFilter)
        .select('_id reference text versionCode bookName chapterNumber number emotions themes')
        .limit(limit)
        .lean() as any[];

    if (versionCode) {
        const upperCode = versionCode.toUpperCase();
        verses.sort((a, b) => {
            const aMatch = (a.versionCode || '').toUpperCase() === upperCode ? 1 : 0;
            const bMatch = (b.versionCode || '').toUpperCase() === upperCode ? 1 : 0;
            return bMatch - aMatch;
        });
    }

    const results = verses.slice(0, limit).map((v: any) => ({
        verseId: v._id.toString(),
        reference: v.reference || `${v.bookName} ${v.chapterNumber}:${v.number}`,
        text: v.text,
        versionCode: v.versionCode,
        emotions: v.emotions || [],
        themes: v.themes || [],
    }));

    return NextResponse.json({
        success: true,
        data: {
            mode: 'emotion',
            emotion,
            total: results.length,
            results,
        },
    });
}

/**
 * @swagger
 * /api/v1/bible/search:
 *   get:
 *     summary: Unified Bible search — auto-detects intent
 *     description: |
 *       Detects search intent and dispatches to the appropriate handler.
 *       Priority: (1) Exact verse reference, (2) Book name/prefix, (3) Emotion keyword, (4) Hybrid full-text.
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string, minLength: 2 }
 *         description: Search query
 *       - in: query
 *         name: versionCode
 *         required: false
 *         schema: { type: string }
 *         description: Bible version abbreviation (e.g., KJV, NIV, NKJV)
 *       - in: query
 *         name: versionId
 *         required: false
 *         schema: { type: string }
 *         description: Bible version MongoDB ID (for hybrid/legacy mode)
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *     responses:
 *       200:
 *         description: Search results (shape varies by detected mode)
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const versionCodeParam = searchParams.get('versionCode') ?? searchParams.get('versionId') ?? undefined;
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

        if (!q || q.trim().length < 2) {
            return NextResponse.json(
                { success: false, error: 'Query must be at least 2 characters' },
                { status: 400 },
            );
        }

        const query = q.trim();

        // -----------------------------------------------------------------------
        // Pre-resolve target version code to support localized lookups
        // -----------------------------------------------------------------------
        let resolvedVersionCode: string | undefined = undefined;
        if (versionCodeParam) {
            if (versionCodeParam.match(/^[0-9a-fA-F]{24}$/)) {
                const versionDoc = await BibleVersion.findById(versionCodeParam).select('abbreviation');
                if (versionDoc) resolvedVersionCode = versionDoc.abbreviation;
            } else {
                resolvedVersionCode = versionCodeParam.toUpperCase();
            }
        }

        // -----------------------------------------------------------------------
        // Priority 1: Bible reference search — "John 3:16", "Genesis 23:1-6", etc.
        // -----------------------------------------------------------------------
        const parsedRef = await parseBibleReference(query);
        if (parsedRef) {
            if (!parsedRef.isValid) {
                return NextResponse.json(
                    { success: false, error: parsedRef.error },
                    { status: parsedRef.error?.includes('not found') ? 404 : 400 }
                );
            }
            return exactVerseSearch(
                parsedRef.book!,
                parsedRef.chapter!,
                parsedRef.startVerse!,
                parsedRef.endVerse!,
                resolvedVersionCode
            );
        }

        // -----------------------------------------------------------------------
        // Priority 2: Book name / prefix — "psa", "psalm", "gen", "genesis"
        // -----------------------------------------------------------------------
        // Handle "Psalm 23" (book + chapter, no verse) → book mode, chip 23 pre-selected
        const bookChapterRe = /^(.+?)\s+(\d+)$/i;
        const bookChapterMatch = query.match(bookChapterRe);
        if (bookChapterMatch) {
            const [, bookStr, chapterStr] = bookChapterMatch;
            const bookEntry = await detectBook(bookStr.trim());
            if (bookEntry) {
                const focusChapter = parseInt(chapterStr, 10);
                const totalChapters = BOOK_CHAPTERS[bookEntry.name] ?? 1;
                const chapters = Array.from({ length: totalChapters }, (_, i) => i + 1);
                return NextResponse.json({
                    success: true,
                    data: {
                        mode: 'book',
                        book: bookEntry.name,
                        abbreviation: bookEntry.abbreviation,
                        testament: bookEntry.testament,
                        totalChapters,
                        chapters,
                        focusChapter, // UI should scroll chapter chip into view
                    },
                });
            }
        }

        const bookEntry = await detectBook(query);
        if (bookEntry) {
            return bookSearch(bookEntry);
        }

        // -----------------------------------------------------------------------
        // Priority 3: Emotion / theme keyword
        // -----------------------------------------------------------------------
        const matchedEmotion = detectEmotion(query);
        if (matchedEmotion) {
            return emotionSearch(matchedEmotion, limit, resolvedVersionCode);
        }

        // -----------------------------------------------------------------------
        // Priority 4: Hybrid full-text search (existing pipeline)
        // -----------------------------------------------------------------------
        const embeddingProvider = getEmbeddingProvider();
        const rerankerService = getReranker();
        const searchService = createBibleSearchService(embeddingProvider, rerankerService);

        const searchResponse = await searchService.search(query, {
            limit,
            versionCode: resolvedVersionCode,
        });

        if (searchResponse.success) {
            const results = searchResponse.results.map((r: any) => ({
                verseId: r.verseId,
                number: r.verse,
                text: r.text,
                book: {
                    id: r.book.name,
                    name: r.book.name,
                    abbreviation: r.book.abbreviation,
                },
                chapter: {
                    id: `${r.book.name}-${r.chapter}`,
                    number: r.chapter,
                },
                version: {
                    id: r.version.code,
                    abbreviation: r.version.code,
                    name: r.version.name,
                },
                themes: r.themes,
                emotions: r.emotions,
                score: r.score,
            }));

            return NextResponse.json({
                success: true,
                data: {
                    mode: 'hybrid',
                    results,
                    total: results.length,
                    query,
                    processingTimeMs: searchResponse.processingTimeMs,
                },
            });
        }

        // Fallback: empty
        return NextResponse.json({
            success: true,
            data: { mode: 'hybrid', results: [], total: 0, query },
        });

    } catch (error: any) {
        console.error('Bible search error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Search failed' },
            { status: 500 },
        );
    }
}
