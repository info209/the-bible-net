'use client';

/**
 * OfflineBanner
 *
 * A subtle, non-blocking offline indicator that slides in from the top
 * when the device loses connectivity. Shows "Last synced X ago" when serving
 * cached content. Replaces the disruptive modal that previously blocked the UI.
 *
 * - Animated slide-in / slide-out
 * - Teal accent for syncing state, yellow-amber for offline, rose for failed sync
 * - Auto-dismisses when online
 * - "Retry" button when sync failed
 */

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStatusContext } from '@/lib/offline/NetworkStatusContext';
import { getRelativeTime } from '@/utils/time';

interface OfflineBannerProps {
  /** Extra CSS class for positioning (e.g., to appear below a sticky header) */
  className?: string;
}

export default function OfflineBanner({ className = '' }: OfflineBannerProps) {
  const { isOnline, syncStatus, triggerSync } = useNetworkStatusContext();
  const [showOnlineBrief, setShowOnlineBrief] = useState(false);

  // Show a brief "Back online" flash when connectivity is restored
  useEffect(() => {
    if (isOnline && syncStatus.lastSyncedAt) {
      setShowOnlineBrief(true);
      const t = setTimeout(() => setShowOnlineBrief(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, syncStatus.lastSyncedAt]);

  const isVisible = !isOnline || syncStatus.state === 'syncing' || showOnlineBrief;

  // Dynamically update CSS variables on document root so all sticky/fixed headers align smoothly
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isVisible) {
        document.documentElement.style.setProperty('--offline-banner-height', '32px');
        document.documentElement.style.setProperty(
          '--offline-banner-total-height',
          'calc(env(safe-area-inset-top, 0px) + 32px)'
        );
      } else {
        document.documentElement.style.setProperty('--offline-banner-height', '0px');
        document.documentElement.style.setProperty('--offline-banner-total-height', '0px');
      }
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--offline-banner-height', '0px');
        document.documentElement.style.setProperty('--offline-banner-total-height', '0px');
      }
    };
  }, [isVisible]);

  const getContent = () => {
    if (showOnlineBrief && isOnline) {
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
        text: 'Back online · Syncing…',
        bg: 'bg-emerald-600 dark:bg-emerald-700',
        textColor: 'text-white',
      };
    }

    if (!isOnline && syncStatus.state === 'failed') {
      return {
        icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" />,
        text: 'Offline · Sync failed',
        bg: 'bg-rose-600 dark:bg-rose-700',
        textColor: 'text-white',
        showRetry: true,
      };
    }

    if (syncStatus.state === 'syncing') {
      return {
        icon: <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />,
        text: 'Syncing…',
        bg: 'bg-[var(--color-primary-teal)] dark:bg-[var(--color-primary-teal-dark)]',
        textColor: 'text-white',
      };
    }

    // Default: offline
    const lastSync = syncStatus.lastSyncedAt
      ? `Last synced ${getRelativeTime(syncStatus.lastSyncedAt)}`
      : 'No recent sync';

    return {
      icon: <WifiOff className="h-3.5 w-3.5 shrink-0" />,
      text: `You're offline · ${lastSync}`,
      bg: 'bg-amber-500 dark:bg-amber-600',
      textColor: 'text-white',
    };
  };

  const content = getContent();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="offline-banner"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed top-0 left-0 right-0 z-[60] pt-[env(safe-area-inset-top,0px)] ${className}`}
        >
          <div
            className={`flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium ${content.bg} ${content.textColor} shadow-md`}
          >
            {content.icon}
            <span>{content.text}</span>
            {content.showRetry && (
              <button
                onClick={triggerSync}
                className="ml-2 underline underline-offset-2 opacity-90 hover:opacity-100 cursor-pointer"
                aria-label="Retry sync"
              >
                Retry
              </button>
            )}
            {syncStatus.pendingActionsCount > 0 && !isOnline && (
              <span className="opacity-75">
                · {syncStatus.pendingActionsCount} pending
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
