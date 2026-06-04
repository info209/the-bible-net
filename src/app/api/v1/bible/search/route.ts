import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Verse, BibleVersion, Book } from '@/models/Bible';
import { BIBLE_BOOKS } from '@/utils/bibleBooks';
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

/** Matches "Book chapter:verse" or "Book chapter : verse" */
const EXACT_VERSE_RE = /^(.+?)\s+(\d+)\s*:\s*(\d+)$/i;

/**
 * Returns the matched BIBLE_BOOKS entry if the query is a book prefix/name/abbreviation.
 * Returns null otherwise.
 */
function detectBook(query: string): typeof BIBLE_BOOKS[0] | null {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;

    // Exact name or abbreviation match first
    for (const book of BIBLE_BOOKS) {
        if (book.name.toLowerCase() === q || book.abbreviation.toLowerCase() === q) {
            return book;
        }
    }
    // Prefix match on full name
    for (const book of BIBLE_BOOKS) {
        if (book.name.toLowerCase().startsWith(q)) {
            return book;
        }
    }
    // Prefix match on abbreviation
    for (const book of BIBLE_BOOKS) {
        if (book.abbreviation.toLowerCase().startsWith(q)) {
            return book;
        }
    }
    return null;
}

/**
 * Returns true when the query is a known emotion / theme keyword.
 */
function detectEmotion(query: string): boolean {
    return EMOTION_VOCABULARY.has(query.trim().toLowerCase());
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
    bookStr: string,
    chapter: number,
    verse: number,
    versionCode?: string,
) {
    // Find matching book entry
    const bookEntry = detectBook(bookStr) ?? BIBLE_BOOKS.find(
        b => b.name.toLowerCase().startsWith(bookStr.trim().toLowerCase())
    );
    if (!bookEntry) {
        return NextResponse.json(
            { success: false, error: `Unknown book: "${bookStr}"` },
            { status: 404 },
        );
    }

    // Build filter
    const filter: any = {
        bookName: bookEntry.name,
        chapterNumber: chapter,
        number: verse,
    };
    if (versionCode) {
        filter.versionCode = versionCode.toUpperCase();
    }

    const verseDoc = await Verse.findOne(filter)
        .select('_id reference text versionCode bookName chapterNumber number themes emotions')
        .lean() as any;

    if (!verseDoc) {
        return NextResponse.json(
            { success: false, error: `Verse not found: ${bookEntry.name} ${chapter}:${verse}` },
            { status: 404 },
        );
    }

    // Fetch alternate versions for the same reference
    const alternateFilter = {
        bookName: bookEntry.name,
        chapterNumber: chapter,
        number: verse,
    };
    const alternates = await Verse.find(alternateFilter)
        .select('_id versionCode text')
        .lean() as any[];

    // Unique versions (deduplicated by versionCode)
    const versionMap = new Map<string, { versionCode: string; text: string }>();
    for (const alt of alternates) {
        if (alt.versionCode && !versionMap.has(alt.versionCode)) {
            versionMap.set(alt.versionCode, { versionCode: alt.versionCode, text: alt.text });
        }
    }

    return NextResponse.json({
        success: true,
        data: {
            mode: 'exact',
            reference: verseDoc.reference || `${bookEntry.name} ${chapter}:${verse}`,
            book: bookEntry.name,
            chapter,
            verse,
            text: verseDoc.text,
            versionCode: verseDoc.versionCode,
            themes: verseDoc.themes || [],
            emotions: verseDoc.emotions || [],
            availableVersions: Array.from(versionMap.values()),
        },
    });
}

async function emotionSearch(emotion: string, limit: number) {
    const verses = await Verse.find({ emotions: { $in: [emotion] } })
        .select('_id reference text versionCode bookName chapterNumber number emotions themes')
        .limit(limit)
        .lean() as any[];

    const results = verses.map((v: any) => ({
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
        // Priority 1: Exact verse reference — "John 3:16", "Ps 23:1", etc.
        // -----------------------------------------------------------------------
        const exactMatch = query.match(EXACT_VERSE_RE);
        if (exactMatch) {
            const [, bookStr, chapterStr, verseStr] = exactMatch;
            const chapter = parseInt(chapterStr, 10);
            const verse = parseInt(verseStr, 10);

            // Confirm the book portion is recognisable before hitting the DB
            const bookCandidate = detectBook(bookStr.trim());
            if (bookCandidate) {
                return exactVerseSearch(bookStr.trim(), chapter, verse, versionCodeParam);
            }
        }

        // -----------------------------------------------------------------------
        // Priority 2: Book name / prefix — "psa", "psalm", "gen", "genesis"
        // -----------------------------------------------------------------------
        // Handle "Psalm 23" (book + chapter, no verse) → book mode, chip 23 pre-selected
        const bookChapterRe = /^(.+?)\s+(\d+)$/i;
        const bookChapterMatch = query.match(bookChapterRe);
        if (bookChapterMatch) {
            const [, bookStr, chapterStr] = bookChapterMatch;
            const bookEntry = detectBook(bookStr.trim());
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

        const bookEntry = detectBook(query);
        if (bookEntry) {
            return bookSearch(bookEntry);
        }

        // -----------------------------------------------------------------------
        // Priority 3: Emotion / theme keyword
        // -----------------------------------------------------------------------
        if (detectEmotion(query)) {
            return emotionSearch(query.toLowerCase(), limit);
        }

        // -----------------------------------------------------------------------
        // Priority 4: Hybrid full-text search (existing pipeline)
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
