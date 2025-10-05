// src/lib/highlightHelpers.ts
export function makeVerseId(book: string, chapter: number, verseNum: number): string {
    return `${book}_${chapter}_${verseNum}`;
}

// canonical rangeId: version:BOOK:chapter:start-end
export function makeRangeId(version: string, book: string, chapter: number, startVerse: number, endVerse: number): string {
    return `${version}:${book}:${chapter}:${startVerse}-${endVerse}`;
}

export function parseRangeId(rangeId: string) {
    const [version, book, chapterStr, rangePart] = rangeId.split(":");
    const chapter = parseInt(chapterStr, 10);
    const [startStr, endStr] = rangePart.split("-");
    return { version, book, chapter, startVerse: parseInt(startStr, 10), endVerse: parseInt(endStr, 10) };
}

export function coveredVerseIdsFromRange(book: string, chapter: number, startVerse: number, endVerse: number): string[] {
    const arr: string[] = [];
    for (let v = startVerse; v <= endVerse; v++) arr.push(makeVerseId(book, chapter, v));
    return arr;
}
