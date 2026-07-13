/**
 * verseReferenceParser.ts
 *
 * Isolated, fully-typed parser for Bible verse references used across:
 *  - Admin Add/Edit form
 *  - Bulk CSV/XLSX import
 *  - API validation (POST / PUT)
 *  - Service layer resolution
 *
 * Supported formats:
 *  - Single verse:            "John 3:16"
 *  - Single range:            "Genesis 1:13-17"
 *  - Comma shorthand:         "Genesis 1:13-17,20,22"  →  3 refs in Genesis 1
 *  - Multiple lines:          each line is parsed independently
 *  - Extra whitespace:        trimmed gracefully
 *  - Empty lines:             ignored
 *  - Trailing commas:         ignored
 */

import { BIBLE_BOOKS } from '@/utils/bibleBooks';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedVerseRef {
    book: string;        // Canonical English name from BIBLE_BOOKS
    chapter: number;
    startVerse: number;
    endVerse: number;    // equals startVerse for single verses
}

export interface ParseResult {
    refs: ParsedVerseRef[];
    errors: string[];
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Build a fast lookup: lower-case name/abbreviation → canonical name */
const BOOK_LOOKUP = new Map<string, string>();
for (const b of BIBLE_BOOKS) {
    BOOK_LOOKUP.set(b.name.toLowerCase(), b.name);
    BOOK_LOOKUP.set(b.abbreviation.toLowerCase(), b.name);
}

function resolveBookName(raw: string): string | null {
    return BOOK_LOOKUP.get(raw.trim().toLowerCase()) ?? null;
}

/**
 * Parse a single "chapter:verseSpec" segment that may contain comma-separated
 * verse ranges WITHIN the same book+chapter context.
 *
 * E.g. "1:13-17,20,22"  →  [{1,13,17}, {1,20,20}, {1,22,22}]
 *      "3:16"            →  [{3,16,16}]
 *      "3:16-18"         →  [{3,16,18}]
 */
function parseChapterVerseSpec(
    book: string,
    chapterVerseStr: string
): { refs: Omit<ParsedVerseRef, 'book'>[]; errors: string[] } {
    const refs: Omit<ParsedVerseRef, 'book'>[] = [];
    const errors: string[] = [];

    const colonIdx = chapterVerseStr.indexOf(':');
    if (colonIdx === -1) {
        errors.push(`Missing colon in "${book} ${chapterVerseStr}"`);
        return { refs, errors };
    }

    const chapterStr = chapterVerseStr.slice(0, colonIdx).trim();
    const verseSpecStr = chapterVerseStr.slice(colonIdx + 1).trim();

    const chapter = parseInt(chapterStr, 10);
    if (isNaN(chapter) || chapter < 1) {
        errors.push(`Invalid chapter "${chapterStr}" in "${book} ${chapterVerseStr}"`);
        return { refs, errors };
    }

    if (!verseSpecStr) {
        errors.push(`Missing verse after colon in "${book} ${chapterVerseStr}"`);
        return { refs, errors };
    }

    // Split by comma — each segment is either "N" or "N-M"
    const segments = verseSpecStr.split(',').map(s => s.trim()).filter(Boolean);

    if (segments.length === 0) {
        errors.push(`Empty verse specification in "${book} ${chapterVerseStr}"`);
        return { refs, errors };
    }

    for (const seg of segments) {
        if (seg === '') continue;

        if (seg.endsWith('-')) {
            errors.push(`Dangling hyphen in "${book} ${chapter}:${seg}"`);
            continue;
        }

        const hyphenIdx = seg.indexOf('-');
        if (hyphenIdx === -1) {
            // Single verse
            const v = parseInt(seg, 10);
            if (isNaN(v) || v < 1) {
                errors.push(`Invalid verse number "${seg}" in "${book} ${chapter}"`);
                continue;
            }
            refs.push({ chapter, startVerse: v, endVerse: v });
        } else {
            // Range
            const startStr = seg.slice(0, hyphenIdx).trim();
            const endStr = seg.slice(hyphenIdx + 1).trim();

            if (!startStr || !endStr) {
                errors.push(`Invalid range "${seg}" in "${book} ${chapter}"`);
                continue;
            }

            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);

            if (isNaN(start) || start < 1) {
                errors.push(`Invalid start verse "${startStr}" in "${book} ${chapter}"`);
                continue;
            }
            if (isNaN(end) || end < 1) {
                errors.push(`Invalid end verse "${endStr}" in "${book} ${chapter}"`);
                continue;
            }
            if (end < start) {
                errors.push(`End verse ${end} is less than start verse ${start} in "${book} ${chapter}"`);
                continue;
            }

            refs.push({ chapter, startVerse: start, endVerse: end });
        }
    }

    return { refs, errors };
}

