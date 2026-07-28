'use client';

/**
 * OfflineStatusBadge
 *
 * A small inline badge shown when reading a chapter from offline/cached data.
 * Used in BibleReaderPageContainer header.
 */

import { WifiOff } from 'lucide-react';

interface OfflineStatusBadgeProps {
  /** Whether to show the badge */
  visible: boolean;
  /** If true, shows "Cached" label; if false, shows "Offline" */
  isCachedOnly?: boolean;
  className?: string;
}

export default function OfflineStatusBadge({
  visible,
  isCachedOnly = false,
  className = '',
}: OfflineStatusBadgeProps) {
  if (!visible) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 select-none ${className}`}
      title={isCachedOnly ? 'Reading from cache' : 'Reading offline'}
    >
      <WifiOff className="h-2.5 w-2.5" aria-hidden />
      {isCachedOnly ? 'Cached' : 'Offline'}
    </span>
  );
}
