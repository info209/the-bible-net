'use client';

/**
 * useNetworkStatus
 *
 * React hook for detecting online/offline state and connection quality.
 * - Listens to browser `online`/`offline` events
 * - Uses navigator.connection for slow-connection detection
 * - Exposes `wasOffline` flag that is true on the first update after coming back online
 * - Triggers SyncService when connectivity returns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { NetworkStatus } from './types';

function getSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn =
    (navigator as any).connection ??
    (navigator as any).mozConnection ??
    (navigator as any).webkitConnection;
  if (!conn) return false;
  const slowTypes = new Set(['slow-2g', '2g']);
  return slowTypes.has(conn.effectiveType);
}

export function useNetworkStatus(): NetworkStatus & { triggerSync: () => void } {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSlowConnection, setIsSlowConnection] = useState<boolean>(getSlowConnection);
  const [wasOffline, setWasOffline] = useState(false);

  // Track whether we were just offline so we can expose `wasOffline`
  const wasOfflineRef = useRef(false);
  const syncTriggerRef = useRef<(() => void) | null>(null);

  const triggerSync = useCallback(() => {
    syncTriggerRef.current?.();
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setWasOffline(true);
        try {
          const { SyncService } = await import('./SyncService');
          SyncService.syncAll().catch(console.error);
        } catch {
          // Non-critical
        }
        setTimeout(() => setWasOffline(false), 5000);
      }
      wasOfflineRef.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
      setWasOffline(false);
    };

    const handleConnectionChange = () => {
      setIsSlowConnection(getSlowConnection());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn =
      (navigator as any).connection ??
      (navigator as any).mozConnection ??
      (navigator as any).webkitConnection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }

    // Register sync trigger
    syncTriggerRef.current = () => {
      import('./SyncService').then(({ SyncService }) => {
        SyncService.syncAll().catch(console.error);
      });
    };

    // Check if there are pending actions on mount while online
    if (navigator.onLine) {
      import('./PendingActionsService').then(({ PendingActionsService }) => {
        PendingActionsService.getCount().then((count) => {
          if (count > 0) {
            import('./SyncService').then(({ SyncService }) => {
              SyncService.syncAll().catch(console.error);
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, isSlowConnection, wasOffline, triggerSync };
}
