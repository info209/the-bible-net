import { BIBLE_BOOKS, TELUGU_BOOK_NAMES, HINDI_BOOK_NAMES } from './bibleBooks';

// Dynamic dynamic book resolver cache
let dbBooksCache: Array<{ name: string; abbreviation?: string; order: number }> = [];
let cacheLoaded = false;
let BookModel: any = null;

// Populate static candidates
const STATIC_BOOKS: Array<{ name: string; abbreviation?: string; order: number }> = [];

// Populate English
BIBLE_BOOKS.forEach(b => {
  STATIC_BOOKS.push({ name: b.name, abbreviation: b.abbreviation, order: b.order });
});
// Populate Telugu
for (const [engName, telName] of Object.entries(TELUGU_BOOK_NAMES)) {
  const book = BIBLE_BOOKS.find(b => b.name === engName);
  if (book) {
    STATIC_BOOKS.push({ name: telName, order: book.order });
  }
}
// Populate Hindi
for (const [engName, hinName] of Object.entries(HINDI_BOOK_NAMES)) {
  const book = BIBLE_BOOKS.find(b => b.name === engName);
  if (book) {
    STATIC_BOOKS.push({ name: hinName, order: book.order });
  }
}

export async function loadBooksCache() {
  if (cacheLoaded) return;
  try {
    if (!BookModel) {
      const models = await import('../models/Bible');
      BookModel = models.Book;
    }
    const books = await BookModel.find().select('name abbreviation order').lean();
    dbBooksCache = books.map((b: any) => ({
      name: b.name,
      abbreviation: b.abbreviation,
      order: b.order
    }));
    cacheLoaded = true;
  } catch (err) {
    console.error('Failed to load books cache from DB:', err);
  }
}

export async function resolveBook(query: string): Promise<{ order: number; name: string; abbreviation: string; testament: string } | null> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return null;

  // 1. Ensure DB cache is loaded if possible
  await loadBooksCache();

  // 2. Collect all candidates
  const candidates = [...dbBooksCache, ...STATIC_BOOKS];

  // 3. Try exact match on name
  for (const c of candidates) {
    if (c.name.toLowerCase() === cleanQuery) {
      const canonical = BIBLE_BOOKS.find(b => b.order === c.order);
      if (canonical) return canonical as any;
    }
  }

  // 4. Try exact match on abbreviation (if present)
  for (const c of candidates) {
    if (c.abbreviation && c.abbreviation.toLowerCase() === cleanQuery) {
      const canonical = BIBLE_BOOKS.find(b => b.order === c.order);
      if (canonical) return canonical as any;
    }
  }

  // 5. Try prefix match on name (query is a prefix of candidate name)
  if (cleanQuery.length >= 2) {
    for (const c of candidates) {
      if (c.name.toLowerCase().startsWith(cleanQuery)) {
        const canonical = BIBLE_BOOKS.find(b => b.order === c.order);
        if (canonical) return canonical as any;
      }
    }
  }

  // 6. Try prefix match on abbreviation (if present)
  if (cleanQuery.length >= 2) {
    for (const c of candidates) {
      if (c.abbreviation && c.abbreviation.toLowerCase().startsWith(cleanQuery)) {
        const canonical = BIBLE_BOOKS.find(b => b.order === c.order);
        if (canonical) return canonical as any;
      }
    }
  }

  return null;
}
