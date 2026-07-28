'use client';

/**
 * VersionDownloadCard
 *
 * Card showing a Bible version's download status with action buttons.
 * Used on the Offline Management screen (/offline).
 *
 * States:
 * - not_downloaded: "Download" button
 * - downloading: progress bar + Pause/Cancel
 * - downloaded: "Delete" button + storage size
 * - update_available: "Update" button
 * - paused: "Resume" + "Cancel"
 * - failed: "Retry" + "Cancel"
 */

import { Download, Trash2, RefreshCw, CheckCircle2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import DownloadProgressBar from './DownloadProgressBar';
import type { VersionDownloadRecord, DownloadStatus } from '@/lib/offline/types';
import { StorageManager } from '@/lib/offline/StorageManager';

interface VersionInfo {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
}

interface VersionDownloadCardProps {
  version: VersionInfo;
  downloadRecord?: VersionDownloadRecord;
  isOnline: boolean;
  onStartDownload: (v: VersionInfo) => void;
  onPauseDownload: (versionId: string) => void;
  onResumeDownload: (versionId: string) => void;
  onRetryDownload: (versionId: string) => void;
  onCancelDownload: (versionId: string) => void;
  onDeleteDownload: (versionId: string) => void;
}

const STATUS_BADGE: Record<DownloadStatus, { label: string; className: string }> = {
  not_downloaded: { label: 'Not Downloaded', className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400' },
  downloading: { label: 'Downloading', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  downloaded: { label: 'Downloaded', className: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  update_available: { label: 'Update Available', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  paused: { label: 'Paused', className: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' },
  failed: { label: 'Failed', className: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' },
};

export default function VersionDownloadCard({
  version,
  downloadRecord,
  isOnline,
  onStartDownload,
  onPauseDownload,
  onResumeDownload,
  onRetryDownload,
  onCancelDownload,
  onDeleteDownload,
}: VersionDownloadCardProps) {
  const status: DownloadStatus = downloadRecord?.status ?? 'not_downloaded';
  const badge = STATUS_BADGE[status];
  const sizeLabel = downloadRecord?.estimatedBytes
    ? StorageManager.formatBytes(downloadRecord.estimatedBytes)
    : null;

  const languageLabel =
    version.language === 'en'
      ? 'English'
      : version.language === 'te'
      ? 'Telugu'
      : version.language === 'hi'
      ? 'Hindi'
      : version.language;

  return (
    <motion.div
      layout
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {version.abbreviation}
            </span>
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            {version.name} &middot; {languageLabel}
          </p>
          {sizeLabel && status === 'downloaded' && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{sizeLabel}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {status === 'not_downloaded' && (
            <button
              id={`download-${version.id}`}
              onClick={() => onStartDownload(version)}
              disabled={!isOnline}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primary-teal)] text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              title={!isOnline ? 'Connect to internet to download' : 'Download for offline use'}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}

          {(status === 'downloaded' || status === 'update_available') && (
            <>
              {status === 'update_available' && (
                <button
                  id={`update-${version.id}`}
                  onClick={() => onStartDownload(version)}
                  disabled={!isOnline}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Update
                </button>
              )}
              <button
                id={`delete-${version.id}`}
                onClick={() => onDeleteDownload(version.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </>
          )}

          {status === 'downloaded' && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          )}
        </div>
      </div>

      {/* Progress bar (shown during active download / paused / failed) */}
      {downloadRecord && ['downloading', 'paused', 'failed'].includes(status) && (
        <DownloadProgressBar
          record={downloadRecord}
          onPause={status === 'downloading' ? () => onPauseDownload(version.id) : undefined}
          onResume={status === 'paused' ? () => onResumeDownload(version.id) : undefined}
          onRetry={status === 'failed' ? () => onRetryDownload(version.id) : undefined}
          onCancel={() => onCancelDownload(version.id)}
        />
      )}

      {/* Offline warning for downloadable actions */}
      {!isOnline && status === 'not_downloaded' && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <WifiOff className="h-3 w-3" />
          <span>Connect to internet to download</span>
        </div>
      )}
    </motion.div>
  );
}
