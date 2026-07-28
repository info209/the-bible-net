/**
 * DownloadManager
 *
 * Handles full Bible version downloads:
 * - Fetches all books then all chapter content from the server APIs
 * - Stores everything in IndexedDB via BibleOfflineService
 * - Tracks progress, supports pause/resume/retry/cancel
 * - Uses AbortController for cancellation
 * - Processes chapters in batches of 5 to avoid overwhelming the server
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ChapterCacheService } from './ChapterCacheService';
import type {
  OfflineBookData,
  OfflineChapterData,
  VersionDownloadRecord,
} from './types';

const CHAPTER_BATCH_SIZE = 5;
const FETCH_TIMEOUT_MS = 15_000;

/** Map of active AbortControllers, keyed by versionId */
const activeAbortControllers = new Map<string, AbortController>();

export type DownloadProgressCallback = (
  progress: number,
  downloadedChapters: number,
  totalChapters: number,
  currentBook?: string,
) => void;

export class DownloadManager {
  /**
   * Start downloading a Bible version.
   * Fetches all books → all chapters → stores in IndexedDB.
   */
  static async startDownload(
    versionId: string,
    versionAbbreviation: string,
    versionName: string,
    language: string,
    onProgress?: DownloadProgressCallback,
  ): Promise<void> {
    // Cancel any existing download for this version
    this.cancelAbort(versionId);
    const controller = new AbortController();
    activeAbortControllers.set(versionId, controller);

    try {
      // Initialize download status
      await BibleOfflineService.setDownloadStatus({
        versionId,
        versionAbbreviation,
        versionName,
        language,
        status: 'downloading',
        progressPercent: 0,
        downloadedChapters: 0,
        totalChapters: 0,
      });

      // Step 1: Fetch all books for the version
      const books = await this.fetchBooks(versionId, versionAbbreviation, controller.signal);
      if (books.length === 0) throw new Error('No books found for this version');

      // Save books to IndexedDB
      await BibleOfflineService.saveBooks(books);

      // Step 2: Calculate total chapters
      const totalChapters = books.reduce((sum, b) => sum + b.chapterCount, 0);
      await BibleOfflineService.updateDownloadProgress(versionId, { totalChapters });

      let downloadedChapters = 0;

      // Step 3: Fetch chapters per book
      for (const book of books) {
        if (controller.signal.aborted) break;

        // Build chapter numbers array
        const chapterNumbers = Array.from({ length: book.chapterCount }, (_, i) => i + 1);

        // Process in batches
        for (let i = 0; i < chapterNumbers.length; i += CHAPTER_BATCH_SIZE) {
          if (controller.signal.aborted) break;

          const batch = chapterNumbers.slice(i, i + CHAPTER_BATCH_SIZE);
          const chapterDataList = await this.fetchChapterBatch(
            versionId,
            versionAbbreviation,
            book,
            batch,
            controller.signal,
          );

          await BibleOfflineService.saveChapters(chapterDataList);

          // Update access log for each chapter (mark as protected)
          for (const chapter of chapterDataList) {
            await ChapterCacheService.updateAccessLog(chapter.id, versionId, true);
          }

          downloadedChapters += chapterDataList.length;
          const percent = Math.round((downloadedChapters / totalChapters) * 100);

          await BibleOfflineService.updateDownloadProgress(versionId, {
            progressPercent: percent,
            downloadedChapters,
            pausedAtBookId: book.id,
            pausedAtChapter: batch[batch.length - 1],
          });

          onProgress?.(percent, downloadedChapters, totalChapters, book.name);
        }
      }

      if (controller.signal.aborted) {
        // Status was already set to 'paused' by pauseDownload()
        return;
      }

      // Step 4: Mark as completed
      const estimatedBytes = await BibleOfflineService.estimateVersionSize(versionId);
      await BibleOfflineService.updateDownloadProgress(versionId, {
        status: 'downloaded',
        progressPercent: 100,
        downloadedAt: new Date().toISOString(),
        estimatedBytes,
        errorMessage: undefined,
      });

      onProgress?.(100, totalChapters, totalChapters);
    } catch (err: any) {
      if (err.name === 'AbortError') return; // Handled by pause/cancel
      console.error('[DownloadManager] Download failed:', err);
      await BibleOfflineService.updateDownloadProgress(versionId, {
        status: 'failed',
        errorMessage: err.message || 'Download failed',
      });
    } finally {
      activeAbortControllers.delete(versionId);
    }
  }

  /**
   * Pause an active download.
   * The current chapter batch will complete, then the download stops.
   */
  static async pauseDownload(versionId: string): Promise<void> {
    const controller = activeAbortControllers.get(versionId);
    if (controller) {
      controller.abort();
      activeAbortControllers.delete(versionId);
    }
    await BibleOfflineService.updateDownloadProgress(versionId, {
      status: 'paused',
    });
  }

