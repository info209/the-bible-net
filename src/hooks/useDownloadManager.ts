'use client';

/**
 * useDownloadManager
 *
 * React hook that provides a reactive interface for downloading
 * complete Bible Versions, tracking progress, and monitoring storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';
import { DownloadManager, DownloadProgressCallback } from '@/lib/offline/DownloadManager';
import { StorageManager, MAX_STORAGE_BYTES } from '@/lib/offline/StorageManager';
import { buildVersionDownloadKey, buildBookDownloadKey, buildChapterDownloadKey } from '@/lib/offline/db';
import type { DownloadRecord, StorageUsageBreakdown } from '@/lib/offline/types';

export interface DownloadStateMap {
  [id: string]: DownloadRecord;
}

export function useDownloadManager() {
  const [downloadStates, setDownloadStates] = useState<DownloadStateMap>({});
  const [storageInfo, setStorageInfo] = useState<StorageUsageBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const loadAllData = useCallback(async () => {
    try {
      const [statuses, breakdown] = await Promise.all([
        BibleOfflineService.getAllDownloadStatuses(),
        StorageManager.getUsageBreakdown(),
      ]);
      if (!mountedRef.current) return;

      const map: DownloadStateMap = {};
      for (const s of statuses) {
        // Only map version-level download records
        const isVersionTarget =
          s.targetType === 'version' || (!s.targetType && !s.bookId && !s.chapterNumber);
        if (!isVersionTarget) continue;

        // Verify that downloaded records are genuinely complete
        if (s.status === 'downloaded') {
          const hasChapters =
            (s.downloadedChapters !== undefined && s.downloadedChapters > 0) ||
            (s.progressPercent !== undefined && s.progressPercent === 100);
          if (!hasChapters) {
            // Invalid / empty corrupted download record — do not treat as downloaded
            continue;
          }
        }

        map[s.id] = s;
        if (s.versionId) map[s.versionId] = s;
        if (s.versionAbbreviation) {
          map[s.versionAbbreviation] = s;
          map[s.versionAbbreviation.toUpperCase()] = s;
          map[s.versionAbbreviation.toLowerCase()] = s;
        }
      }
      setDownloadStates(map);
      setStorageInfo(breakdown);
    } catch (err) {
      console.warn('[useDownloadManager] Failed to load data:', err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadAllData();
    return () => {
      mountedRef.current = false;
    };
  }, [loadAllData]);

  const updateState = useCallback((id: string, patch: Partial<DownloadRecord>) => {
    setDownloadStates((prev) => {
      const updated = { ...(prev[id] ?? {}), ...patch, id } as DownloadRecord;
      const next = { ...prev, [id]: updated };
      if (updated.versionId) next[updated.versionId] = updated;
      if (updated.versionAbbreviation) {
        next[updated.versionAbbreviation] = updated;
        next[updated.versionAbbreviation.toUpperCase()] = updated;
        next[updated.versionAbbreviation.toLowerCase()] = updated;
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Version-Level Downloads
  // ---------------------------------------------------------------------------

  const downloadVersion = useCallback(
    async ({
      versionId,
      versionAbbreviation,
      versionName,
      language,
      onProgress,
    }: {
      versionId: string;
      versionAbbreviation: string;
      versionName?: string;
      language?: string;
      onProgress?: DownloadProgressCallback;
    }) => {
      const recordId = buildVersionDownloadKey(versionId);
      updateState(recordId, {
        id: recordId,
        targetType: 'version',
        versionId,
        versionAbbreviation,
        versionName: versionName || versionAbbreviation,
        language,
        status: 'downloading',
        progressPercent: 5,
        downloadedChapters: 0,
        totalChapters: 1189,
        downloadedBooks: 0,
        totalBooks: 66,
      });

      try {
        await DownloadManager.downloadVersion({
          versionId,
          versionAbbreviation,
          versionName,
          language,
          onProgress: (progress, downloaded, total, msg) => {
            if (mountedRef.current) {
              updateState(recordId, {
                status: 'downloading',
                progressPercent: progress,
                downloadedChapters: downloaded,
                totalChapters: total,
              });
              onProgress?.(progress, downloaded, total, msg);
            }
          },
        });
      } finally {
        await loadAllData();
      }
    },
    [updateState, loadAllData],
  );

  const deleteVersion = useCallback(
    async (versionId: string, versionAbbr?: string) => {
      // 1. Optimistic removal from React state for instantaneous UI feedback
      const keysToRemove = new Set<string>();
      const candidates = [
        versionId,
        versionAbbr,
        `version_${versionId}`,
        versionAbbr ? `version_${versionAbbr}` : '',
      ].filter(Boolean) as string[];

      for (const c of candidates) {
        keysToRemove.add(c);
        keysToRemove.add(c.toLowerCase());
        keysToRemove.add(c.toUpperCase());
      }

      setDownloadStates((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          const rec = next[k];
          if (
            keysToRemove.has(k) ||
            (rec &&
              (keysToRemove.has(rec.id) ||
                keysToRemove.has(rec.versionId) ||
                (rec.versionAbbreviation && keysToRemove.has(rec.versionAbbreviation))))
          ) {
            delete next[k];
          }
        }
        return next;
      });

      try {
        // 2. Perform DB deletion across all stores
        await DownloadManager.deleteVersion(versionId, versionAbbr);
      } finally {
        // 3. Reload everything to maintain single source of truth
        await loadAllData();
      }
    },
    [loadAllData],
  );

  const pauseDownload = useCallback(
    (versionId: string) => {
      DownloadManager.pauseDownload(versionId);
      updateState(versionId, { status: 'paused' });
    },
    [updateState],
  );

  const resumeDownload = useCallback(
    async (params: {
      versionId: string;
      versionAbbreviation: string;
      versionName?: string;
      language?: string;
      onProgress?: DownloadProgressCallback;
    }) => {
      await downloadVersion(params);
    },
    [downloadVersion],
  );

  const retryDownload = useCallback(
    async (params: {
      versionId: string;
      versionAbbreviation: string;
      versionName?: string;
      language?: string;
      onProgress?: DownloadProgressCallback;
    }) => {
      await downloadVersion(params);
    },
    [downloadVersion],
  );

  const cancelDownload = useCallback(
    async (versionId: string, versionAbbr?: string) => {
      await DownloadManager.cancelDownload(versionId, versionAbbr);
      await loadAllData();
    },
    [loadAllData],
  );

  const getVersionStatus = useCallback(
    (versionIdOrAbbr: string): DownloadRecord | undefined => {
      if (!versionIdOrAbbr) return undefined;
      const direct =
        downloadStates[versionIdOrAbbr] ||
        downloadStates[versionIdOrAbbr.toUpperCase()] ||
        downloadStates[versionIdOrAbbr.toLowerCase()];
      if (direct) return direct;

      const target = versionIdOrAbbr.toLowerCase();
      return Object.values(downloadStates).find((s) => {
        if (!s) return false;
        return (
          s.id.toLowerCase() === target ||
          s.versionId.toLowerCase() === target ||
          (s.versionAbbreviation && s.versionAbbreviation.toLowerCase() === target)
        );
      });
    },
    [downloadStates],
  );

  // ---------------------------------------------------------------------------
  // Backward compatibility methods
  // ---------------------------------------------------------------------------

  const downloadBook = useCallback(
    async (params: {
      versionId: string;
      versionAbbreviation: string;
      bookId: string;
      bookName: string;
      chapterCount: number;
      testament?: 'OT' | 'NT';
      onProgress?: DownloadProgressCallback;
    }) => {
      await downloadVersion({
        versionId: params.versionId,
        versionAbbreviation: params.versionAbbreviation,
        versionName: params.versionAbbreviation,
        onProgress: params.onProgress,
      });
    },
    [downloadVersion],
  );

  const downloadChapter = useCallback(
    async (params: any) => {
      await downloadVersion({
        versionId: params.versionId,
        versionAbbreviation: params.versionAbbreviation,
        versionName: params.versionAbbreviation,
        onProgress: params.onProgress,
      });
    },
    [downloadVersion],
  );

  const deleteBook = useCallback(
    async (versionId: string, _bookId: string) => {
      await deleteVersion(versionId);
    },
    [deleteVersion],
  );

  const deleteChapter = useCallback(
    async (versionId: string, _bookId: string, _chapterNumber: number) => {
      await deleteVersion(versionId);
    },
    [deleteVersion],
  );

  const getBookStatus = useCallback(
    (versionId: string, _bookId?: string): DownloadRecord | undefined => {
      return getVersionStatus(versionId);
    },
    [getVersionStatus],
  );

  const getChapterStatus = useCallback(
    (versionId: string, _bookId?: string, _chapterNumber?: number): DownloadRecord | undefined => {
      return getVersionStatus(versionId);
    },
    [getVersionStatus],
  );

  return {
    downloadStates,
    storageInfo,
    isLoading,
    getVersionStatus,
    downloadVersion,
    deleteVersion,
    pauseDownload,
    resumeDownload,
    retryDownload,
    cancelDownload,
    // Backward compatibility
    getBookStatus,
    getChapterStatus,
    downloadBook,
    downloadChapter,
    deleteBook,
    deleteChapter,
    refresh: loadAllData,
  };
}
