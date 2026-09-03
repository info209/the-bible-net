'use client';

/**
 * Offline Management Screen — /offline
 *
 * Allows users to:
 * 1. See storage usage (100 MB max cap meter)
 * 2. View downloaded Bible books and chapters
 * 3. Clear LRU chapter cache
 * 4. Clear all offline data
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HardDrive,
  BookOpen,
  Trash2,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  ChevronLeft,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useDownloadManager } from '@/hooks/useDownloadManager';
import { useNetworkStatusContext } from '@/lib/offline/NetworkStatusContext';
import { StorageManager } from '@/lib/offline/StorageManager';
import { ChapterCacheService } from '@/lib/offline/ChapterCacheService';
import { toast } from '@/context/ToastContext';

export default function OfflineManagementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatusContext();
  const {
    downloadStates,
    storageInfo,
    isLoading: isLoadingStates,
    deleteVersion,
    refresh: refreshStates,
  } = useDownloadManager();

  const [storageBreakdown, setStorageBreakdown] = useState<{
    maxCapBytes: number;
    totalBytes: number;
    availableCapBytes: number;
    chapterCacheBytes: number;
  } | null>(null);

  const [cacheStats, setCacheStats] = useState<{
    totalCached: number;
    unprotectedCount: number;
  } | null>(null);

  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Load Bible versions from API
  const { data: versionsData, isLoading: isLoadingVersions } = useQuery({
    queryKey: ['bible-versions'],
    queryFn: async () => {
      const res = await fetch('/api/v1/bible/versions');
      if (!res.ok) throw new Error('Failed to fetch versions');
      const json = await res.json();
      if (!json.success) throw new Error('Failed to fetch versions');
      return json.data as any[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const loadStorageInfo = useCallback(async () => {
    const [breakdown, stats] = await Promise.all([
      StorageManager.getUsageBreakdown(),
      ChapterCacheService.getCacheStats(),
    ]);
    setStorageBreakdown({
      maxCapBytes: breakdown.maxCapBytes,
      totalBytes: breakdown.totalBytes,
      availableCapBytes: breakdown.availableCapBytes,
      chapterCacheBytes: breakdown.chapterCacheBytes,
    });
    setCacheStats({ totalCached: stats.totalCached, unprotectedCount: stats.unprotectedCount });
  }, []);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo, downloadStates]);

  const handleDeleteVersion = useCallback(
    async (versionId: string) => {
      await deleteVersion(versionId);
      toast.success('Version deleted from offline storage.');
      loadStorageInfo();
    },
    [deleteVersion, loadStorageInfo],
  );

  const handleClearCache = useCallback(async () => {
    setIsClearingCache(true);
    try {
      await StorageManager.clearChapterCache();
      await loadStorageInfo();
      toast.success('Chapter cache cleared.');
    } finally {
      setIsClearingCache(false);
    }
  }, [loadStorageInfo]);

  const handleClearAll = useCallback(async () => {
    setIsClearingAll(true);
    try {
      await StorageManager.clearAllOfflineData();
      await refreshStates();
      await loadStorageInfo();
      setShowClearAllConfirm(false);
      toast.success('All offline data cleared.');
    } catch {
      toast.error('Failed to clear offline data. Please try again.');
    } finally {
      setIsClearingAll(false);
    }
  }, [refreshStates, loadStorageInfo]);

  const downloadedVersions = Object.values(downloadStates).filter(
    (s) => s.status === 'downloaded' && (s.targetType === 'version' || !s.targetType),
  );

  const usagePercent =
    storageBreakdown && storageBreakdown.maxCapBytes > 0
      ? Math.min(100, Math.round((storageBreakdown.totalBytes / storageBreakdown.maxCapBytes) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Downloads &amp; Offline
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Manage offline Bible storage (100 MB Limit)
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Offline status notice */}
        {!isOnline && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You&apos;re offline. Connect to download new Bible versions.
            </p>
          </div>
        )}

        {/* Storage Overview */}
        {storageBreakdown && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Storage (100 MB Max Cap)
            </h2>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-zinc-100 dark:text-zinc-800"
                    />
                    <circle
                      cx="18" cy="18" r="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${usagePercent * 0.879} 87.9`}
                      strokeLinecap="round"
                      className="text-[var(--color-primary-teal)] transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {StorageManager.formatBytes(storageBreakdown.totalBytes)}{' '}
                    <span className="text-sm font-normal text-zinc-400">used of 100 MB limit</span>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {StorageManager.formatBytes(storageBreakdown.availableCapBytes)} available under 100 MB cap
                  </div>
                  {cacheStats && cacheStats.unprotectedCount > 0 && (
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {cacheStats.unprotectedCount} cached chapters &middot;{' '}
                      {StorageManager.formatBytes(storageBreakdown.chapterCacheBytes)} LRU cache
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Downloaded Versions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Downloaded Versions
            </h2>
            {isOnline && (
              <button
                onClick={() => loadStorageInfo()}
                className="text-xs text-[var(--color-primary-teal)] font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            )}
          </div>

          {isLoadingStates ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"
                />
              ))}
            </div>
          ) : downloadedVersions.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-600 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">No downloaded versions</p>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Open the Bible Version selector in the Bible Reader to download full versions for offline reading.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {downloadedVersions.map((rec) => (
                  <motion.div
                    key={rec.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {rec.versionName || rec.versionAbbreviation} ({rec.versionAbbreviation})
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Downloaded
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {rec.totalChapters || 1189} chapters &middot; {rec.language || 'English'} &middot;{' '}
                        {rec.estimatedBytes ? StorageManager.formatBytes(rec.estimatedBytes) : 'Stored'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteVersion(rec.versionId)}
                      className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all"
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Cache Management */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            Cache
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            {/* Clear chapter cache */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Clear Chapter Cache
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {cacheStats
                    ? `${cacheStats.unprotectedCount} cached chapters · ${StorageManager.formatBytes(storageBreakdown?.chapterCacheBytes ?? 0)}`
                    : 'Chapters cached while reading online'}
                </p>
              </div>
              <button
                id="clear-chapter-cache-btn"
                onClick={handleClearCache}
                disabled={isClearingCache || (cacheStats?.unprotectedCount ?? 0) === 0}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isClearingCache ? 'Clearing…' : 'Clear'}
              </button>
            </div>

            {/* Clear all offline data */}
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Clear All Offline Data
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Removes downloaded books, chapters, and offline content
                </p>
              </div>
              <button
                id="clear-all-offline-btn"
                onClick={() => setShowClearAllConfirm(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Clear All Confirmation Dialog */}
      <AnimatePresence>
        {showClearAllConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => !isClearingAll && setShowClearAllConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-zinc-200 dark:border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 text-center mb-2">
                Clear All Offline Data?
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-6">
                This will delete all downloaded Bible books, cached chapters, and offline home content.
                Your bookmarks and notes are safely synced on the server.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  disabled={isClearingAll}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={isClearingAll}
                  className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isClearingAll ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Clearing…
                    </>
                  ) : (
                    'Clear All'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
