/**
 * Offline Reading System — TypeScript Types
 *
 * All entity shapes stored in IndexedDB, plus enums/unions used
 * by the offline service layer.
 */

// ---------------------------------------------------------------------------
// Download Status
// ---------------------------------------------------------------------------

export type DownloadStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'update_available'
  | 'failed'
  | 'paused';

export interface VersionDownloadRecord {
  /** Matches the Bible version's _id (MongoDB ObjectId string) */
  versionId: string;
  versionAbbreviation: string;
  versionName: string;
  language: string;
  status: DownloadStatus;
  /** 0–100 */
  progressPercent: number;
  /** ISO timestamp of when the download completed */
  downloadedAt?: string;
  /** ISO timestamp of last server-side version check */
  lastCheckedAt?: string;
  /** Estimated bytes stored for this version */
  estimatedBytes?: number;
  /** Total chapters in this version (for progress calculation) */
  totalChapters?: number;
  /** Chapters downloaded so far */
  downloadedChapters?: number;
  /** The chapter number (within the book) where we paused */
  pausedAtBookId?: string;
  pausedAtChapter?: number;
  /** Error message when status === 'failed' */
  errorMessage?: string;
}

// ---------------------------------------------------------------------------
// Bible Content
// ---------------------------------------------------------------------------

export interface OfflineVerseData {
  number: number;
  text: string;
}

export interface OfflineChapterData {
  /** Composite key: `${versionId}::${bookId}::${chapterNumber}` */
  id: string;
  versionId: string;
  bookId: string;
  bookName: string;
  bookAbbreviation: string;
  chapterNumber: number;
  testament: 'OT' | 'NT';
  verses: OfflineVerseData[];
  /** ISO timestamp when cached */
  cachedAt: string;
  /** Whether this chapter was saved as part of a full version download (not just LRU cache) */
  isDownloaded: boolean;
}

export interface OfflineBookData {
  /** MongoDB _id */
  id: string;
  versionId: string;
  name: string;
  abbreviation: string;
  englishName?: string;
  order: number;
  testament: 'OT' | 'NT';
  chapterCount: number;
}

export interface OfflineVersionData {
  /** MongoDB _id */
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  isActive: boolean;
  /** ISO timestamp from server — used to detect `update_available` */
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Chapter Access Log (for LRU eviction)
// ---------------------------------------------------------------------------

export interface ChapterAccessLog {
  /** Same composite key as OfflineChapterData.id */
  cacheKey: string;
  versionId: string;
  /** Unix timestamp (ms) of last access */
  lastAccessedAt: number;
  /** Whether this entry is protected (part of a full download) */
  isProtected: boolean;
}

// ---------------------------------------------------------------------------
// Home Content Cache
// ---------------------------------------------------------------------------

export type HomeCacheKey =
  | 'daily_verse'
  | 'daily_devotional'
  | 'reading_plans'
  | 'bible_versions'
  | 'user_preferences';

export interface HomeCacheEntry {
  key: HomeCacheKey;
  /** The cached payload — matches the API response shape */
  data: unknown;
  /** ISO timestamp when this was last synced from the server */
  syncedAt: string;
}

export interface OfflineUserPreferences {
  preferredVersionId?: string;
  preferredVersionName?: string;
  theme?: 'light' | 'sepia' | 'cream' | 'dark';
  font?: string;
  fontSize?: number;
  pageTransition?: 'slide' | 'curl' | 'fade' | 'scroll';
}

// ---------------------------------------------------------------------------
// Pending Actions Queue
// ---------------------------------------------------------------------------

export type PendingActionType =
  | 'save_verse'
  | 'delete_verse'
  | 'add_highlight'
  | 'remove_highlight'
  | 'add_note'
  | 'save_reading_progress'
  | 'add_journal'
  | 'add_prayer'
  | 'save_item'
  | 'delete_item';

export interface PendingAction {
  /** UUID v4 */
  id: string;
  type: PendingActionType;
  /** The request payload to send when back online */
  payload: Record<string, unknown>;
  /** HTTP method to use: POST | DELETE | PATCH */
  method: 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  /** The API endpoint (relative, e.g. '/api/user/reading-progress') */
  endpoint: string;
  /** ISO timestamp when queued */
  createdAt: string;
  /** Number of failed sync attempts */
  retryCount: number;
  /** ISO timestamp of last retry */
  lastAttemptAt?: string;
  /** Error from last attempt */
  lastError?: string;
}

// ---------------------------------------------------------------------------
// Storage Estimation
// ---------------------------------------------------------------------------

export interface StorageUsageBreakdown {
  /** Total bytes used across all offline data */
  totalBytes: number;
  /** Bytes used by downloaded Bible versions (map: versionId → bytes) */
  byVersion: Record<string, number>;
  /** Bytes used by LRU chapter cache (non-downloaded) */
  chapterCacheBytes: number;
  /** Bytes used by home cache */
  homeCacheBytes: number;
  /** Available quota reported by browser */
  availableBytes: number;
  /** Total quota reported by browser */
  quotaBytes: number;
}

// ---------------------------------------------------------------------------
// Network Status
// ---------------------------------------------------------------------------

export interface NetworkStatus {
  isOnline: boolean;
  /** True if connection type is 2g or slow-2g */
  isSlowConnection: boolean;
  /** True if user was offline and just came back online */
  wasOffline: boolean;
}

// ---------------------------------------------------------------------------
// Sync Status
// ---------------------------------------------------------------------------

export type SyncState = 'idle' | 'syncing' | 'success' | 'failed';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt?: string;
  pendingActionsCount: number;
  errorMessage?: string;
}
