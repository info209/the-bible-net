/**
 * ============================================================
 *  Bible Data Import Pipeline
 *  Production-ready | Idempotent | Bulk-optimized
 * ============================================================
 *
 *  Usage:
 *    npm run import:bible               # Import all versions
 *    npm run import:bible -- --version KJV  # Import one version
 *    npm run import:bible -- --dry-run  # Parse files without writing to DB
 *
 *  Reads JSON files from:  assets/<lang-dir>/<version>.json
 *
 *  Supported JSON Formats:
 *    Format A (flat):   { metadata: {...}, verses: [{book_name, book, chapter, verse, text}] }
 *    Format B (nested): { version, versionName, meta: {...}, books: { bookName: chapters[][][] } }
 * ============================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables BEFORE importing db
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ============================================================
// CONFIGURATION
// ============================================================

const ASSETS_DIR = path.join(process.cwd(), 'assets');
const LOG_FILE = path.join(process.cwd(), 'import-output.log');
const BATCH_SIZE = 500; // Verse insertMany chunk size

// ============================================================
// TYPES
// ============================================================

interface RawVerse {
    book_name: string;
    book: number;
    chapter: number;
    verse: number;
    text: string;
}

interface RawMetadata {
    name?: string;
    shortname?: string;
    module?: string;
    lang?: string | null;
    lang_short?: string | null;
    copyright_statement?: string;
    year?: string | number;
    [key: string]: unknown;
}

/** Normalized, validated representation ready for DB import */
interface NormalizedBible {
    name: string;
    abbreviation: string; // Guaranteed to match ^[A-Z0-9]{1,10}$
    language: string;     // Guaranteed to match ^[a-z]{2,3}$
    copyright: string;
    verses: RawVerse[];
    sourceFile: string;
}

/** Format B: nested books structure */
interface BibleJSONFormat {
    version: string;
    versionName?: string;
    meta: {
        description?: string;
        language?: string;
        license?: string;
        copyright?: string;
        swordVersionDate?: string;
        [key: string]: unknown;
    };
    books: Record<string, unknown[][][]>;
}

// ============================================================
// LOGGER
// ============================================================

class Logger {
    private stream: fs.WriteStream;
    private counts = { info: 0, warn: 0, error: 0 };

    constructor(logPath: string) {
        // Append to existing log (don't overwrite)
        this.stream = fs.createWriteStream(logPath, { flags: 'a' });
        const separator = '='.repeat(60);
        const header = `\n${separator}\n  Import Run: ${new Date().toISOString()}\n${separator}\n`;
        this.stream.write(header);
        process.stdout.write(header);
    }

    private write(level: string, message: string): void {
        const ts = new Date().toISOString();
        const line = `[${ts}] [${level.padEnd(5)}] ${message}\n`;
        process.stdout.write(line);
        this.stream.write(line);
    }

    info(msg: string): void  { this.counts.info++;  this.write('INFO',  msg); }
    warn(msg: string): void  { this.counts.warn++;  this.write('WARN',  msg); }
    error(msg: string): void { this.counts.error++; this.write('ERROR', msg); }
    progress(msg: string): void { this.write('PROG',  msg); }

    summary(): void {
        this.write('INFO', `Session totals — INFO: ${this.counts.info}, WARN: ${this.counts.warn}, ERROR: ${this.counts.error}`);
    }

    close(): void { this.stream.end(); }
}

// ============================================================
// SANITIZATION HELPERS
// ============================================================

/**
 * Converts any string to a valid BibleVersion abbreviation.
 * Schema rule: ^[A-Z0-9]+$, maxlength 10
 *
 * Examples:
 *   "తెలుగు IRV"  → "IRV"
 *   "te_irv"      → "TEIRV"
 *   "KJV"         → "KJV"
 */
function sanitizeAbbreviation(raw: string): string {
    if (!raw || typeof raw !== 'string') {
        throw new Error('Abbreviation source is null or non-string');
    }

    // Step 1: Strip leading unicode script if mixed (e.g., "తెలుగు IRV" → " IRV")
    const asciiOnly = raw.replace(/[^\x00-\x7F]/g, '');

    // Step 2: Keep only alphanumeric, uppercase
    const cleaned = (asciiOnly.length > 0 ? asciiOnly : raw)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    if (cleaned.length === 0) {
        throw new Error(`Cannot produce a valid abbreviation from: "${raw}"`);
    }

    return cleaned.substring(0, 10);
}

