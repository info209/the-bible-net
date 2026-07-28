'use client';

/**
 * NetworkStatusContext
 *
 * Provides app-wide access to:
 * - isOnline: whether the device has network connectivity
 * - isSlowConnection: whether the connection is 2G/slow
 * - syncStatus: current sync state and pending action count
 * - preferredVersion: from user preferences (for sync context)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import type { SyncStatus } from './types';

interface NetworkStatusContextValue {
  isOnline: boolean;
  isSlowConnection: boolean;
  wasOffline: boolean;
  syncStatus: SyncStatus;
  triggerSync: () => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue>({
  isOnline: true,
  isSlowConnection: false,
  wasOffline: false,
  syncStatus: { state: 'idle', pendingActionsCount: 0 },
  triggerSync: () => {},
});

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const { isOnline, isSlowConnection, wasOffline, triggerSync } = useNetworkStatus();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    pendingActionsCount: 0,
  });

  useEffect(() => {
    // Subscribe to SyncService status updates
    let unsubscribe: (() => void) | undefined;
    import('./SyncService').then(({ SyncService }) => {
      unsubscribe = SyncService.onStatusChange(setSyncStatus);
    });
    return () => unsubscribe?.();
  }, []);

  const value = useMemo<NetworkStatusContextValue>(
    () => ({ isOnline, isSlowConnection, wasOffline, syncStatus, triggerSync }),
    [isOnline, isSlowConnection, wasOffline, syncStatus, triggerSync],
  );

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatusContext(): NetworkStatusContextValue {
  return useContext(NetworkStatusContext);
}
