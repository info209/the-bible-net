/**
 * StorageManager
 *
 * Provides storage usage estimates and management operations.
 * Ties together ChapterCacheService and BibleOfflineService for
 * the Offline Management screen.
 */

import { BibleOfflineService } from './BibleOfflineService';
import { ChapterCacheService } from './ChapterCacheService';
import { HomeOfflineService } from './HomeOfflineService';
import { PendingActionsService } from './PendingActionsService';
import { getOfflineDB } from './db';
import type { StorageUsageBreakdown } from './types';

export class StorageManager {
  /**
   * Get browser storage quota and usage estimate.
   * Uses the StorageManager API (supported in all modern browsers).
   */
  static async getStorageQuota(): Promise<{ quota: number; usage: number }> {
    try {
      if (typeof navigator !== 'undefined' && 'storage' in navigator) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota ?? 0,
          usage: estimate.usage ?? 0,
        };
      }
    } catch {
      // Ignore
    }
    return { quota: 0, usage: 0 };
  }

  /**
   * Get a breakdown of offline storage usage.
   */
  static async getUsageBreakdown(): Promise<StorageUsageBreakdown> {
    const { quota, usage } = await this.getStorageQuota();

    // Per-version byte estimates
    const allStatuses = await BibleOfflineService.getAllDownloadStatuses();
    const byVersion: Record<string, number> = {};

    for (const status of allStatuses) {
      if (status.status === 'downloaded' || status.status === 'update_available') {
        const bytes =
          status.estimatedBytes ?? (await BibleOfflineService.estimateVersionSize(status.versionId));
        byVersion[status.versionId] = bytes;
      }
    }

    const totalVersionBytes = Object.values(byVersion).reduce((a, b) => a + b, 0);

    // Chapter cache stats (rough estimate: ~2KB per chapter average)
    const cacheStats = await ChapterCacheService.getCacheStats();
    const chapterCacheBytes = cacheStats.unprotectedCount * 2048;

    // Home cache: negligible but estimable
    const homeCacheBytes = 50 * 1024; // ~50KB max

    return {
      totalBytes: usage,
      byVersion,
      chapterCacheBytes,
      homeCacheBytes,
      availableBytes: Math.max(0, quota - usage),
      quotaBytes: quota,
    };
  }

  /**
   * Clear only the LRU chapter cache (preserves downloaded versions).
   */
  static async clearChapterCache(): Promise<void> {
    await ChapterCacheService.clearChapterCache();
  }

  /**
   * Clear all offline data:
   * - Downloaded versions + books + chapters
   * - Chapter cache
   * - Home cache
   * - Pending actions
   * Does NOT clear user preferences.
   */
  static async clearAllOfflineData(): Promise<void> {
    try {
      const db = await getOfflineDB();

      // Clear all Bible data
      await db.clear('bible_versions');
      await db.clear('bible_books');
      await db.clear('bible_chapters');
      await db.clear('chapter_access_log');
      await db.clear('download_status');

      // Clear home cache and pending actions
      await db.clear('home_cache');
      await db.clear('pending_actions');
    } catch (err) {
      console.error('[StorageManager] clearAllOfflineData failed:', err);
      throw err;
    }
  }

  /**
   * Format bytes to human-readable string.
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}
