'use client';

/**
 * useSyncService
 *
 * React hook for consuming SyncService state in components.
 * - Exposes current sync status (idle / syncing / success / failed)
 * - Exposes pending action count
 * - Provides a manual `sync()` trigger
 */

import { useState, useEffect, useCallback } from 'react';
import type { SyncStatus } from '@/lib/offline/types';

const DEFAULT_STATUS: SyncStatus = {
  state: 'idle',
  pendingActionsCount: 0,
};

export function useSyncService() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(DEFAULT_STATUS);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    import('@/lib/offline/SyncService').then(({ SyncService }) => {
      unsubscribe = SyncService.onStatusChange(setSyncStatus);
    });

    return () => unsubscribe?.();
  }, []);

  const sync = useCallback(async (preferredVersion?: string) => {
    const { SyncService } = await import('@/lib/offline/SyncService');
    await SyncService.syncAll(preferredVersion);
  }, []);

  return {
    syncStatus,
    isSyncing: syncStatus.state === 'syncing',
    hasPendingActions: syncStatus.pendingActionsCount > 0,
    pendingActionsCount: syncStatus.pendingActionsCount,
    lastSyncedAt: syncStatus.lastSyncedAt,
    sync,
  };
}
