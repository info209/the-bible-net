/**
 * Offline module public API
 *
 * Re-exports all services, hooks, and types for convenient importing.
 * Usage: import { BibleOfflineService, useNetworkStatus } from '@/lib/offline';
 */

export { getOfflineDB, buildChapterKey, closeOfflineDB } from './db';
export type { BibleNetOfflineDB } from './db';

export { BibleOfflineService } from './BibleOfflineService';
export { ChapterCacheService } from './ChapterCacheService';
export { HomeOfflineService } from './HomeOfflineService';
export { PendingActionsService } from './PendingActionsService';
export { DownloadManager } from './DownloadManager';
export type { DownloadProgressCallback } from './DownloadManager';
export { SyncService } from './SyncService';
export { StorageManager } from './StorageManager';

export { useNetworkStatus } from './useNetworkStatus';
export { NetworkStatusProvider, useNetworkStatusContext } from './NetworkStatusContext';

export { fetchChapterWithOfflineFallback, fetchVersionsWithOfflineFallback } from './queryOfflineFallback';

export type {
  DownloadStatus,
  VersionDownloadRecord,
  OfflineVerseData,
  OfflineChapterData,
  OfflineBookData,
  OfflineVersionData,
  ChapterAccessLog,
  HomeCacheKey,
  HomeCacheEntry,
  OfflineUserPreferences,
  PendingActionType,
  PendingAction,
  StorageUsageBreakdown,
  NetworkStatus,
  SyncStatus,
  SyncState,
} from './types';
