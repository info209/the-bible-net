/**
 * OfflineDB — IndexedDB database foundation
 *
 * Database name: bible-net-offline
 * Current version: 2 (Upgraded download_status keyPath to 'id')
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';
import type {
  OfflineVersionData,
  OfflineBookData,
  OfflineChapterData,
  ChapterAccessLog,
  DownloadRecord,
  HomeCacheEntry,
  HomeCacheKey,
  PendingAction,
  OfflineUserPreferences,
} from './types';

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
      by_downloaded: number;
    };
  };
  chapter_access_log: {
    key: string;
    value: ChapterAccessLog;
    indexes: {
      by_last_access: number;
      by_version: string;
    };
  };
  download_status: {
    key: string; // `${versionId}::${bookId}` or `${versionId}::${bookId}::${chapterNumber}` or `${versionId}`
    value: DownloadRecord;
    indexes: {
      by_version: string;
      by_target_type: string;
    };
  };
  home_cache: {
    key: HomeCacheKey;
    value: HomeCacheEntry;
  };
  pending_actions: {
    key: string;
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

const DB_NAME = 'bible-net-offline';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<BibleNetOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<BibleNetOfflineDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in a server environment'));
  }

  if (!dbPromise) {
    dbPromise = openDB<BibleNetOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        if (oldVersion < 1) {
          const versionsStore = db.createObjectStore('bible_versions', { keyPath: 'id' });
          versionsStore.createIndex('by_abbreviation', 'abbreviation', { unique: false });

          const booksStore = db.createObjectStore('bible_books', { keyPath: 'id' });
          booksStore.createIndex('by_version', 'versionId', { unique: false });
          booksStore.createIndex('by_version_order', ['versionId', 'order'], { unique: false });

          const chaptersStore = db.createObjectStore('bible_chapters', { keyPath: 'id' });
          chaptersStore.createIndex('by_version', 'versionId', { unique: false });
          chaptersStore.createIndex('by_version_book', ['versionId', 'bookId'], { unique: false });
          chaptersStore.createIndex('by_downloaded', 'isDownloaded', { unique: false });

          const logStore = db.createObjectStore('chapter_access_log', { keyPath: 'cacheKey' });
          logStore.createIndex('by_last_access', 'lastAccessedAt', { unique: false });
          logStore.createIndex('by_version', 'versionId', { unique: false });

          const dsStore = db.createObjectStore('download_status', { keyPath: 'id' });
          dsStore.createIndex('by_version', 'versionId', { unique: false });
          dsStore.createIndex('by_target_type', 'targetType', { unique: false });

          db.createObjectStore('home_cache', { keyPath: 'key' });

          const actionsStore = db.createObjectStore('pending_actions', { keyPath: 'id' });
          actionsStore.createIndex('by_created_at', 'createdAt', { unique: false });
          actionsStore.createIndex('by_type', 'type', { unique: false });

          db.createObjectStore('user_preferences', { keyPath: 'key' });
        }

        if (oldVersion < 2) {
          // Re-create download_status store if keyPath was versionId
          if (db.objectStoreNames.contains('download_status')) {
            db.deleteObjectStore('download_status');
          }
          const dsStore = db.createObjectStore('download_status', { keyPath: 'id' });
          dsStore.createIndex('by_version', 'versionId', { unique: false });
          dsStore.createIndex('by_target_type', 'targetType', { unique: false });
        }
      },

      blocked() {
        console.warn('[OfflineDB] Database upgrade blocked — close other tabs using the app');
      },

      blocking() {
        dbPromise = null;
      },

      terminated() {
        dbPromise = null;
      },
    }).catch((err) => {
      dbPromise = null;
      console.error('[OfflineDB] Failed to open database:', err);
      throw err;
    });
  }

  return dbPromise;
}

export function buildChapterKey(
  versionId: string,
  bookId: string,
  chapterNumber: number,
): string {
  return `${versionId}::${bookId}::${chapterNumber}`;
}

export function buildBookDownloadKey(versionId: string, bookId: string): string {
  return `${versionId}::${bookId}`;
}

export function buildChapterDownloadKey(
  versionId: string,
  bookId: string,
  chapterNumber: number,
): string {
  return `${versionId}::${bookId}::${chapterNumber}`;
}

export function buildVersionDownloadKey(versionId: string): string {
  return versionId;
}

export function closeOfflineDB(): void {
  dbPromise = null;
}
