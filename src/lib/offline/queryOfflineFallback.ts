/**
 * queryOfflineFallback
 *
 * A wrapper around `fetch` used as the `queryFn` for TanStack Query.
 * When a network request fails and the user is offline, it transparently
 * falls back to IndexedDB-cached data from BibleOfflineService / ChapterCacheService.
 *
 * Returns data augmented with `_isOfflineData: true` when served from cache.
 */

import { BibleOfflineService } from './BibleOfflineService';

/**
 * Fetch chapter content with automatic offline fallback.
 * Matches the shape returned by `/api/v1/bible/{version}/{book}/{chapter}`.
 */
export async function fetchChapterWithOfflineFallback(
  versionId: string,
  versionAbbreviation: string,
  bookId: string,
  chapterNumber: number,
): Promise<{
  title: string;
  verses: Array<{ number: number; text: string }>;
  _isOfflineData?: boolean;
}> {
  try {
    const response = await fetch(
      `/api/v1/bible/${encodeURIComponent(versionAbbreviation)}/${encodeURIComponent(bookId)}/${chapterNumber}`,
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to fetch content');

    return {
      title: `${result.data.book.name} ${result.data.chapter.number}`,
      verses: result.data.verses,
    };
  } catch (networkError) {
    // Check if we have offline data
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineChapter = await BibleOfflineService.getChapter(
        versionId,
        bookId,
        chapterNumber,
      );

      if (offlineChapter && offlineChapter.verses.length > 0) {
        return {
          title: `${offlineChapter.bookName} ${chapterNumber}`,
          verses: offlineChapter.verses,
          _isOfflineData: true,
        };
      }
    }

    // Re-throw so TanStack Query shows error state
    throw networkError;
  }
}

/**
 * Fetch Bible versions with offline fallback.
 */
export async function fetchVersionsWithOfflineFallback(): Promise<any[]> {
  try {
    const response = await fetch('/api/v1/bible/versions');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error('Failed to fetch versions');
    return result.data;
  } catch {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineVersions = await BibleOfflineService.getAllVersions();
      if (offlineVersions.length > 0) return offlineVersions;
    }
    throw new Error('Failed to fetch versions');
  }
}
