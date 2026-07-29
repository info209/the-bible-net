/**
 * queryOfflineFallback
 *
 * A centralized wrapper around network fetches used by TanStack Query.
 * When a network request fails (or device is offline), transparently
 * falls back to IndexedDB-cached data from ModuleOfflineService or BibleOfflineService.
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ModuleOfflineService } from './ModuleOfflineService';

/**
 * Universal query wrapper for offline-first data fetching across all modules.
 *
 * - Online: Executes `fetcherFn()`, persists result to IndexedDB, and returns data.
 * - Offline / Error: Reads cached data from IndexedDB and returns it.
 * - Only fails if neither network nor IndexedDB has data.
 */
export async function fetchWithOfflineCache<T>(
  cacheKey: string,
  fetcherFn: () => Promise<T>,
): Promise<T> {
  try {
    const data = await fetcherFn();
    if (data !== undefined && data !== null) {
      ModuleOfflineService.saveCache(cacheKey, data).catch(() => {});
    }
    return data;
  } catch (networkError) {
    try {
      const cached = await ModuleOfflineService.getCache<T>(cacheKey);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch {
      // Ignore cache lookup error, throw original network error
    }
    throw networkError;
  }
}

/**
 * Fetch chapter content with automatic offline fallback.
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
    try {
      const offlineChapter = await BibleOfflineService.getChapter(
        versionId || versionAbbreviation,
        bookId,
        chapterNumber,
      );

      if (offlineChapter && offlineChapter.verses && offlineChapter.verses.length > 0) {
        return {
          title: `${offlineChapter.bookName} ${chapterNumber}`,
          verses: offlineChapter.verses,
          _isOfflineData: true,
        };
      }
    } catch {
      // Ignore offline error
    }

    throw networkError;
  }
}

/**
 * Fetch Bible versions with offline fallback.
 */
export async function fetchVersionsWithOfflineFallback(): Promise<any[]> {
  return fetchWithOfflineCache('bible_versions', async () => {
    const response = await fetch('/api/v1/bible/versions');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error('Failed to fetch versions');
    return result.data;
  });
}
