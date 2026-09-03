/**
 * StorageManager
 *
 * Provides storage usage estimates and management operations under
 * a strict 100 MB maximum cap for offline Bible content.
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ChapterCacheService } from './ChapterCacheService';
import { getOfflineDB } from './db';
import type { StorageUsageBreakdown } from './types';

/** Hard cap for offline Bible content: 100 MB (in bytes) */
export const MAX_STORAGE_BYTES = 100 * 1024 * 1024;
export const MAX_STORAGE_MB = 100;

export class StorageManager {
  /**
   * Get a breakdown of offline storage usage against the 100 MB cap.
   */
  static async getUsageBreakdown(): Promise<StorageUsageBreakdown> {
    const allStatuses = await BibleOfflineService.getAllDownloadStatuses();
    const byVersion: Record<string, number> = {};
    const byBook: Record<string, number> = {};

    for (const status of allStatuses) {
      if (status.status === 'downloaded') {
        if (status.targetType === 'version' || !status.targetType) {
          const bytes =
            status.estimatedBytes ??
            (await BibleOfflineService.estimateVersionSize(status.versionId));
          byVersion[status.versionId] = bytes;
        } else if (status.targetType === 'book' && status.bookId) {
          const bytes =
            status.estimatedBytes ??
            (await BibleOfflineService.estimateBookSize(status.versionId, status.bookId));
          byBook[status.id] = bytes;
        }
      }
    }

    const cacheStats = await ChapterCacheService.getCacheStats();
    const chapterCacheBytes = cacheStats.unprotectedCount * 2048; // ~2KB per cached chapter
    const homeCacheBytes = 50 * 1024; // ~50KB for home data

    const totalVersionBytes = Object.values(byVersion).reduce((a, b) => a + b, 0);
    const totalBookBytes = Object.values(byBook).reduce((a, b) => a + b, 0);
    const totalBytes = totalVersionBytes + totalBookBytes + chapterCacheBytes + homeCacheBytes;

    return {
      totalBytes,
      maxCapBytes: MAX_STORAGE_BYTES,
      byVersion,
      byBook,
      chapterCacheBytes,
      homeCacheBytes,
      availableCapBytes: Math.max(0, MAX_STORAGE_BYTES - totalBytes),
    };
  }

  /**
   * Check if adding `additionalBytes` will fit under the 100 MB limit and browser storage quota.
   */
  static async canFit(additionalBytes: number): Promise<boolean> {
    const breakdown = await this.getUsageBreakdown();
    if (breakdown.totalBytes + additionalBytes > MAX_STORAGE_BYTES) {
      return false;
    }

    // Check browser storage quota if available
    try {
      if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota !== undefined && estimate.usage !== undefined) {
          const remainingQuota = estimate.quota - estimate.usage;
          if (remainingQuota < additionalBytes) {
            return false;
          }
        }
      }
    } catch {
      // Non-critical if browser quota estimation fails
    }

    return true;
  }

  /**
   * Clear only the LRU chapter cache (preserves explicitly downloaded books/chapters).
   */
  static async clearChapterCache(): Promise<void> {
    await ChapterCacheService.clearChapterCache();
  }

  /**
   * Clear all offline data (downloads, cache, pending actions).
   */
  static async clearAllOfflineData(): Promise<void> {
    try {
      const db = await getOfflineDB();

      await db.clear('bible_versions');
      await db.clear('bible_books');
      await db.clear('bible_chapters');
      await db.clear('chapter_access_log');
      await db.clear('download_status');
      await db.clear('home_cache');
      await db.clear('pending_actions');
    } catch (err) {
      console.error('[StorageManager] clearAllOfflineData failed:', err);
      throw err;
    }
  }

  /**
   * Format bytes to human-readable string (e.g. "4.2 MB").
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
