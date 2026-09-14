/**
 * ModuleOfflineService
 *
 * Universal key-value dataset cache helper for app modules (Home, Bible Reader,
 * Saved Verses, Saved Items, Likes, Community Prayers, Journals, Reading Plans).
 * Backed by IndexedDB `home_cache` objectStore.
 */

import { getOfflineDB } from './db';
import type { HomeCacheEntry } from './types';

/**
 * Cache keys that are always user-specific (not scoped by userId in the key itself).
 * These must be deleted on every logout regardless of who logged out.
 */
const USER_SCOPED_FIXED_KEYS = [
  'journals_user',
  'prayers_personal',
  // Library plan tabs — all user-enrolled plan lists
  'library_plans_my-plans',
  'library_plans_saved',
  'library_plans_completed',
  'library_plans_find-plans',
];

export class ModuleOfflineService {
  /**
   * Save a module dataset to IndexedDB cache.
   */
  static async saveCache<T>(key: string, data: T): Promise<void> {
    try {
      const db = await getOfflineDB();
      const entry: HomeCacheEntry = {
        key,
        data,
        syncedAt: new Date().toISOString(),
      };
      await db.put('home_cache', entry);
    } catch (err) {
      console.error(`[ModuleOfflineService] saveCache failed for ${key}:`, err);
    }
  }

  /**
   * Retrieve a module dataset from IndexedDB cache.
   */
  static async getCache<T>(key: string): Promise<T | undefined> {
    try {
      const db = await getOfflineDB();
      const entry = await db.get('home_cache', key);
      return entry ? (entry.data as T) : undefined;
    } catch (err) {
      console.error(`[ModuleOfflineService] getCache failed for ${key}:`, err);
      return undefined;
    }
  }

  /**
   * Delete a module dataset from IndexedDB cache.
   */
  static async deleteCache(key: string): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.delete('home_cache', key);
    } catch (err) {
      console.error(`[ModuleOfflineService] deleteCache failed for ${key}:`, err);
    }
  }

  /**
   * Clear all user-specific cache entries from IndexedDB on logout.
   *
   * Removes:
   *  - Journals & Prayers (fixed keys: `journals_user`, `prayers_personal`)
   *  - Library enrolled plan lists (`library_plans_*`)
   *  - All keys suffixed with the userId: saved verses, saved items, notes,
   *    reading progress, labels — if `userId` is provided.
   *
   * Does NOT remove:
   *  - Bible versions/books (`bible_books_*`, `bible_versions`)
   *  - Public plan catalog (`find_plans_*`)
   *  - Ambient music tracks (`ambient_music_tracks`, `ambient_audio_*`)
   *  - Downloaded Bible chapter data (in `bible_chapters` / `download_status` stores)
   */
  static async clearUserData(userId?: string): Promise<void> {
    try {
      const db = await getOfflineDB();

      // 1. Delete all known fixed user-scoped keys
      const fixedDeletes = USER_SCOPED_FIXED_KEYS.map((key) =>
        db.delete('home_cache', key).catch(() => {}),
      );
      await Promise.all(fixedDeletes);

      // 2. Delete userId-suffixed keys if we know who logged out
      if (userId) {
        const userSuffixedKeys = [
          `saved_verses_${userId}`,
          `user_labels_${userId}`,
          `saved_items_${userId}`,
          `reading_progress_${userId}`,
          `user_notes_${userId}`,
          `notes_${userId}`,
        ];
        const userDeletes = userSuffixedKeys.map((key) =>
          db.delete('home_cache', key).catch(() => {}),
        );
        await Promise.all(userDeletes);
      }
    } catch (err) {
      console.error('[ModuleOfflineService] clearUserData failed:', err);
    }
  }
}
