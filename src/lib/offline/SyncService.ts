/**
 * SyncService
 *
 * Orchestrates background synchronization when connectivity returns.
 * - Replays pending write actions against server APIs in FIFO order
 * - Refreshes home content (daily verse, devotional, plans)
 * - Checks for Bible version updates
 * - Dispatches 'bible-sync-completed' event so client caches update
 */

import { PendingActionsService } from './PendingActionsService';
import { HomeOfflineService } from './HomeOfflineService';
import { ModuleOfflineService } from './ModuleOfflineService';
import { BibleOfflineService } from './BibleOfflineService';
import type { SyncStatus, SyncState } from './types';

type SyncStatusListener = (status: SyncStatus) => void;

/** Module-level sync state (not stored in IndexedDB — resets on page load) */
let currentSyncStatus: SyncStatus = {
  state: 'idle',
  pendingActionsCount: 0,
};

const listeners: Set<SyncStatusListener> = new Set();

function emitStatus(patch: Partial<SyncStatus>): void {
  currentSyncStatus = { ...currentSyncStatus, ...patch };
  listeners.forEach((fn) => {
    try {
      fn(currentSyncStatus);
    } catch (e) {
      console.error('[SyncService] listener error:', e);
    }
  });
}

export class SyncService {
  /** Initialize pending action listener */
  static init(): void {
    PendingActionsService.onCountChange((count) => {
      emitStatus({ pendingActionsCount: count });
    });
  }

  /** Subscribe to sync status updates */
  static onStatusChange(listener: SyncStatusListener): () => void {
    listeners.add(listener);
    listener(currentSyncStatus);
    return () => listeners.delete(listener);
  }

  /** Get current sync status snapshot */
  static getStatus(): SyncStatus {
    return currentSyncStatus;
  }

