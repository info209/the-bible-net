/**
 * ModuleOfflineService
 *
 * Universal key-value dataset cache helper for app modules (Home, Bible Reader,
 * Saved Verses, Saved Items, Likes, Community Prayers, Journals, Reading Plans).
 * Backed by IndexedDB `home_cache` objectStore.
 */

import { getOfflineDB } from './db';
import type { HomeCacheEntry } from './types';

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
}
