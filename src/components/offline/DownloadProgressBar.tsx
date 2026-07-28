'use client';

/**
 * DownloadProgressBar
 *
 * Animated progress bar shown during an active Bible version download.
 * Shows: book currently being downloaded, % progress, and Pause/Cancel buttons.
 */

import { Pause, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { VersionDownloadRecord } from '@/lib/offline/types';

interface DownloadProgressBarProps {
  record: VersionDownloadRecord;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export default function DownloadProgressBar({
  record,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: DownloadProgressBarProps) {
  const { status, progressPercent, downloadedChapters, totalChapters } = record;
  const isDone = status === 'downloaded';
  const isFailed = status === 'failed';
  const isPaused = status === 'paused';
  const isActive = status === 'downloading';

  const barColor = isFailed
    ? 'bg-rose-500'
    : isDone
    ? 'bg-emerald-500'
    : 'bg-[var(--color-primary-teal)]';

  return (
    <div className="mt-2">
      {/* Progress bar track */}
      <div className="relative h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className={`absolute left-0 top-0 h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progressPercent, 100)}%` }}
          transition={{ ease: 'linear', duration: 0.4 }}
        />
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          {isDone && (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Downloaded
              </span>
            </>
          )}
          {isFailed && (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                {record.errorMessage || 'Download failed'}
              </span>
            </>
          )}
          {isPaused && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Paused</span>
          )}
          {isActive && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {downloadedChapters !== undefined && totalChapters
                ? `${downloadedChapters} / ${totalChapters} chapters`
                : `${progressPercent}%`}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isActive && onPause && (
            <button
              onClick={onPause}
              aria-label="Pause download"
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
            </button>
          )}
          {isPaused && onResume && (
            <button
              onClick={onResume}
              aria-label="Resume download"
              className="text-xs px-2 py-0.5 rounded bg-[var(--color-primary-teal)] text-white hover:opacity-90 transition-opacity font-medium"
            >
              Resume
            </button>
          )}
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              aria-label="Retry download"
              className="text-xs px-2 py-0.5 rounded bg-[var(--color-primary-teal)] text-white hover:opacity-90 transition-opacity font-medium"
            >
              Retry
            </button>
          )}
          {(isActive || isPaused || isFailed) && onCancel && (
            <button
              onClick={onCancel}
              aria-label="Cancel download"
              className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
