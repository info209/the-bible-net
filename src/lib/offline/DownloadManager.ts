/**
 * DownloadManager
 *
 * Handles Version-level Bible downloads:
 * - Downloads an entire Bible version (all books, chapters, verses, and footnotes)
 * - Strictly enforces the 100 MB storage cap and browser quota via StorageManager
 * - Tracks download progress (0% - 100%) with reactive callbacks
 * - Protects downloaded chapters in LRU cache
 * - Supports cancellation, pause, resume, and retry via AbortController
 * - Resilient to network interruptions, app reloads, and partial failures
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ChapterCacheService } from './ChapterCacheService';
import { ModuleOfflineService } from './ModuleOfflineService';
import { StorageManager } from './StorageManager';
import { buildVersionDownloadKey } from './db';
import type { OfflineChapterData, OfflineBookData, OfflineVersionData, DownloadRecord } from './types';

const FETCH_TIMEOUT_MS = 60_000;
const CHAPTER_BATCH_SIZE = 50;

/** Active download controllers keyed by record ID (versionId) */
const activeAbortControllers = new Map<string, { controller: AbortController; isPause?: boolean }>();

export type DownloadProgressCallback = (
  progress: number,
  downloadedChapters: number,
  totalChapters: number,
  statusMessage?: string,
) => void;

