import * as XLSX from 'xlsx';
import { isLeapYear, getTotalDaysInYear, getMissingDates } from '@/utils/calendarUtils';
import { Book, Chapter, Verse } from '@/models/Bible';
import { DailyContentRepository } from '@/repositories/dailyContentRepository';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VerseImportRow {
    row: number;
    date: string;
    book: string;
    chapter: number;
    verse: number;
    backgroundImage?: string;
}

export interface DevotionalImportRow {
    row: number;
    date: string;
    verseRef: string;
    title: string;
    body: string;
    backgroundImage?: string;
}

export interface ImportError {
    row: number;
    date?: string;
    reference?: string;
    reason: string;
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: ImportError[];
    failedRowsCsv?: string;
}

// ─── Utility Functions ────────────────────────────────────────────────────────

// Re-export for backward compatibility
export { isLeapYear, getTotalDaysInYear, getMissingDates } from '@/utils/calendarUtils';

function isValidDate(dateStr: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && dateStr === d.toISOString().split('T')[0];
}

function extractYear(dateStr: string): number {
    return parseInt(dateStr.substring(0, 4), 10);
}

function isFeb29(dateStr: string): boolean {
    return dateStr.endsWith('-02-29');
}

// ─── File Parsing ─────────────────────────────────────────────────────────────

export function parseFileBuffer(buffer: Buffer, filename: string): any[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows;
}

// Normalize header keys (case-insensitive, trim whitespace)
function normalizeRow(raw: any): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.keys(raw)) {
        result[key.toLowerCase().trim().replace(/\s+/g, '_')] = String(raw[key] ?? '').trim();
    }
    return result;
}

// ─── Verse Import ─────────────────────────────────────────────────────────────