  /**
   * Run a full sync cycle.
   * Safe to call multiple times — will debounce if already syncing.
   */
  static async syncAll(preferredVersion?: string): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const pendingCount = await PendingActionsService.getCount();
      emitStatus({ state: 'idle', pendingActionsCount: pendingCount });
      return;
    }

    if (currentSyncStatus.state === 'syncing') return;

    // Resolve preferred version if not explicitly passed
    let resolvedVersion = preferredVersion;
    if (!resolvedVersion) {
      try {
        const prefs = await HomeOfflineService.getPreferences();
        resolvedVersion = prefs.preferredVersionName || prefs.preferredVersionId || 'KJV';
      } catch {
        resolvedVersion = 'KJV';
      }
    }

    const pendingCount = await PendingActionsService.getCount();

    emitStatus({
      state: 'syncing',
      pendingActionsCount: pendingCount,
      errorMessage: undefined,
    });

    try {
      // 1. Replay pending write actions first
      await this.syncPendingActions();

      // 2. Sync home content (non-critical — don't let failures block actions)
      await this.syncHomeContent(resolvedVersion).catch((err) =>
        console.warn('[SyncService] syncHomeContent failed:', err),
      );

      // 3. Check for Bible version updates (lightweight)
      await this.syncBibleVersions().catch((err) =>
        console.warn('[SyncService] syncBibleVersions failed:', err),
      );

      const remainingCount = await PendingActionsService.getCount();
      emitStatus({
        state: 'success',
        lastSyncedAt: new Date().toISOString(),
        pendingActionsCount: remainingCount,
      });

      // Dispatch global event so React Query queries and page views can invalidate and refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bible-sync-completed'));
      }
    } catch (err: any) {
      const remainingCount = await PendingActionsService.getCount();
      emitStatus({
        state: 'failed',
        errorMessage: err?.message || 'Sync failed',
        pendingActionsCount: remainingCount,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Home Content Sync
  // ---------------------------------------------------------------------------

  static async syncHomeContent(preferredVersion: string = 'KJV'): Promise<void> {
    const version = encodeURIComponent(preferredVersion);

    // Sync full 7-day daily content array to home_cache
    try {
      const dailyRes = await fetch(`/api/daily?days=7&version=${version}`);
      if (dailyRes.ok) {
        const json = await dailyRes.json();
        const items = json.data || [];
        if (Array.isArray(items) && items.length > 0) {
          await HomeOfflineService.saveHomeCache('daily_content_list', items);
          await HomeOfflineService.saveHomeCache('daily_verse', items);
        }
      }
    } catch {
      // Non-critical
    }

    const endpoints: Array<{ key: Parameters<typeof HomeOfflineService.saveHomeCache>[0]; url: string }> = [
      { key: 'reading_plans', url: '/api/v1/plans?limit=20' },
      { key: 'bible_versions', url: '/api/v1/bible/versions' },
    ];

    await Promise.allSettled(
      endpoints.map(async ({ key, url }) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const json = await res.json();
          if (json.success !== false) {
            await HomeOfflineService.saveHomeCache(key, json.data ?? json);
          }
        } catch {
          // Skip failed endpoints
        }
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Pending Actions Replay
  // ---------------------------------------------------------------------------

  static async syncPendingActions(): Promise<void> {
    const actions = await PendingActionsService.getAll();
    if (actions.length === 0) return;

    for (const action of actions) {
      try {
        const hasBody =
          action.method !== 'DELETE' &&
          action.payload &&
          Object.keys(action.payload).length > 0;

        const res = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: hasBody ? JSON.stringify(action.payload) : undefined,
        });

        if (res.ok) {
          const json = await res.json().catch(() => null);

          // If entity had a temporary client ID and server created a real record, remap and update local cache
          if (action.entityTempId && json?.data?._id) {
            const realId = json.data._id;
            await PendingActionsService.remapEntityId(action.entityTempId, realId);

            if (action.entityType === 'journal' || action.type === 'add_journal') {
              const list = (await ModuleOfflineService.getCache<any[]>('journals_user')) || [];
              const updated = list.map((item) =>
                item._id === action.entityTempId ? { ...item, _id: realId } : item
              );
              await ModuleOfflineService.saveCache('journals_user', updated);
            } else if (action.entityType === 'prayer' || action.type === 'add_prayer') {
              const list = (await ModuleOfflineService.getCache<any[]>('prayers_personal')) || [];
              const updated = list.map((item) =>
                item._id === action.entityTempId ? { ...item, _id: realId } : item
              );
              await ModuleOfflineService.saveCache('prayers_personal', updated);
            }
          }

          // If action was a like / unlike, update local daily cache with server-confirmed count & state
          if ((action.type === 'like_content' || action.type === 'unlike_content') && json?.likeCount !== undefined) {
            const contentId = String(action.payload.contentId);
            const contentType = String(action.payload.type);
            await HomeOfflineService.updateLikeInDailyCache(contentId, contentType, !!json.liked, Number(json.likeCount));
          }

          await PendingActionsService.remove(action.id);
        } else if (res.status === 409 || res.status === 404) {
          // Conflict or already deleted — remove the pending action
          console.warn(
            `[SyncService] Conflict/404 on action ${action.type} (HTTP ${res.status}) — removing from queue`,
          );
          await PendingActionsService.remove(action.id);
        } else {
          await PendingActionsService.markFailed(
            action.id,
            `HTTP ${res.status}`,
          );
        }
      } catch (err: any) {
        await PendingActionsService.markFailed(
          action.id,
          err?.message || 'Network error',
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Bible Version Update Check
  // ---------------------------------------------------------------------------

  static async syncBibleVersions(): Promise<void> {
    try {
      const res = await fetch('/api/v1/bible/versions');
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success || !Array.isArray(json.data)) return;

      const downloadedStatuses = await BibleOfflineService.getAllDownloadStatuses();
      const downloadedIds = new Set(
        downloadedStatuses
          .filter((s) => s.status === 'downloaded')
          .map((s) => s.versionId),
      );

      for (const serverVersion of json.data) {
        if (!downloadedIds.has(serverVersion._id)) continue;

        const downloadRecord = downloadedStatuses.find(
          (s) => s.versionId === serverVersion._id,
        );
        if (!downloadRecord?.downloadedAt) continue;

        const serverUpdatedAt = serverVersion.updatedAt
          ? new Date(serverVersion.updatedAt).getTime()
          : 0;
        const downloadedAt = new Date(downloadRecord.downloadedAt).getTime();

        if (serverUpdatedAt > downloadedAt) {
          await BibleOfflineService.updateDownloadProgress(serverVersion._id, {
            status: 'update_available',
            lastCheckedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Non-critical
    }
  }
}

// Auto-initialize count listener
SyncService.init();
