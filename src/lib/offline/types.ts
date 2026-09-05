/**
 * Offline Reading System — TypeScript Types
 *
 * All entity shapes stored in IndexedDB, plus enums/unions used
 * by the offline service layer.
 */

// ---------------------------------------------------------------------------
// Download Status & Record
// ---------------------------------------------------------------------------

export type DownloadStatus =
  | 'not_downloaded'
  | 'downloading'
  | 'downloaded'
  | 'update_available'
  | 'failed'
  | 'paused';

export type DownloadTargetType = 'book' | 'chapter' | 'version';

export interface DownloadRecord {
  /**
   * Primary key:
   * - Book: `${versionId}::${bookId}`
   * - Chapter: `${versionId}::${bookId}::${chapterNumber}`
   * - Version: `${versionId}`
   */
  id: string;
  targetType: DownloadTargetType;
  versionId: string;
  versionAbbreviation: string;
  versionName?: string;
  language?: string;
  bookId?: string;
  bookName?: string;
  chapterNumber?: number;
  status: DownloadStatus;
  /** 0–100 */
  progressPercent: number;
  /** ISO timestamp of when the download completed */
  downloadedAt?: string;
  /** ISO timestamp of last server-side check */
  lastCheckedAt?: string;
  /** Estimated bytes stored for this item */
  estimatedBytes?: number;
  /** Total chapters for book/version download */
  totalChapters?: number;
  /** Chapters downloaded so far */
  downloadedChapters?: number;
  /** Total books for version download */
  totalBooks?: number;
  /** Books downloaded so far */
  downloadedBooks?: number;
  /** Error message when status === 'failed' */
  errorMessage?: string;
}

/** Backward compatibility alias */
export type VersionDownloadRecord = DownloadRecord;

// ---------------------------------------------------------------------------
// Bible Content
// ---------------------------------------------------------------------------

export interface OfflineVerseData {
  number: number;
  text: string;
  footnotes?: Array<any>;
}

export interface OfflineChapterFootnote {
  id?: string;
  verseNumber: number;
  text: string;
  reference?: string;
  marker?: string;
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
  footnotes?: OfflineChapterFootnote[];
  /** ISO timestamp when cached */
  cachedAt: string;
  /** Whether this chapter was saved as part of an explicit download */
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
  updatedAt?: string;
  downloadedAt?: string;
  totalChapters?: number;
  totalBooks?: number;
  estimatedBytes?: number;
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
  /** Whether this entry is protected (part of an explicit book/chapter/version download) */
  isProtected: boolean;
}

// ---------------------------------------------------------------------------
// Home Content Cache
// ---------------------------------------------------------------------------

export type HomeCacheKey = string;

export interface HomeCacheEntry {
  key: string;
  data: unknown;
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
  | 'edit_note'
  | 'delete_note'
  | 'save_reading_progress'
  | 'add_journal'
  | 'edit_journal'
  | 'delete_journal'
  | 'toggle_journal_pin'
  | 'toggle_journal_bookmark'
  | 'add_prayer'
  | 'edit_prayer'
  | 'delete_prayer'
  | 'toggle_prayer_pin'
  | 'toggle_prayer_bookmark'
  | 'intercede_prayer'
  | 'save_item'
  | 'delete_item'
  | 'save_plan'
  | 'complete_plan_item'
  | 'rate_plan'
  | 'like_content'
  | 'unlike_content'
  | 'add_comment'
  | 'delete_comment';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  payload: Record<string, unknown>;
  method: 'POST' | 'DELETE' | 'PATCH' | 'PUT';
  endpoint: string;
  createdAt: string;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  userId?: string;
  clientMutationId?: string;
  entityTempId?: string;
  entityType?: 'journal' | 'prayer' | 'comment' | 'like' | 'verse' | 'note' | 'highlight' | 'item' | 'plan';
}

// ---------------------------------------------------------------------------
// Storage Estimation (100 MB Max Cap)
// ---------------------------------------------------------------------------

export interface StorageUsageBreakdown {
  /** Total bytes used by offline Bible data & cache */
  totalBytes: number;
  /** Hard cap limit in bytes (100 MB) */
  maxCapBytes: number;
  /** Usage by downloaded versions (map: `${versionId}` -> bytes) */
  byVersion: Record<string, number>;
  /** Usage by downloaded books (backward compatibility map: `${versionId}::${bookId}` -> bytes) */
  byBook?: Record<string, number>;
  /** Usage by LRU chapter cache */
  chapterCacheBytes: number;
  /** Usage by home cache */
  homeCacheBytes: number;
  /** Available bytes remaining under the 100 MB cap */
  availableCapBytes: number;
}

// ---------------------------------------------------------------------------
// Network & Sync Status
// ---------------------------------------------------------------------------

export interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  wasOffline: boolean;
}

export type SyncState = 'idle' | 'syncing' | 'success' | 'failed';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt?: string;
  pendingActionsCount: number;
  errorMessage?: string;
}
