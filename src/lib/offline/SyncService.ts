/**
 * SyncService
 *
 * Orchestrates background synchronization when connectivity returns.
 * - Replays pending write actions against server APIs
 * - Refreshes home content (daily verse, devotional, plans)
 * - Checks for Bible version updates
 * - Uses last-write-wins by timestamp for conflict resolution
 */

import { PendingActionsService } from './PendingActionsService';
import { HomeOfflineService } from './HomeOfflineService';
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
  listeners.forEach((fn) => fn(currentSyncStatus));
}

export class SyncService {
  /** Subscribe to sync status updates */
  static onStatusChange(listener: SyncStatusListener): () => void {
    listeners.add(listener);
    // Immediately emit current status to new subscriber
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
  static async syncAll(preferredVersion: string = 'KJV'): Promise<void> {
    if (currentSyncStatus.state === 'syncing') return;

    const pendingCount = await PendingActionsService.getCount();

    emitStatus({
      state: 'syncing',
      pendingActionsCount: pendingCount,
      errorMessage: undefined,
    });

    try {
      // 1. Sync home content (non-critical — don't let failures block actions)
      await this.syncHomeContent(preferredVersion).catch((err) =>
        console.warn('[SyncService] syncHomeContent failed:', err),
      );

      // 2. Replay pending write actions
      await this.syncPendingActions();

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

    const endpoints: Array<{ key: Parameters<typeof HomeOfflineService.saveHomeCache>[0]; url: string }> = [
      { key: 'daily_verse', url: `/api/v1/daily?type=verse&version=${version}` },
      { key: 'daily_devotional', url: `/api/v1/daily?type=devotion&version=${version}` },
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
        const res = await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: action.method !== 'DELETE' ? JSON.stringify(action.payload) : undefined,
        });

        if (res.ok) {
          await PendingActionsService.remove(action.id);
        } else if (res.status === 409) {
          // Conflict — server wins for 409; remove the pending action
          console.warn(
            `[SyncService] Conflict on action ${action.type} — server rejected; removing`,
          );
          await PendingActionsService.remove(action.id);
        } else {
          await PendingActionsService.markFailed(
            action.id,
            `HTTP ${res.status}`,
          );
        }
      } catch (err: any) {
        await PendingActionsService.markFailed(action.id, err?.message || 'Network error');
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

        // Check if server version is newer than when we downloaded
        const downloadRecord = downloadedStatuses.find((s) => s.versionId === serverVersion._id);
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