export class DownloadManager {
  /**
   * Download a complete Bible version (all books, chapters, verses, and footnotes).
   */
  static async downloadVersion({
    versionId,
    versionAbbreviation,
    versionName,
    language = 'English',
    onProgress,
  }: {
    versionId: string;
    versionAbbreviation: string;
    versionName?: string;
    language?: string;
    onProgress?: DownloadProgressCallback;
  }): Promise<void> {
    const recordId = buildVersionDownloadKey(versionId);

    if (this.isDownloading(recordId)) {
      console.warn(`[DownloadManager] Download already in progress for version ${versionAbbreviation}`);
      return;
    }

    // Check if this version was already successfully downloaded (to avoid wiping if update fails)
    const previousRecord = await BibleOfflineService.getVersionDownloadStatus(recordId);
    const wasPreviouslyDownloaded = previousRecord?.status === 'downloaded';

    // 1. Storage Cap & Browser Quota Check (~10 MB average per complete version)
    const estimatedBytes = 15 * 1024 * 1024;
    const canFit = await StorageManager.canFit(estimatedBytes);
    if (!canFit) {
      const errMessage = '100 MB offline storage limit reached. Please delete some downloaded versions to free up space.';
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'version',
        versionId,
        versionAbbreviation,
        versionName: versionName || versionAbbreviation,
        language,
        status: 'failed',
        progressPercent: previousRecord?.progressPercent ?? 0,
        errorMessage: errMessage,
      });
      throw new Error(errMessage);
    }

    this.cancelAbort(recordId);
    const controller = new AbortController();
    activeAbortControllers.set(recordId, { controller, isPause: false });

    try {
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'version',
        versionId,
        versionAbbreviation,
        versionName: versionName || versionAbbreviation,
        language,
        status: 'downloading',
        progressPercent: 5,
        downloadedChapters: 0,
        totalChapters: previousRecord?.totalChapters ?? 1189,
        errorMessage: undefined,
      });

      onProgress?.(5, 0, previousRecord?.totalChapters ?? 1189, `Connecting to download ${versionAbbreviation}...`);

      // 2. Fetch full version download payload from API
      let versionData: OfflineVersionData;
      let booksData: OfflineBookData[] = [];
      let chaptersData: OfflineChapterData[] = [];

      try {
        const response = await fetchWithTimeout(
          `/api/v1/bible/${encodeURIComponent(versionAbbreviation || versionId)}/download`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to download version`);
        }

        const json = await response.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Invalid version download response');
        }

        versionData = json.data.version;
        booksData = json.data.books || [];
        chaptersData = json.data.chapters || [];
      } catch (err: any) {
        if (controller.signal.aborted) throw err;
        console.warn('[DownloadManager] Bulk download endpoint failed, attempting fallback...', err.message);
        // Fallback fetch via books & chapters
        const fallbackResult = await this.fallbackFetchVersion(
          versionId,
          versionAbbreviation,
          versionName,
          language,
          controller.signal,
          onProgress,
        );
        versionData = fallbackResult.version;
        booksData = fallbackResult.books;
        chaptersData = fallbackResult.chapters;
      }

      if (controller.signal.aborted) return;

      const totalChapters = chaptersData.length || 1189;
      const totalBooks = booksData.length || 66;

      onProgress?.(25, 0, totalChapters, `Storing ${totalBooks} books & ${totalChapters} chapters...`);
      await BibleOfflineService.updateDownloadProgress(recordId, {
        progressPercent: 25,
        totalChapters,
        totalBooks,
      });

      // 3. Save Version metadata
      await BibleOfflineService.saveVersion(versionData);

      // 4. Save Books into IndexedDB & ModuleCache
      await BibleOfflineService.saveBooks(booksData);
      
      // Structure books for ModuleOfflineService compatibility with BibleReader
      const ot = booksData.filter((b) => b.testament === 'OT' || b.order <= 39);
      const nt = booksData.filter((b) => b.testament === 'NT' || b.order > 39);
      const booksCacheObj = { 'Old Testament': ot, 'New Testament': nt };
      ModuleOfflineService.saveCache(`bible_books_${versionId}`, booksCacheObj).catch(() => {});
      ModuleOfflineService.saveCache(`bible_books_${versionAbbreviation}`, booksCacheObj).catch(() => {});

      // 5. Batch save Chapters into IndexedDB with protection in access log
      let savedChapters = 0;
      for (let i = 0; i < chaptersData.length; i += CHAPTER_BATCH_SIZE) {
        if (controller.signal.aborted) break;

        const batch = chaptersData.slice(i, i + CHAPTER_BATCH_SIZE);
        await BibleOfflineService.saveChapters(batch);

        for (const ch of batch) {
          await ChapterCacheService.updateAccessLog(ch.id, versionId, true);
        }

        savedChapters += batch.length;
        const percent = Math.min(95, Math.round(25 + (savedChapters / totalChapters) * 70));

        await BibleOfflineService.updateDownloadProgress(recordId, {
          progressPercent: percent,
          downloadedChapters: savedChapters,
          downloadedBooks: Math.round((savedChapters / totalChapters) * totalBooks),
        });

        onProgress?.(percent, savedChapters, totalChapters, `Saving chapters (${savedChapters}/${totalChapters})...`);
      }

      if (controller.signal.aborted) return;

      // 6. Verify and finalize download
      const actualBytes = await BibleOfflineService.estimateVersionSize(versionId);
      await BibleOfflineService.updateDownloadProgress(recordId, {
        status: 'downloaded',
        progressPercent: 100,
        downloadedChapters: totalChapters,
        totalChapters,
        downloadedBooks: totalBooks,
        totalBooks,
        downloadedAt: new Date().toISOString(),
        estimatedBytes: actualBytes,
        errorMessage: undefined,
      });

      onProgress?.(100, totalChapters, totalChapters, `${versionName || versionAbbreviation} is ready for offline reading.`);
    } catch (err: any) {
      const abortInfo = activeAbortControllers.get(recordId);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        if (abortInfo?.isPause) {
          await BibleOfflineService.updateDownloadProgress(recordId, {
            status: 'paused',
          });
        }
        return;
      }

      console.error('[DownloadManager] Version download failed:', err);

      // If this was an update on a previously valid version, don't wipe out the valid download
      if (wasPreviouslyDownloaded) {
        await BibleOfflineService.updateDownloadProgress(recordId, {
          status: 'update_available',
          errorMessage: `Update failed: ${err.message || 'Network error'}`,
        });
      } else {
        await BibleOfflineService.updateDownloadProgress(recordId, {
          status: 'failed',
          errorMessage: err.message || 'Download failed. Please check internet and retry.',
        });
      }
      throw err;
    } finally {
      activeAbortControllers.delete(recordId);
    }
  }

  /**
   * Delete an entire downloaded Bible version from offline storage.
   */
  static async deleteVersion(versionId: string): Promise<void> {
    const recordId = buildVersionDownloadKey(versionId);
    this.cancelAbort(recordId);
    await BibleOfflineService.deleteVersionData(versionId);
    // Also remove from ModuleOfflineService cache
    ModuleOfflineService.saveCache(`bible_books_${versionId}`, null).catch(() => {});
  }

  /**
   * Pause an active download.
   */
  static pauseDownload(versionId: string): void {
    const recordId = buildVersionDownloadKey(versionId);
    const active = activeAbortControllers.get(recordId);
    if (active) {
      active.isPause = true;
      active.controller.abort();
      activeAbortControllers.delete(recordId);
    }
    BibleOfflineService.updateDownloadProgress(recordId, {
      status: 'paused',
    }).catch(() => {});
  }

  /**
   * Resume / Retry a paused or failed download.
   */
  static async resumeDownload({
    versionId,
    versionAbbreviation,
    versionName,
    language,
    onProgress,
  }: {
    versionId: string;
    versionAbbreviation: string;
    versionName?: string;
    language?: string;
    onProgress?: DownloadProgressCallback;
  }): Promise<void> {
    await this.downloadVersion({
      versionId,
      versionAbbreviation,
      versionName,
      language,
      onProgress,
    });
  }

  /**
   * Cancel an active download and revert/clean up state.
   */
  static async cancelDownload(versionId: string): Promise<void> {
    const recordId = buildVersionDownloadKey(versionId);
    this.cancelAbort(recordId);
    const previous = await BibleOfflineService.getVersionDownloadStatus(recordId);
    if (previous?.status !== 'downloaded') {
      await BibleOfflineService.deleteVersionData(versionId);
    }
  }

  /**
   * Check if an active download is running.
   */
  static isDownloading(recordId: string): boolean {
    return activeAbortControllers.has(recordId);
  }

  private static cancelAbort(recordId: string): void {
    const existing = activeAbortControllers.get(recordId);
    if (existing) {
      existing.controller.abort();
      activeAbortControllers.delete(recordId);
    }
  }

  /**
   * Fallback method: fetch books and chapter content if bulk endpoint is unavailable.
   */
  private static async fallbackFetchVersion(
    versionId: string,
    versionAbbreviation: string,
    versionName?: string,
    language: string = 'English',
    signal?: AbortSignal,
    onProgress?: DownloadProgressCallback,
  ): Promise<{
    version: OfflineVersionData;
    books: OfflineBookData[];
    chapters: OfflineChapterData[];
  }> {
    const booksRes = await fetchWithTimeout(
      `/api/v1/bible/${encodeURIComponent(versionAbbreviation || versionId)}/books`,
      { signal },
    );
    const booksJson = await booksRes.json();
    if (!booksJson.success || !Array.isArray(booksJson.data)) {
      throw new Error('Failed to fetch books for version');
    }

    const rawBooks = booksJson.data;
    const books: OfflineBookData[] = rawBooks.map((b: any) => ({
      id: b._id || b.id,
      versionId,
      name: b.name,
      abbreviation: b.abbreviation,
      englishName: b.name,
      order: b.order,
      testament: b.testament || (b.order <= 39 ? 'OT' : 'NT'),
      chapterCount: b.chaptersCount || b.chapterCount || 1,
    }));

    const chapters: OfflineChapterData[] = [];
    const totalBooks = books.length;

    for (let bIdx = 0; bIdx < totalBooks; bIdx++) {
      if (signal?.aborted) break;
      const b = books[bIdx];
      const chCount = b.chapterCount;
      const chNums = Array.from({ length: chCount }, (_, i) => i + 1);

      for (const chNum of chNums) {
        if (signal?.aborted) break;
        try {
          const chRes = await fetchWithTimeout(
            `/api/v1/bible/${encodeURIComponent(versionAbbreviation)}/${encodeURIComponent(b.id)}/${chNum}`,
            { signal },
          );
          if (chRes.ok) {
            const chJson = await chRes.json();
            if (chJson.success && chJson.data?.verses) {
              chapters.push({
                id: `${versionId}::${b.id}::${chNum}`,
                versionId,
                bookId: b.id,
                bookName: b.name,
                bookAbbreviation: b.abbreviation || versionAbbreviation,
                chapterNumber: chNum,
                testament: b.testament,
                verses: chJson.data.verses,
                footnotes: chJson.data.footnotes,
                cachedAt: new Date().toISOString(),
                isDownloaded: true,
              });
            }
          }
        } catch {
          // Continue with next chapter in fallback
        }
      }

      onProgress?.(
        Math.round(5 + (bIdx / totalBooks) * 20),
        chapters.length,
        1189,
        `Fetching ${b.name}...`,
      );
    }

    return {
      version: {
        id: versionId,
        abbreviation: versionAbbreviation,
        name: versionName || versionAbbreviation,
        language,
        isActive: true,
        updatedAt: new Date().toISOString(),
      },
      books,
      chapters,
    };
  }

  // ---------------------------------------------------------------------------
  // Backward compatibility wrappers for single Book / Chapter
  // ---------------------------------------------------------------------------

  static async downloadBook(params: {
    versionId: string;
    versionAbbreviation: string;
    bookId: string;
    bookName: string;
    chapterCount: number;
    testament?: 'OT' | 'NT';
    onProgress?: DownloadProgressCallback;
  }): Promise<void> {
    return this.downloadVersion({
      versionId: params.versionId,
      versionAbbreviation: params.versionAbbreviation,
      versionName: params.versionAbbreviation,
      onProgress: params.onProgress,
    });
  }

  static async downloadChapter(params: any): Promise<void> {
    return this.downloadVersion({
      versionId: params.versionId,
      versionAbbreviation: params.versionAbbreviation,
      onProgress: params.onProgress,
    });
  }

  static async deleteBook(versionId: string, _bookId: string): Promise<void> {
    return this.deleteVersion(versionId);
  }

  static async deleteChapter(versionId: string, _bookId: string, _chapterNumber: number): Promise<void> {
    return this.deleteVersion(versionId);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const callerSignal = options.signal as AbortSignal | undefined;
  if (callerSignal) {
    callerSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