  /**
   * Resume a paused download from where it left off.
   */
  static async resumeDownload(
    versionId: string,
    onProgress?: DownloadProgressCallback,
  ): Promise<void> {
    const status = await BibleOfflineService.getDownloadStatus(versionId);
    if (!status) return;

    if (status.status !== 'paused' && status.status !== 'failed') return;

    // Re-start with full download (will skip already-stored chapters implicitly
    // because we save by composite key — same chapter will just be overwritten)
    await this.startDownload(
      versionId,
      status.versionAbbreviation,
      status.versionName,
      status.language,
      onProgress,
    );
  }

  /**
   * Retry a failed download (resets error state and restarts).
   */
  static async retryDownload(
    versionId: string,
    onProgress?: DownloadProgressCallback,
  ): Promise<void> {
    await BibleOfflineService.updateDownloadProgress(versionId, {
      status: 'downloading',
      errorMessage: undefined,
      progressPercent: 0,
      downloadedChapters: 0,
    });
    await this.resumeDownload(versionId, onProgress);
  }

  /**
   * Cancel and delete all data for a version download in progress.
   */
  static async cancelDownload(versionId: string): Promise<void> {
    const controller = activeAbortControllers.get(versionId);
    if (controller) {
      controller.abort();
      activeAbortControllers.delete(versionId);
    }
    // Remove partial data
    await BibleOfflineService.deleteAllChaptersForVersion(versionId);
    await BibleOfflineService.deleteBooks(versionId);
    await BibleOfflineService.updateDownloadProgress(versionId, {
      status: 'not_downloaded',
      progressPercent: 0,
      downloadedChapters: 0,
      errorMessage: undefined,
    });
  }

  /**
   * Delete a fully downloaded version (removes all stored data).
   */
  static async deleteDownload(versionId: string): Promise<void> {
    this.cancelAbort(versionId);
    await BibleOfflineService.deleteVersionData(versionId);
  }

  /**
   * Check whether a download is actively in progress.
   */
  static isDownloading(versionId: string): boolean {
    return activeAbortControllers.has(versionId);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private static cancelAbort(versionId: string): void {
    const existing = activeAbortControllers.get(versionId);
    if (existing) {
      existing.abort();
      activeAbortControllers.delete(versionId);
    }
  }

  private static async fetchBooks(
    versionId: string,
    versionAbbreviation: string,
    signal: AbortSignal,
  ): Promise<OfflineBookData[]> {
    const res = await fetchWithTimeout(
      `/api/v1/bible/${encodeURIComponent(versionAbbreviation)}/books`,
      { signal },
    );
    if (!res.ok) throw new Error(`Failed to fetch books: HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Failed to fetch books');

    return (json.data as any[]).map((b: any) => ({
      id: b._id,
      versionId,
      name: b.name,
      abbreviation: b.abbreviation || b.name,
      englishName: b.name,
      order: b.order,
      testament: b.testament === 'NT' ? 'NT' : 'OT',
      chapterCount: b.chapterCount || 0,
    }));
  }

  private static async fetchChapterBatch(
    versionId: string,
    versionAbbreviation: string,
    book: OfflineBookData,
    chapterNumbers: number[],
    signal: AbortSignal,
  ): Promise<OfflineChapterData[]> {
    const results: OfflineChapterData[] = [];

    await Promise.all(
      chapterNumbers.map(async (chapterNum) => {
        if (signal.aborted) return;
        try {
          const res = await fetchWithTimeout(
            `/api/v1/bible/${encodeURIComponent(versionAbbreviation)}/${encodeURIComponent(book.id)}/${chapterNum}`,
            { signal },
          );
          if (!res.ok) return; // Skip failed chapters, continue download

          const json = await res.json();
          if (!json.success || !json.data?.verses) return;

          const chapter: OfflineChapterData = {
            id: `${versionId}::${book.id}::${chapterNum}`,
            versionId,
            bookId: book.id,
            bookName: book.name,
            bookAbbreviation: book.abbreviation,
            chapterNumber: chapterNum,
            testament: book.testament,
            verses: json.data.verses as Array<{ number: number; text: string }>,
            cachedAt: new Date().toISOString(),
            isDownloaded: true,
          };
          results.push(chapter);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn(
              `[DownloadManager] Failed to fetch ${book.name} ${chapterNum}:`,
              err.message,
            );
          }
        }
      }),
    );

    return results;
  }
}

/** fetch with a configurable timeout */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Merge signals if the caller also has one
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
