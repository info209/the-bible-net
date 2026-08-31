import { toast } from '@/context/ToastContext';

export interface VerseShareData {
  verseText?: string;
  verse?: string;
  content?: string;
  text?: string;
  verseItems?: Array<{ number: number; text: string }>;
  verseBlocks?: Array<{ verses?: Array<{ number: number; text: string }> }>;
  reference?: string;
  verseReference?: string;
  verseRangeText?: string;
  ref?: string;
  version?: string;
  versionId?: string;
  versionName?: string;
  book?: string;
  bookId?: string;
  bookName?: string;
  verseBook?: string;
  chapter?: number | string;
  verseChapter?: number | string;
  verseNumber?: number | string;
  verseNum?: number | string;
  verses?: number[];
  url?: string;
  customUrl?: string;
  title?: string;
}

/**
 * Extracts and cleans verse text from various verse data sources across the app.
 */
export function extractVerseText(data: VerseShareData | any): string {
  if (!data) return '';

  let rawText = '';
  let verseItems: Array<{ number: number; text: string }> = data?.verseItems || [];
  if (verseItems.length === 0 && data?.verseBlocks && Array.isArray(data.verseBlocks)) {
    verseItems = data.verseBlocks.flatMap((b: any) => b.verses || []);
  }

  if (verseItems.length > 1) {
    rawText = verseItems.map(v => `${v.number} ${v.text.trim()}`).join(' ');
  } else if (verseItems.length === 1) {
    rawText = verseItems[0].text;
  } else if (typeof data?.verseText === 'string' && data.verseText) {
    rawText = data.verseText;
  } else if (typeof data?.verse === 'string' && data.verse) {
    rawText = data.verse;
  } else if (typeof data?.content === 'string' && data.content) {
    rawText = data.content;
  } else if (typeof data?.text === 'string' && data.text) {
    rawText = data.text;
  }

  return rawText
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .trim();
}

/**
 * Extracts reference string from various verse data sources.
 */
export function extractVerseReference(data: VerseShareData | any): string {
  if (!data) return '';

  const ref = (
    data?.reference ||
    data?.verseReference ||
    data?.verseRangeText ||
    data?.ref ||
    (data?.bookName && data?.chapter != null && data?.verses?.length
      ? `${data.bookName} ${data.chapter}:${data.verses.join(', ')}`
      : '') ||
    (data?.book && data?.chapter != null && data?.verse != null
      ? `${data.book} ${data.chapter}:${data.verse}`
      : '') ||
    ''
  ).trim();

  return ref;
}

/**
 * Formats a verse for standardized sharing across the entire app.
 *
 * Format:
 * "${verseText}"
 *  - ${reference} ${version}
 *
 * Example (single verse):
 * "He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?"
 *  - Romans 8:32 KJV
 *
 * Example (multiple verses):
 * "16 For God so loved the world, that he gave his only begotten Son... 17 For God sent not..."
 *  - John 3:16-17 KJV
 */
export function formatVerseShareText(data: VerseShareData | any): string {
  const verseText = extractVerseText(data);
  const reference = extractVerseReference(data);
  const version = (data?.version || data?.versionId || data?.versionName || '').trim();

  if (!reference) {
    return `"${verseText}"`;
  }

  let formattedRef = reference;
  // If version is present and reference doesn't already contain it, append it with a space
  if (version && !reference.toLowerCase().endsWith(version.toLowerCase())) {
    formattedRef = `${reference} ${version}`;
  }

  return `"${verseText}"\n - ${formattedRef}`;
}

/**
 * Builds the standard Bible verse URL pointing to the web reader.
 */
export function buildBibleVerseUrl(data: VerseShareData | any): string {
  if (data?.url || data?.customUrl) {
    return data.url || data.customUrl;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams();

  const version = (data?.version || data?.versionId || data?.versionName || '').trim();
  if (version) params.set('version', version);

  const book = (data?.book || data?.bookId || data?.bookName || data?.verseBook || '').trim();
  if (book) params.set('book', book);

  const chapter = data?.chapter != null ? data.chapter : data?.verseChapter;
  if (chapter != null && chapter !== '') params.set('chapter', String(chapter));

  const verse = (Array.isArray(data?.verses) && data.verses.length > 0 ? data.verses[0] : null) ??
                data?.verse ??
                data?.verseNumber ??
                data?.verseNum;
  if (verse != null && verse !== '') params.set('verse', String(verse));

  return `${origin}/bible?${params.toString()}`;
}

/**
 * Common verse sharing function:
 * Reuses the exact Web Share / clipboard copy behavior with toast notification.
 */
export async function shareVerse(data: VerseShareData | any): Promise<boolean> {
  const text = formatVerseShareText(data);
  const url = buildBibleVerseUrl(data);
  const title = data?.title || 'The Bible Net';

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        // User deliberately cancelled/closed the native share sheet
        return false;
      }
      console.log('Web Share failed, falling back to clipboard copy:', error);
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Link copied to clipboard!');
      return true;
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      toast.error('Failed to copy link.');
      return false;
    }
  }

  return false;
}

/**
 * Formats a Daily Verse object for copying to the clipboard from kebab menus.
 */
export function formatCopyVerseText(content: any): string {
  if (!content) return '';

  const verseText = extractVerseText(content);
  const reference = content?.verseReference || extractVerseReference(content) || '';
  const version = content?.version || content?.versionId || content?.versionName || 'KJV';

  if (reference) {
    return `"${verseText}"\n\n${reference} - ${version}`;
  }
  return `"${verseText}"`;
}