/**
 * Returns a valid ISO 639-1 or 639-3 language code (2–3 lowercase letters).
 * Falls back to inferring from directory name prefix (e.g. "HI-हिन्दी" → "hi").
 */
function extractLanguageCode(metadata: RawMetadata, dirName: string): string {
    const candidates = [
        metadata.lang_short,
        metadata.lang,
        dirName.split('-')[0].toLowerCase().trim(),
    ];

    for (const candidate of candidates) {
        if (candidate && /^[a-z]{2,3}$/.test(candidate.trim())) {
            return candidate.trim();
        }
    }

    return 'en'; // Default to English as safe fallback
}

/**
 * Strips HTML tags from a string (used to clean copyright_statement fields).
 */
function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Cleans verse text: removes paragraph markers (¶), excess whitespace.
 */
function cleanVerseText(text: string): string {
    return text
        .replace(/\u00b6/g, '')  // paragraph marker ¶
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// FORMAT NORMALIZER
// ============================================================

/**
 * Auto-detects the JSON format and normalizes it into NormalizedBible.
 * Throws a descriptive error if the format is unrecognized.
 */
function normalizeJSON(
    raw: Record<string, unknown>,
    dirName: string,
    sourceFile: string
): NormalizedBible {

    // ── Format A: { metadata: {...}, verses: [...] } ──────────────────────
    if (raw.metadata && Array.isArray(raw.verses)) {
        const meta = raw.metadata as RawMetadata;
        const verses = raw.verses as RawVerse[];

        if (verses.length === 0) {
            throw new Error('Verses array is empty');
        }

        // Build abbreviation: prefer module (e.g. "te_irv" → "TEIRV") then shortname.
        // The module field is lowercase-ASCII and globally unique per file;
        // shortname may be localized (e.g. "తెలుగు IRV") or clash across languages.
        const abbreviationSource = (meta.module || meta.shortname || '').trim();
        const abbreviation = sanitizeAbbreviation(abbreviationSource);
        const language = extractLanguageCode(meta, dirName);

        let name = (typeof meta.name === 'string' && meta.name.trim())
            ? meta.name.trim()
            : abbreviation;

        // Enforce 100-char schema limit on name
        name = name.substring(0, 100);

        let copyright = '';
        if (typeof meta.copyright_statement === 'string') {
            copyright = stripHtml(meta.copyright_statement).substring(0, 500);
        } else if (meta.year) {
            copyright = `Copyright ${meta.year}`;
        }

        return { name, abbreviation, language, copyright, verses, sourceFile };
    }

    // ── Format B: { version, versionName, meta: {...}, books: {...} } ─────
    if (raw.version && raw.books && typeof raw.books === 'object') {
        return convertNestedFormat(raw as unknown as BibleJSONFormat, dirName, sourceFile);
    }

    throw new Error(
        `Unrecognized JSON structure. Expected keys "metadata"+"verses" or "version"+"books". Found: [${Object.keys(raw).join(', ')}]`
    );
}

/** Converts Format B (nested books) into flat NormalizedBible */
function convertNestedFormat(
    data: BibleJSONFormat,
    dirName: string,
    sourceFile: string
): NormalizedBible {
    const verses: RawVerse[] = [];
    const bookNames = Object.keys(data.books);

    for (let bookIndex = 0; bookIndex < bookNames.length; bookIndex++) {
        const bookName = bookNames[bookIndex];
        const chapters = data.books[bookName];

        if (!Array.isArray(chapters)) continue;

        for (let chapIndex = 0; chapIndex < chapters.length; chapIndex++) {
            const chapter = chapters[chapIndex];
            if (!Array.isArray(chapter)) continue;

            for (let verseIndex = 0; verseIndex < chapter.length; verseIndex++) {
                const verseWords = chapter[verseIndex];
                if (!Array.isArray(verseWords)) continue;

                // Each word entry is [word, strongs?] or [word]
                const text = (verseWords as unknown[])
                    .filter(Array.isArray)
                    .map((w: unknown) => (Array.isArray(w) && typeof w[0] === 'string' ? w[0] : ''))
                    .join(' ')
                    .trim();

                verses.push({
                    book_name: bookName,
                    book: bookIndex + 1,
                    chapter: chapIndex + 1,
                    verse: verseIndex + 1,
                    text,
                });
            }
        }
    }

    const languageSource = data.meta?.language
        ? { lang_short: data.meta.language, lang: data.meta.language }
        : {};

    return {
        name: (data.versionName || data.version).substring(0, 100),
        abbreviation: sanitizeAbbreviation(data.version),
        language: extractLanguageCode(languageSource as RawMetadata, dirName),
        copyright: (data.meta?.copyright || data.meta?.license || '').substring(0, 500),
        verses,
        sourceFile,
    };
}

// ============================================================
// IMPORTER — Core DB Logic
// ============================================================

type MongoModel = any; // Avoids circular import types in a standalone script

async function importBibleVersion(
    bible: NormalizedBible,
    models: { BibleVersion: MongoModel; Book: MongoModel; Chapter: MongoModel; Verse: MongoModel },
    getBookDetails: (order: number) => { name: string; abbreviation: string; testament: string } | undefined,
    logger: Logger,
    dryRun: boolean = false
): Promise<{ books: number; chapters: number; verses: number }> {

    const { BibleVersion, Book, Chapter, Verse } = models;

    logger.info(`┌─ Version: "${bible.name}" [${bible.abbreviation}] lang=${bible.language}`);
    logger.info(`│  Source : ${bible.sourceFile}`);
    logger.info(`│  Verses : ${bible.verses.length.toLocaleString()}`);

    if (dryRun) {
        logger.info('└─ DRY RUN — skipping database writes');
        return { books: 0, chapters: 0, verses: bible.verses.length };
    }

    // ── 1. Upsert BibleVersion, mark as 'importing' ──────────────────────
    const versionDoc = await BibleVersion.findOneAndUpdate(
        { abbreviation: bible.abbreviation },
        {
            $set: {
                name: bible.name,
                abbreviation: bible.abbreviation,
                language: bible.language,
                copyright: bible.copyright,
                status: 'importing',
                importProgress: 0,
                isActive: false,
            },
        },
        { upsert: true, returnDocument: 'after' }
    );
    const versionId = versionDoc._id;

    // ── 2. Group verses by book → chapter → sorted verses ────────────────
    const booksMap = new Map<number, Map<number, RawVerse[]>>();
    let skippedVerses = 0;

    for (const v of bible.verses) {
        // Validate required numeric fields
        const bookNum  = Number(v.book);
        const chapNum  = Number(v.chapter);
        const verseNum = Number(v.verse);

        if (!bookNum || !chapNum || !verseNum || bookNum < 1 || chapNum < 1 || verseNum < 1) {
            skippedVerses++;
            continue;
        }

        if (!booksMap.has(bookNum)) booksMap.set(bookNum, new Map());
        const chapMap = booksMap.get(bookNum)!;
        if (!chapMap.has(chapNum)) chapMap.set(chapNum, []);
        chapMap.get(chapNum)!.push(v);
    }

    if (skippedVerses > 0) {
        logger.warn(`│  Skipped ${skippedVerses} verse(s) with invalid/missing fields`);
    }

    const bookNumbers = Array.from(booksMap.keys()).sort((a, b) => a - b);
    const totalBooks = bookNumbers.length;
    let importedBooks = 0, importedChapters = 0, importedVerses = 0;

    // ── 3. Process each book ──────────────────────────────────────────────
    for (const bookNum of bookNumbers) {
        const chapMap = booksMap.get(bookNum)!;
        const chapterNumbers = Array.from(chapMap.keys()).sort((a, b) => a - b);

        // Resolve localized name + canonical info
        const firstChapVerses = chapMap.get(chapterNumbers[0])!;
        const localizedName = (firstChapVerses[0]?.book_name?.trim() || '').substring(0, 50)
            || `Book ${bookNum}`;

        const canonicalInfo = getBookDetails(bookNum);
        const testament: 'OT' | 'NT' = (canonicalInfo?.testament || (bookNum <= 39 ? 'OT' : 'NT')) as 'OT' | 'NT';

        // Build a safe abbreviation for books: prefer canonical, derive from local name
        let bookAbbr = (canonicalInfo?.abbreviation || localizedName.substring(0, 4))
            .replace(/[^A-Za-z0-9 ]/g, '')
            .replace(/\s+/g, '')
            .substring(0, 10)
            || `B${bookNum}`;

        // Upsert Book
        const bookDoc = await Book.findOneAndUpdate(
            { version: versionId, order: bookNum },
            {
                $set: {
                    name: localizedName,
                    abbreviation: bookAbbr,
                    testament,
                    version: versionId,
                    order: bookNum,
                },
            },
            { upsert: true, returnDocument: 'after' }
        );
        const bookId = bookDoc._id;

        // ── 4. Process each chapter ───────────────────────────────────────
        for (const chapNum of chapterNumbers) {
            const rawVerses = chapMap.get(chapNum)!;
            // Sort by verse number ascending
            rawVerses.sort((a, b) => Number(a.verse) - Number(b.verse));

            // Upsert Chapter
            const chapterDoc = await Chapter.findOneAndUpdate(
                { book: bookId, number: chapNum },
                { $set: { number: chapNum, book: bookId, version: versionId } },
                { upsert: true, returnDocument: 'after' }
            );
            const chapterId = chapterDoc._id;

            // Idempotency: remove any previously imported verses for this chapter
            await Verse.deleteMany({ chapter: chapterId });

            // Build verse documents (filter empty text)
            const verseDocs = rawVerses
                .map(v => ({
                    number: Number(v.verse),
                    text: cleanVerseText(v.text || ''),
                    chapter: chapterId,
                    book: bookId,
                    version: versionId,
                }))
                .filter(v => v.text.length > 0 && v.number >= 1);

            // Bulk insert in BATCH_SIZE chunks
            for (let i = 0; i < verseDocs.length; i += BATCH_SIZE) {
                await Verse.insertMany(verseDocs.slice(i, i + BATCH_SIZE), { ordered: false });
            }

            importedChapters++;
            importedVerses += verseDocs.length;
        }

        importedBooks++;
        const progress = Math.round((importedBooks / totalBooks) * 100);

        // Update progress in DB every book
        await BibleVersion.updateOne({ _id: versionId }, { $set: { importProgress: progress } });

        logger.progress(
            `│  [${progress.toString().padStart(3)}%] Book ${bookNum.toString().padStart(2)}/${totalBooks}: ` +
            `${localizedName.padEnd(25)} (${chapterNumbers.length} ch)`
        );
    }

    // ── 5. Mark version as active ─────────────────────────────────────────
    await BibleVersion.updateOne(
        { _id: versionId },
        { $set: { status: 'active', isActive: true, importProgress: 100 } }
    );

    logger.info(
        `└─ ✅ Complete: ${importedBooks} books | ${importedChapters} chapters | ${importedVerses.toLocaleString()} verses`
    );

    return { books: importedBooks, chapters: importedChapters, verses: importedVerses };
}

// ============================================================
// FILE DISCOVERY
// ============================================================

interface FileEntry {
    filePath: string;
    dirName: string;
    fileName: string;
}

function discoverBibleFiles(assetsDir: string): FileEntry[] {
    if (!fs.existsSync(assetsDir)) {
        throw new Error(`Assets directory not found: ${assetsDir}`);
    }

    const entries: FileEntry[] = [];
    const items = fs.readdirSync(assetsDir, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            const dirPath = path.join(assetsDir, item.name);
            const jsonFiles = fs.readdirSync(dirPath)
                .filter(f => f.toLowerCase().endsWith('.json'));

            for (const file of jsonFiles) {
                entries.push({
                    filePath: path.join(dirPath, file),
                    dirName: item.name,
                    fileName: file,
                });
            }
        } else if (item.isFile() && item.name.toLowerCase().endsWith('.json')) {
            entries.push({
                filePath: path.join(assetsDir, item.name),
                dirName: '',
                fileName: item.name,
            });
        }
    }

    return entries;
}

