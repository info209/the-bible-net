/**
 * DownloadManager
 *
 * Handles Book-level and Chapter-level downloads:
 * - Downloads one book at a time (all chapters of that book) or individual chapters
 * - Strictly enforces the 100 MB storage cap via StorageManager
 * - Tracks download progress with percentage and callbacks
 * - Supports cancellation via AbortController
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ChapterCacheService } from './ChapterCacheService';
import { StorageManager } from './StorageManager';
import { buildBookDownloadKey, buildChapterDownloadKey } from './db';
import type { OfflineChapterData, DownloadRecord } from './types';

const CHAPTER_BATCH_SIZE = 5;
const FETCH_TIMEOUT_MS = 15_000;

/** Active download controllers keyed by record ID */
const activeAbortControllers = new Map<string, AbortController>();

export type DownloadProgressCallback = (
  progress: number,
  downloadedChapters: number,
  totalChapters: number,
  statusMessage?: string,
) => void;

export class DownloadManager {
  /**
   * Download all chapters of a single book.
   */
  static async downloadBook({
    versionId,
    versionAbbreviation,
    bookId,
    bookName,
    chapterCount,
    testament = 'OT',
    onProgress,
  }: {
    versionId: string;
    versionAbbreviation: string;
    bookId: string;
    bookName: string;
    chapterCount: number;
    testament?: 'OT' | 'NT';
    onProgress?: DownloadProgressCallback;
  }): Promise<void> {
    const recordId = buildBookDownloadKey(versionId, bookId);

    // 100 MB Storage Cap Check (~5KB per chapter average)
    const estimatedBytes = chapterCount * 5000;
    const canFit = await StorageManager.canFit(estimatedBytes);
    if (!canFit) {
      const errMessage = '100 MB storage limit reached. Please delete some downloaded books to free up space.';
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'book',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        totalChapters: chapterCount,
        status: 'failed',
        progressPercent: 0,
        errorMessage: errMessage,
      });
      throw new Error(errMessage);
    }

    this.cancelAbort(recordId);
    const controller = new AbortController();
    activeAbortControllers.set(recordId, controller);

    try {
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'book',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        totalChapters: chapterCount,
        downloadedChapters: 0,
        status: 'downloading',
        progressPercent: 0,
      });

      const chapterNumbers = Array.from({ length: chapterCount }, (_, i) => i + 1);
      let downloadedChapters = 0;

      for (let i = 0; i < chapterNumbers.length; i += CHAPTER_BATCH_SIZE) {
        if (controller.signal.aborted) break;

        const batch = chapterNumbers.slice(i, i + CHAPTER_BATCH_SIZE);
        const chapterDataList = await this.fetchChapterBatch(
          versionId,
          versionAbbreviation,
          bookId,
          bookName,
          testament,
          batch,
          controller.signal,
        );

        await BibleOfflineService.saveChapters(chapterDataList);

        for (const ch of chapterDataList) {
          await ChapterCacheService.updateAccessLog(ch.id, versionId, true);
        }

        downloadedChapters += chapterDataList.length;
        const percent = Math.round((downloadedChapters / chapterCount) * 100);

        await BibleOfflineService.updateDownloadProgress(recordId, {
          progressPercent: percent,
          downloadedChapters,
        });

        onProgress?.(percent, downloadedChapters, chapterCount, `Downloading ${bookName}...`);
      }

      if (controller.signal.aborted) return;

      const actualBytes = await BibleOfflineService.estimateBookSize(versionId, bookId);
      await BibleOfflineService.updateDownloadProgress(recordId, {
        status: 'downloaded',
        progressPercent: 100,
        downloadedChapters: chapterCount,
        downloadedAt: new Date().toISOString(),
        estimatedBytes: actualBytes,
        errorMessage: undefined,
      });

      onProgress?.(100, chapterCount, chapterCount, `${bookName} downloaded`);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[DownloadManager] Book download failed:', err);
      await BibleOfflineService.updateDownloadProgress(recordId, {
        status: 'failed',
        errorMessage: err.message || 'Download failed',
      });
      throw err;
    } finally {
      activeAbortControllers.delete(recordId);
    }
  }

  /**
   * Download a single chapter of a book.
   */
  static async downloadChapter({
    versionId,
    versionAbbreviation,
    bookId,
    bookName,
    chapterNumber,
    testament = 'OT',
    onProgress,
  }: {
    versionId: string;
    versionAbbreviation: string;
    bookId: string;
    bookName: string;
    chapterNumber: number;
    testament?: 'OT' | 'NT';
    onProgress?: DownloadProgressCallback;
  }): Promise<void> {
    const recordId = buildChapterDownloadKey(versionId, bookId, chapterNumber);

    // 100 MB Storage Cap Check (~6KB for one chapter)
    const canFit = await StorageManager.canFit(6000);
    if (!canFit) {
      const errMessage = '100 MB storage limit reached. Please delete some downloaded content.';
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'chapter',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        chapterNumber,
        status: 'failed',
        progressPercent: 0,
        errorMessage: errMessage,
      });
      throw new Error(errMessage);
    }

    this.cancelAbort(recordId);
    const controller = new AbortController();
    activeAbortControllers.set(recordId, controller);

    try {
      await BibleOfflineService.setDownloadStatus({
        id: recordId,
        targetType: 'chapter',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        chapterNumber,
        status: 'downloading',
        progressPercent: 30,
      });

      onProgress?.(30, 0, 1, `Downloading ${bookName} ${chapterNumber}...`);

      const batch = await this.fetchChapterBatch(
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        testament,
        [chapterNumber],
        controller.signal,
      );

      if (batch.length === 0) throw new Error('Failed to fetch chapter content');

      await BibleOfflineService.saveChapters(batch);
      await ChapterCacheService.updateAccessLog(batch[0].id, versionId, true);

      await BibleOfflineService.updateDownloadProgress(recordId, {
        status: 'downloaded',
        progressPercent: 100,
        downloadedAt: new Date().toISOString(),
        estimatedBytes: batch[0].verses.reduce((acc, v) => acc + v.text.length, 0) * 2,
        errorMessage: undefined,
      });

      onProgress?.(100, 1, 1, `${bookName} ${chapterNumber} downloaded`);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('[DownloadManager] Chapter download failed:', err);
      await BibleOfflineService.updateDownloadProgress(recordId, {
        status: 'failed',
        errorMessage: err.message || 'Download failed',
      });
      throw err;
    } finally {
      activeAbortControllers.delete(recordId);
    }
  }

  /**
   * Delete a downloaded book (and all its stored chapters).
   */
  static async deleteBook(versionId: string, bookId: string): Promise<void> {
    const recordId = buildBookDownloadKey(versionId, bookId);
    this.cancelAbort(recordId);
    await BibleOfflineService.deleteBookData(versionId, bookId);
  }

  /**
   * Delete a downloaded chapter.
   */
  static async deleteChapter(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<void> {
    const recordId = buildChapterDownloadKey(versionId, bookId, chapterNumber);
    this.cancelAbort(recordId);
    await BibleOfflineService.deleteSingleChapter(versionId, bookId, chapterNumber);
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
      existing.abort();
      activeAbortControllers.delete(recordId);
    }
  }

  private static async fetchChapterBatch(
    versionId: string,
    versionAbbreviation: string,
    bookId: string,
    bookName: string,
    testament: 'OT' | 'NT',
    chapterNumbers: number[],
    signal: AbortSignal,
  ): Promise<OfflineChapterData[]> {
    const results: OfflineChapterData[] = [];

    await Promise.all(
      chapterNumbers.map(async (chapterNum) => {
        if (signal.aborted) return;
        try {
          const res = await fetchWithTimeout(
            `/api/v1/bible/${encodeURIComponent(versionAbbreviation)}/${encodeURIComponent(bookId)}/${chapterNum}`,
            { signal },
          );
          if (!res.ok) return;

          const json = await res.json();
          if (!json.success || !json.data?.verses) return;

          const chapter: OfflineChapterData = {
            id: `${versionId}::${bookId}::${chapterNum}`,
            versionId,
            bookId,
            bookName,
            bookAbbreviation: versionAbbreviation,
            chapterNumber: chapterNum,
            testament,
            verses: json.data.verses as Array<{ number: number; text: string }>,
            cachedAt: new Date().toISOString(),
            isDownloaded: true,
          };
          results.push(chapter);
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            console.warn(
              `[DownloadManager] Failed to fetch ${bookName} ${chapterNum}:`,
              err.message,
            );
          }
        }
      }),
    );

    return results;
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