export async function validateVerseRows(
    rawRows: any[]
): Promise<{ valid: VerseImportRow[]; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    const valid: VerseImportRow[] = [];

    // Track seen dates and verse refs within this file
    const seenDates = new Map<string, number>(); // date → row index
    const seenVerseRefs = new Map<string, number>(); // "book:chapter:verse:year" → row index

    // Pre-load existing DB data grouped by year (for uniqueness checks)
    const dbVerseRefsByYear = new Map<number, Set<string>>();
    const dbDatesByYear = new Map<number, Set<string>>();

    for (let i = 0; i < rawRows.length; i++) {
        const rowNum = i + 2; // 1-indexed + header row
        const raw = normalizeRow(rawRows[i]);

        const dateRaw = raw['date'] || raw['date_(yyyy-mm-dd)'] || '';
        const bookRaw = raw['book'] || raw['book_name'] || '';
        const chapterRaw = raw['chapter'] || raw['chapter_number'] || '';
        const verseRaw = raw['verse'] || raw['verse_number'] || '';
        const bgImage = raw['background'] || raw['background_image'] || raw['background_image_url'] || '';

        // 1. Date format
        if (!dateRaw) {
            errors.push({ row: rowNum, reason: 'Date is required' });
            continue;
        }

        let dateStr = dateRaw;
        // Handle Excel date serial number
        if (/^\d+$/.test(dateStr) && parseInt(dateStr) > 40000) {
            const excelDate = XLSX.SSF.parse_date_code(parseInt(dateStr));
            if (excelDate) {
                const y = excelDate.y;
                const m = String(excelDate.m).padStart(2, '0');
                const d = String(excelDate.d).padStart(2, '0');
                dateStr = `${y}-${m}-${d}`;
            }
        }

        if (!isValidDate(dateStr)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Invalid date format "${dateStr}". Use YYYY-MM-DD.` });
            continue;
        }

        const year = extractYear(dateStr);

        // 2. Leap year check for Feb 29
        if (isFeb29(dateStr) && !isLeapYear(year)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Feb 29 is not valid in ${year} (non-leap year)` });
            continue;
        }

        // 3. Duplicate dates within file
        if (seenDates.has(dateStr)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Duplicate date "${dateStr}" (already in this file at row ${seenDates.get(dateStr)})` });
            continue;
        }
        seenDates.set(dateStr, rowNum);

        // 4. Book validation
        if (!bookRaw) {
            errors.push({ row: rowNum, date: dateStr, reason: 'Book name is required' });
            continue;
        }

        const chapter = parseInt(chapterRaw, 10);
        const verse = parseInt(verseRaw, 10);

        if (isNaN(chapter) || chapter < 1) {
            errors.push({ row: rowNum, date: dateStr, reason: `Invalid chapter "${chapterRaw}"` });
            continue;
        }

        if (isNaN(verse) || verse < 1) {
            errors.push({ row: rowNum, date: dateStr, reason: `Invalid verse "${verseRaw}"` });
            continue;
        }

        // 5. Verify book exists in Bible DB (any version)
        const bookDoc = await Book.findOne({
            name: { $regex: new RegExp(`^${bookRaw.replace(/[-]/g, ' ')}$`, 'i') }
        }).lean();

        if (!bookDoc) {
            errors.push({ row: rowNum, date: dateStr, reference: `${bookRaw} ${chapter}:${verse}`, reason: `Book "${bookRaw}" not found in Bible database` });
            continue;
        }

        // 6. Verify chapter exists
        const chapterDoc = await Chapter.findOne({
            book: bookDoc._id,
            number: chapter,
        }).lean();

        if (!chapterDoc) {
            errors.push({ row: rowNum, date: dateStr, reference: `${bookDoc.name} ${chapter}:${verse}`, reason: `Chapter ${chapter} not found in ${bookDoc.name}` });
            continue;
        }

        // 7. Verify verse exists
        const verseDoc = await Verse.findOne({
            chapter: chapterDoc._id,
            number: verse,
        }).lean();

        if (!verseDoc) {
            errors.push({ row: rowNum, date: dateStr, reference: `${bookDoc.name} ${chapter}:${verse}`, reason: `Verse ${verse} not found in ${bookDoc.name} chapter ${chapter}` });
            continue;
        }

        // 8. Year uniqueness (within file)
        const verseKey = `${bookDoc.name.toLowerCase()}:${chapter}:${verse}:${year}`;
        if (seenVerseRefs.has(verseKey)) {
            errors.push({
                row: rowNum, date: dateStr,
                reference: `${bookDoc.name} ${chapter}:${verse}`,
                reason: `${bookDoc.name} ${chapter}:${verse} already assigned for year ${year} in this file (row ${seenVerseRefs.get(verseKey)})`
            });
            continue;
        }
        seenVerseRefs.set(verseKey, rowNum);

        // 9. Year uniqueness (against DB)
        if (!dbVerseRefsByYear.has(year)) {
            dbVerseRefsByYear.set(year, await DailyContentRepository.findExistingVerseRefsForYear(year));
        }
        const dbRefs = dbVerseRefsByYear.get(year)!;
        const dbKey = `${bookDoc.name.toLowerCase()}:${chapter}:${verse}`;
        if (dbRefs.has(dbKey)) {
            errors.push({
                row: rowNum, date: dateStr,
                reference: `${bookDoc.name} ${chapter}:${verse}`,
                reason: `${bookDoc.name} ${chapter}:${verse} already assigned for year ${year} in the database`
            });
            continue;
        }

        // 10. Date already in DB (skip, not error)
        if (!dbDatesByYear.has(year)) {
            dbDatesByYear.set(year, await DailyContentRepository.findExistingDatesForYear(year));
        }
        const dbDates = dbDatesByYear.get(year)!;
        if (dbDates.has(dateStr)) {
            errors.push({
                row: rowNum, date: dateStr,
                reason: `Date ${dateStr} already has a verse scheduled in the database`
            });
            continue;
        }

        valid.push({
            row: rowNum,
            date: dateStr,
            book: bookDoc.name,
            chapter,
            verse,
            backgroundImage: bgImage || undefined,
        });
    }

    return { valid, errors };
}

export async function importVerses(validRows: VerseImportRow[]): Promise<{ upserted: number; modified: number }> {
    const records = validRows.map(row => ({
        date: row.date,
        contentYear: extractYear(row.date),
        verseBook: row.book,
        verseChapter: row.chapter,
        verseNumber: row.verse,
        verseReference: `${row.book} ${row.chapter}:${row.verse}`,
        devotionalVerseRef: `${row.book} ${row.chapter}:${row.verse}`, // default same as verse
        backgroundImage: row.backgroundImage,
        isPublished: true,
    }));

    return DailyContentRepository.bulkUpsert(records as any);
}

// ─── Devotional Import ────────────────────────────────────────────────────────

export async function validateDevotionalRows(
    rawRows: any[]
): Promise<{ valid: DevotionalImportRow[]; errors: ImportError[] }> {
    const errors: ImportError[] = [];
    const valid: DevotionalImportRow[] = [];
    const seenDates = new Map<string, number>();

    for (let i = 0; i < rawRows.length; i++) {
        const rowNum = i + 2;
        const raw = normalizeRow(rawRows[i]);

        const dateRaw = raw['date'] || raw['date_(yyyy-mm-dd)'] || '';
        const verseRef = raw['verse'] || raw['verse_reference'] || raw['verse_ref'] || '';
        const title = raw['title'] || '';
        const body = raw['body'] || raw['content'] || '';
        const bgImage = raw['background'] || raw['background_image'] || raw['background_image_url'] || '';

        if (!dateRaw) {
            errors.push({ row: rowNum, reason: 'Date is required' });
            continue;
        }

        let dateStr = dateRaw;
        if (/^\d+$/.test(dateStr) && parseInt(dateStr) > 40000) {
            const excelDate = XLSX.SSF.parse_date_code(parseInt(dateStr));
            if (excelDate) {
                dateStr = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
            }
        }

        if (!isValidDate(dateStr)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Invalid date format "${dateStr}". Use YYYY-MM-DD.` });
            continue;
        }

        if (!title.trim()) {
            errors.push({ row: rowNum, date: dateStr, reason: 'Devotional title is required' });
            continue;
        }

        if (!body.trim()) {
            errors.push({ row: rowNum, date: dateStr, reason: 'Devotional body/content is required' });
            continue;
        }

        if (!verseRef.trim()) {
            errors.push({ row: rowNum, date: dateStr, reason: 'Devotional verse reference is required' });
            continue;
        }

        if (seenDates.has(dateStr)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Duplicate date "${dateStr}" in this file (row ${seenDates.get(dateStr)})` });
            continue;
        }
        seenDates.set(dateStr, rowNum);

        const year = extractYear(dateStr);
        if (isFeb29(dateStr) && !isLeapYear(year)) {
            errors.push({ row: rowNum, date: dateStr, reason: `Feb 29 is not valid in ${year} (non-leap year)` });
            continue;
        }

        valid.push({ row: rowNum, date: dateStr, verseRef, title, body, backgroundImage: bgImage || undefined });
    }

    return { valid, errors };
}

export async function importDevotionals(validRows: DevotionalImportRow[]): Promise<{ upserted: number; modified: number }> {
    const records = validRows.map(row => ({
        date: row.date,
        contentYear: extractYear(row.date),
        devotionalTitle: row.title,
        devotionalContent: row.body,
        devotionalVerseRef: row.verseRef,
        devotionalBackgroundImage: row.backgroundImage,
        // Provide defaults for required verse fields if not yet set
        verseBook: 'Unknown',
        verseChapter: 1,
        verseNumber: 1,
        verseReference: row.verseRef,
        isPublished: true,
    }));

    return DailyContentRepository.bulkUpsert(records as any);
}

// ─── Error CSV Generation ─────────────────────────────────────────────────────

export function generateFailedRowsCsv(errors: ImportError[]): string {
    const header = 'Row,Date,Reference,Reason';
    const rows = errors.map(e =>
        `${e.row},"${e.date || ''}","${e.reference || ''}","${e.reason.replace(/"/g, '""')}"`
    );
    return [header, ...rows].join('\n');
}

// getMissingDates is re-exported from calendarUtils above