// ============================================================
// CLI ARGUMENT PARSER
// ============================================================

function parseArgs(): { versionFilter: string | null; dryRun: boolean } {
    const args = process.argv.slice(2);
    let versionFilter: string | null = null;
    let dryRun = false;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--version' && args[i + 1]) {
            versionFilter = args[++i].toUpperCase();
        }
        if (args[i] === '--dry-run') {
            dryRun = true;
        }
    }

    return { versionFilter, dryRun };
}

// ============================================================
// MAIN ENTRY POINT
// ============================================================

async function run(): Promise<void> {
    const { versionFilter, dryRun } = parseArgs();

    const logger = new Logger(LOG_FILE);

    if (dryRun) {
        logger.info('🔍 DRY RUN MODE — no data will be written to the database');
    }
    if (versionFilter) {
        logger.info(`🎯 Version filter: ${versionFilter}`);
    }

    // Dynamic imports ensure .env.local is loaded before DB connection
    const { connectDB }   = await import('../src/lib/db');
    const { BibleVersion, Book, Chapter, Verse } = await import('../src/models/Bible');
    const { getBookDetails } = await import('../src/utils/bibleBooks');

    const models = { BibleVersion, Book, Chapter, Verse };

    try {
        if (!dryRun) {
            logger.info('Connecting to MongoDB...');
            await connectDB();
            logger.info('✅ Connected to MongoDB');
        }

        // ── Discover files ────────────────────────────────────────────────
        logger.info(`\nScanning: ${ASSETS_DIR}`);
        let files = discoverBibleFiles(ASSETS_DIR);

        logger.info(`Found ${files.length} JSON file(s):`);
        for (const f of files) {
            logger.info(`  · ${path.relative(process.cwd(), f.filePath)}`);
        }

        // ── Apply version filter (match against file name or abbreviation) ─
        if (versionFilter) {
            files = files.filter(f =>
                f.fileName.toUpperCase().replace('.JSON', '') === versionFilter ||
                f.fileName.toUpperCase().includes(versionFilter)
            );
            if (files.length === 0) {
                logger.error(`No files matched version filter: "${versionFilter}"`);
                process.exit(1);
            }
            logger.info(`After filter: ${files.length} file(s) selected`);
        }

        // ── Process each file ─────────────────────────────────────────────
        let successCount = 0;
        let failCount    = 0;
        const globalStats = { books: 0, chapters: 0, verses: 0 };

        for (const { filePath, dirName, fileName } of files) {
            logger.info(`\n${'─'.repeat(60)}`);
            logger.info(`Processing: ${fileName}  (dir: ${dirName || 'root'})`);

            let bible: NormalizedBible;

            // ── Parse & Normalize ──────────────────────────────────────────
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const raw = JSON.parse(content) as Record<string, unknown>;
                bible = normalizeJSON(raw, dirName, path.relative(process.cwd(), filePath));

                logger.info(`Detected: Format A (flat verses) | ` +
                    `Abbrev: ${bible.abbreviation} | Lang: ${bible.language}`);
            } catch (parseErr: any) {
                logger.error(`Failed to parse ${fileName}: ${parseErr.message}`);
                failCount++;
                continue;
            }

            // ── Import ─────────────────────────────────────────────────────
            try {
                const stats = await importBibleVersion(bible, models, getBookDetails, logger, dryRun);
                globalStats.books    += stats.books;
                globalStats.chapters += stats.chapters;
                globalStats.verses   += stats.verses;
                successCount++;
            } catch (importErr: any) {
                logger.error(`Import failed for ${bible.name} [${bible.abbreviation}]: ${importErr.message}`);
                if (importErr.stack) {
                    logger.error(importErr.stack.split('\n').slice(1, 4).join(' | '));
                }

                // Mark version as failed in DB so the UI can reflect it
                if (!dryRun) {
                    try {
                        await BibleVersion.updateOne(
                            { abbreviation: bible.abbreviation },
                            { $set: { status: 'failed' } }
                        );
                    } catch (_) { /* ignore secondary error */ }
                }

                failCount++;
            }
        }

        // ── Final Summary ─────────────────────────────────────────────────
        logger.info(`\n${'═'.repeat(60)}`);
        logger.info('IMPORT SUMMARY');
        logger.info(`${'═'.repeat(60)}`);
        logger.info(`Versions processed : ${files.length}`);
        logger.info(`  ✅ Succeeded     : ${successCount}`);
        logger.info(`  ❌ Failed        : ${failCount}`);
        logger.info(`Total books        : ${globalStats.books.toLocaleString()}`);
        logger.info(`Total chapters     : ${globalStats.chapters.toLocaleString()}`);
        logger.info(`Total verses       : ${globalStats.verses.toLocaleString()}`);
        logger.info(`Log file           : ${LOG_FILE}`);
        logger.info(`${'═'.repeat(60)}`);

        logger.summary();
        logger.close();

        process.exit(failCount > 0 ? 1 : 0);

    } catch (fatalErr: any) {
        logger.error(`FATAL: ${fatalErr.message}`);
        if (fatalErr.stack) {
            logger.error(fatalErr.stack);
        }
        logger.close();
        process.exit(1);
    }
}

// ============================================================
// Execute
// ============================================================
run().catch(err => {
    console.error('Unhandled top-level error:', err);
    process.exit(1);
});
