/**
 * ChapterCacheService
 *
 * Manages the LRU (Least Recently Used) chapter cache.
 * - Automatically evicts old cached chapters when the cache exceeds MAX_CACHED_CHAPTERS.
 * - Protected (downloaded) chapters are never evicted.
 * - Coordinates between bible_chapters and chapter_access_log stores.
 */

import { getOfflineDB, buildChapterKey } from './db';
import { BibleOfflineService } from './BibleOfflineService';
import type { OfflineChapterData, OfflineChapterFootnote, ChapterAccessLog } from './types';

/** Maximum number of LRU-cached chapters (non-downloaded) kept in storage */
const MAX_CACHED_CHAPTERS = 100;

export class ChapterCacheService {
  /**
   * Cache a chapter that was fetched while online.
   * Marks it as NOT a protected download (isDownloaded = false).
   * Updates the access log and triggers eviction if needed.
   */
  static async cacheChapter(
    versionId: string,
    bookId: string,
    bookName: string,
    bookAbbreviation: string,
    chapterNumber: number,
    testament: 'OT' | 'NT',
    verses: Array<{ number: number; text: string }>,
    footnotes?: OfflineChapterFootnote[],
  ): Promise<void> {
    const key = buildChapterKey(versionId, bookId, chapterNumber);

    const chapterData: OfflineChapterData = {
      id: key,
      versionId,
      bookId,
      bookName,
      bookAbbreviation,
      chapterNumber,
      testament,
      verses,
      footnotes,
      cachedAt: new Date().toISOString(),
      isDownloaded: false,
    };

    try {
      await BibleOfflineService.saveChapter(chapterData);
      await this.updateAccessLog(key, versionId, false);
      await this.evictIfNeeded();
    } catch (err) {
      // Non-critical — log and continue. Reading still works from network.
      console.warn('[ChapterCacheService] cacheChapter failed (non-critical):', err);
    }
  }

  /**
   * Retrieve a cached chapter. Also updates the access log (LRU touch).
   * Returns undefined if not in cache.
   */
  static async getCachedChapter(
    versionId: string,
    bookId: string,
    chapterNumber: number,
  ): Promise<OfflineChapterData | undefined> {
    const key = buildChapterKey(versionId, bookId, chapterNumber);
    const chapter = await BibleOfflineService.getChapter(versionId, bookId, chapterNumber);
    if (chapter) {
      // Touch the access log asynchronously (don't await — keeps reads fast)
      this.updateAccessLog(key, versionId, chapter.isDownloaded).catch(() => {});
    }
    return chapter;
  }

  /**
   * Update (or create) the access log entry for a chapter.
   * `isProtected = true` means it was part of a full download and won't be evicted.
   */
  static async updateAccessLog(
    cacheKey: string,
    versionId: string,
    isProtected: boolean,
  ): Promise<void> {
    try {
      const db = await getOfflineDB();
      const entry: ChapterAccessLog = {
        cacheKey,
        versionId,
        lastAccessedAt: Date.now(),
        isProtected,
      };
      await db.put('chapter_access_log', entry);
    } catch {
      // Non-critical
    }
  }

  /**
   * Evict chapters if the LRU cache exceeds MAX_CACHED_CHAPTERS.
   * Only removes unprotected (non-downloaded) chapters.
   */
  static async evictIfNeeded(): Promise<void> {
    try {
      const db = await getOfflineDB();

      // Count unprotected entries
      const allLogs = await db.getAllFromIndex(
        'chapter_access_log',
        'by_last_access',
      );
      const unprotected = allLogs.filter((l) => !l.isProtected);

      if (unprotected.length <= MAX_CACHED_CHAPTERS) return;

      // Sort by lastAccessedAt ascending (oldest first)
      unprotected.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      const toEvict = unprotected.slice(0, unprotected.length - MAX_CACHED_CHAPTERS);

      for (const log of toEvict) {
        // Delete the chapter data
        await db.delete('bible_chapters', log.cacheKey);
        // Delete the access log entry
        await db.delete('chapter_access_log', log.cacheKey);
      }
    } catch (err) {
      console.warn('[ChapterCacheService] eviction failed (non-critical):', err);
    }
  }

  /**
   * Evict chapters until the count is at or below targetCount.
   * Used by StorageManager for manual cache clearing.
   */
  static async evictLRUChapters(targetCount: number = 0): Promise<void> {
    try {
      const db = await getOfflineDB();
      const allLogs = await db.getAllFromIndex('chapter_access_log', 'by_last_access');
      const unprotected = allLogs
        .filter((l) => !l.isProtected)
        .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      const toEvict =
        targetCount === 0
          ? unprotected
          : unprotected.slice(0, Math.max(0, unprotected.length - targetCount));

      for (const log of toEvict) {
        await db.delete('bible_chapters', log.cacheKey);
        await db.delete('chapter_access_log', log.cacheKey);
      }
    } catch (err) {
      console.warn('[ChapterCacheService] evictLRUChapters failed:', err);
    }
  }

  /**
   * Get the current LRU cache stats.
   */
  static async getCacheStats(): Promise<{
    totalCached: number;
    protectedCount: number;
    unprotectedCount: number;
  }> {
    try {
      const db = await getOfflineDB();
      const allLogs = await db.getAll('chapter_access_log');
      const protectedCount = allLogs.filter((l) => l.isProtected).length;
      return {
        totalCached: allLogs.length,
        protectedCount,
        unprotectedCount: allLogs.length - protectedCount,
      };
    } catch {
      return { totalCached: 0, protectedCount: 0, unprotectedCount: 0 };
    }
  }

  /**
   * Clear all unprotected (LRU) cached chapters.
   * Protected (downloaded) chapters are preserved.
   */
  static async clearChapterCache(): Promise<void> {
    await this.evictLRUChapters(0);
  }
}