/**
 * Parse a single line of input that represents one book-level reference group.
 *
 * A line may contain ONLY one book+chapter context:
 *   "Genesis 1:13-17,20,22"   ← valid (one book, one chapter, multi-verse)
 *   "Genesis 1:13"            ← valid
 *
 * Cross-book or cross-chapter comma references on a single line are NOT supported
 * (those require separate lines). We detect this and return an error.
 *
 * Book names with numbers/spaces (e.g. "1 John", "Song of Solomon") are handled
 * by greedily matching the longest known book prefix.
 */
function parseLine(line: string): { refs: ParsedVerseRef[]; errors: string[] } {
    const trimmed = line.trim();
    if (!trimmed) return { refs: [], errors: [] };

    // Remove trailing comma
    const cleaned = trimmed.replace(/,\s*$/, '').trim();
    if (!cleaned) return { refs: [], errors: [] };

    // Strategy: walk through all known book names (longest first) and find a match prefix
    // Build sorted list once (longest first to prefer "Song of Solomon" over "Song")
    const sortedBooks = [...BIBLE_BOOKS].sort((a, b) => b.name.length - a.name.length);

    let canonicalBook: string | null = null;
    let remainder = '';

    for (const b of sortedBooks) {
        const nameLower = b.name.toLowerCase();
        const abbrLower = b.abbreviation.toLowerCase();
        const cleanedLower = cleaned.toLowerCase();

        if (cleanedLower.startsWith(nameLower + ' ') || cleanedLower === nameLower) {
            canonicalBook = b.name;
            remainder = cleaned.slice(b.name.length).trim();
            break;
        }
        if (cleanedLower.startsWith(abbrLower + ' ') || cleanedLower === abbrLower) {
            canonicalBook = b.name;
            remainder = cleaned.slice(b.abbreviation.length).trim();
            break;
        }
    }

    if (!canonicalBook) {
        // Try fallback: split on first digit sequence to extract book name
        const digitMatch = cleaned.match(/^(.+?)\s+(\d.*)$/);
        if (digitMatch) {
            const possibleBook = digitMatch[1].trim();
            const resolved = resolveBookName(possibleBook);
            if (resolved) {
                canonicalBook = resolved;
                remainder = digitMatch[2].trim();
            }
        }
        if (!canonicalBook) {
            return {
                refs: [],
                errors: [`Unknown book name in "${trimmed}". Please use a standard English book name (e.g. "Genesis", "John", "1 Corinthians").`],
            };
        }
    }

    if (!remainder) {
        return {
            refs: [],
            errors: [`Missing chapter and verse for "${canonicalBook}". Format: "${canonicalBook} 3:16"`],
        };
    }

    const { refs: chapterRefs, errors: chapterErrors } = parseChapterVerseSpec(canonicalBook, remainder);

    return {
        refs: chapterRefs.map(r => ({ book: canonicalBook!, ...r })),
        errors: chapterErrors,
    };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Main parse function.
 *
 * Accepts a multi-line string (each line = one verse reference group) and returns
 * a flat array of normalized ParsedVerseRef objects plus any validation errors.
 *
 * Each line may also use comma-shorthand for multiple verses within the same chapter:
 *   "Genesis 1:13-17,20,22"
 *
 * Cross-book references require separate lines.
 */
export function parseVerseReferences(raw: string): ParseResult {
    if (!raw || !raw.trim()) {
        return { refs: [], errors: [] };
    }

    const allRefs: ParsedVerseRef[] = [];
    const allErrors: string[] = [];

    // Normalize line endings and split
    const lines = raw
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

    for (const line of lines) {
        const { refs, errors } = parseLine(line);
        allRefs.push(...refs);
        allErrors.push(...errors);
    }

    return { refs: allRefs, errors: allErrors };
}

/**
 * Parse a single-line reference (used for per-field validation in the admin UI).
 * Returns the parsed refs and any errors for that one input.
 */
export function parseSingleReference(raw: string): ParseResult {
    return parseLine(raw.trim());
}

/**
 * Convert a ParsedVerseRef[] back to a human-readable summary string.
 * E.g. [{book:'Genesis',chapter:1,startVerse:13,endVerse:17}, ...]
 *   →  "Genesis 1:13–17, Genesis 1:20, John 3:16"
 */
export function formatRefs(refs: ParsedVerseRef[]): string {
    return refs
        .map(r =>
            r.startVerse === r.endVerse
                ? `${r.book} ${r.chapter}:${r.startVerse}`
                : `${r.book} ${r.chapter}:${r.startVerse}–${r.endVerse}`
        )
        .join(', ');
}

/**
 * Format a single ParsedVerseRef as a reference label.
 * E.g. {book:'Genesis',chapter:1,startVerse:13,endVerse:17} → "Genesis 1:13-17"
 */
export function formatSingleRef(ref: ParsedVerseRef): string {
    return ref.startVerse === ref.endVerse
        ? `${ref.book} ${ref.chapter}:${ref.startVerse}`
        : `${ref.book} ${ref.chapter}:${ref.startVerse}-${ref.endVerse}`;
}
