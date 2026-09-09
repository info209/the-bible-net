/**
 * HomeOfflineService
 *
 * Persists and retrieves home-screen content (daily verse, devotional,
 * reading plans, versions list) and user preferences from IndexedDB.
 */

import { getOfflineDB } from './db';
import type { HomeCacheKey, HomeCacheEntry, OfflineUserPreferences } from './types';

export class HomeOfflineService {
  // -------------------------------------------------------------------------
  // Home Content Cache
  // -------------------------------------------------------------------------

  /**
   * Save any home-screen data to the cache.
   * @param key   - One of the HomeCacheKey values
   * @param data  - The raw API response data to persist
   */
  static async saveHomeCache(key: HomeCacheKey, data: unknown): Promise<void> {
    try {
      const db = await getOfflineDB();
      const entry: HomeCacheEntry = {
        key,
        data,
        syncedAt: new Date().toISOString(),
      };
      await db.put('home_cache', entry);
    } catch (err) {
      // Non-critical — online reading still works
      console.warn('[HomeOfflineService] saveHomeCache failed (non-critical):', err);
    }
  }

  /**
   * Retrieve cached home-screen content.
   * Returns undefined if nothing is cached for this key.
   */
  static async getHomeCache(key: HomeCacheKey): Promise<HomeCacheEntry | undefined> {
    try {
      const db = await getOfflineDB();
      return await db.get('home_cache', key);
    } catch {
      return undefined;
    }
  }

  /**
   * Clear all home cache entries.
   */
  static async clearHomeCache(): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.clear('home_cache');
    } catch (err) {
      console.warn('[HomeOfflineService] clearHomeCache failed:', err);
    }
  }

  /**
   * Retrieve daily content list specifically, with fallback across keys and format normalization.
   */
  static async getDailyContentList(): Promise<any[] | undefined> {
    const primary = await this.getHomeCache('daily_content_list');
    if (primary?.data && Array.isArray(primary.data) && primary.data.length > 0) {
      return primary.data;
    }
    const fallback = await this.getHomeCache('daily_verse');
    if (fallback?.data) {
      if (Array.isArray(fallback.data) && fallback.data.length > 0) {
        return fallback.data;
      } else if (typeof fallback.data === 'object' && fallback.data !== null) {
        return [fallback.data];
      }
    }
    return undefined;
  }

  /**
   * Update like status in cached daily content list so offline app restarts preserve like state.
   */
  static async updateLikeInDailyCache(
    contentId: string,
    contentType: string,
    liked: boolean,
    likeCount: number,
  ): Promise<void> {
    try {
      const db = await getOfflineDB();
      const isVerse = contentType === 'daily-verse' || contentType === 'verse';
      const likeCountField = isVerse ? 'verseLikeCount' : 'devotionLikeCount';
      const isLikedField = isVerse ? 'isVerseLiked' : 'isDevotionLiked';

      const updateKey = async (key: string) => {
        const entry = await db.get('home_cache', key);
        if (entry?.data && Array.isArray(entry.data)) {
          const updated = entry.data.map((item: any) => {
            if (String(item._id) === String(contentId) || String(item.id) === String(contentId)) {
              return {
                ...item,
                [likeCountField]: likeCount,
                [isLikedField]: liked,
              };
            }
            return item;
          });
          await db.put('home_cache', { ...entry, data: updated, syncedAt: new Date().toISOString() });
        }
      };

      await updateKey('daily_content_list');
      await updateKey('daily_verse');
    } catch (err) {
      console.warn('[HomeOfflineService] updateLikeInDailyCache failed:', err);
    }
  }

  // -------------------------------------------------------------------------
  // User Preferences
  // -------------------------------------------------------------------------

  /**
   * Save user preferences (theme, font, preferred version, etc.)
   * Merges with any existing saved preferences.
   */
  static async savePreferences(prefs: Partial<OfflineUserPreferences>): Promise<void> {
    try {
      const db = await getOfflineDB();
      const existing = await db.get('user_preferences', 'prefs');
      const merged: OfflineUserPreferences & { key: 'prefs' } = {
        ...(existing ?? {}),
        ...prefs,
        key: 'prefs',
      };
      await db.put('user_preferences', merged);
    } catch (err) {
      console.warn('[HomeOfflineService] savePreferences failed (non-critical):', err);
    }
  }

  /**
   * Retrieve stored user preferences.
   * Returns empty object if nothing is stored.
   */
  static async getPreferences(): Promise<OfflineUserPreferences> {
    try {
      const db = await getOfflineDB();
      const stored = await db.get('user_preferences', 'prefs');
      if (!stored) return {};
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { key, ...prefs } = stored;
      return prefs;
    } catch {
      return {};
    }
  }

  /**
   * Clear stored user preferences.
   */
  static async clearPreferences(): Promise<void> {
    try {
      const db = await getOfflineDB();
      await db.delete('user_preferences', 'prefs');
    } catch {
      // Ignore
    }
  }
}
