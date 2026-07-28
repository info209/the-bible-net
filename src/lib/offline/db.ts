/**
 * OfflineDB — IndexedDB database foundation
 *
 * Uses the `idb` library for a clean, Promise-based, TypeScript-typed API.
 * Implements schema versioning with proper migrations.
 *
 * Database name: bible-net-offline
 * Current version: 1
 *
 * Stores:
 *  - bible_versions        (metadata for each Bible version)
 *  - bible_books           (books per version)
 *  - bible_chapters        (chapter content with verses, LRU-cached + downloaded)
 *  - chapter_access_log    (LRU tracking)
 *  - download_status       (per-version download progress/state)
 *  - home_cache            (daily verse, devotional, plans, etc.)
 *  - pending_actions       (offline write queue)
 *  - user_preferences      (local user settings)
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type {
  OfflineVersionData,
  OfflineBookData,
  OfflineChapterData,
  ChapterAccessLog,
  VersionDownloadRecord,
  HomeCacheEntry,
  HomeCacheKey,
  PendingAction,
  OfflineUserPreferences,
} from './types';

// ---------------------------------------------------------------------------
// DB Schema definition (for idb's TypeScript generics)
// ---------------------------------------------------------------------------

export interface BibleNetOfflineDB extends DBSchema {
  bible_versions: {
    key: string;
    value: OfflineVersionData;
    indexes: { by_abbreviation: string };
  };
  bible_books: {
    key: string;
    value: OfflineBookData;
    indexes: {
      by_version: string;
      by_version_order: [string, number];
    };
  };
  bible_chapters: {
    key: string; // composite: `${versionId}::${bookId}::${chapterNumber}`
    value: OfflineChapterData;
    indexes: {
      by_version: string;
      by_version_book: [string, string];
      by_downloaded: number; // 0 or 1 (boolean stored as number for IDB compat)
    };
  };
  chapter_access_log: {
    key: string; // same as OfflineChapterData.id
    value: ChapterAccessLog;
    indexes: {
      by_last_access: number;
      by_version: string;
    };
  };
  download_status: {
    key: string; // versionId
    value: VersionDownloadRecord;
  };
  home_cache: {
    key: HomeCacheKey;
    value: HomeCacheEntry;
  };
  pending_actions: {
    key: string; // UUID
    value: PendingAction;
    indexes: {
      by_created_at: string;
      by_type: string;
    };
  };
  user_preferences: {
    key: 'prefs';
    value: OfflineUserPreferences & { key: 'prefs' };
  };
}

// ---------------------------------------------------------------------------
// Singleton DB instance
// ---------------------------------------------------------------------------

const DB_NAME = 'bible-net-offline';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BibleNetOfflineDB>> | null = null;

/**
 * Opens (or returns the cached) IndexedDB connection.
 * Safe to call multiple times — returns the same promise.
 */
export function getOfflineDB(): Promise<IDBPDatabase<BibleNetOfflineDB>> {
  if (typeof window === 'undefined') {
    // Server-side: return a rejected promise; callers must guard with isClient checks
    return Promise.reject(new Error('IndexedDB is not available in a server environment'));
  }

  if (!dbPromise) {
    dbPromise = openDB<BibleNetOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // ---------------------------------------------------------------
        // Version 1 — initial schema
        // ---------------------------------------------------------------
        if (oldVersion < 1) {
          // bible_versions
          const versionsStore = db.createObjectStore('bible_versions', {
            keyPath: 'id',
          });
          versionsStore.createIndex('by_abbreviation', 'abbreviation', { unique: false });

          // bible_books
          const booksStore = db.createObjectStore('bible_books', {
            keyPath: 'id',
          });
          booksStore.createIndex('by_version', 'versionId', { unique: false });
          booksStore.createIndex('by_version_order', ['versionId', 'order'], { unique: false });

          // bible_chapters
          const chaptersStore = db.createObjectStore('bible_chapters', {
            keyPath: 'id',
          });
          chaptersStore.createIndex('by_version', 'versionId', { unique: false });
          chaptersStore.createIndex('by_version_book', ['versionId', 'bookId'], { unique: false });
          chaptersStore.createIndex('by_downloaded', 'isDownloaded', { unique: false });

          // chapter_access_log
          const logStore = db.createObjectStore('chapter_access_log', {
            keyPath: 'cacheKey',
          });
          logStore.createIndex('by_last_access', 'lastAccessedAt', { unique: false });
          logStore.createIndex('by_version', 'versionId', { unique: false });

          // download_status
          db.createObjectStore('download_status', { keyPath: 'versionId' });

          // home_cache
          db.createObjectStore('home_cache', { keyPath: 'key' });

          // pending_actions
          const actionsStore = db.createObjectStore('pending_actions', {
            keyPath: 'id',
          });
          actionsStore.createIndex('by_created_at', 'createdAt', { unique: false });
          actionsStore.createIndex('by_type', 'type', { unique: false });

          // user_preferences
          db.createObjectStore('user_preferences', { keyPath: 'key' });
        }

        // Future schema migrations go here as `if (oldVersion < N)` blocks
      },

      blocked() {
        console.warn('[OfflineDB] Database upgrade blocked — close other tabs using the app');
      },

      blocking() {
        // Another tab is trying to upgrade; close gracefully
        dbPromise = null;
      },

      terminated() {
        // Browser killed the connection; reset so next call reopens it
        dbPromise = null;
        console.warn('[OfflineDB] Connection terminated by browser');
      },
    }).catch((err) => {
      // Reset so subsequent calls retry opening
      dbPromise = null;
      console.error('[OfflineDB] Failed to open database:', err);
      throw err;
    });
  }

  return dbPromise;
}

/**
 * Utility: build the composite chapter key used as IndexedDB primary key.
 */
export function buildChapterKey(
  versionId: string,
  bookId: string,
  chapterNumber: number,
): string {
  return `${versionId}::${bookId}::${chapterNumber}`;
}

/**
 * Safely close the DB (used in tests / hot-reload scenarios).
 */
export function closeOfflineDB(): void {
  dbPromise = null;
}
