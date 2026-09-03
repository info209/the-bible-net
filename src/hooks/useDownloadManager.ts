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
        map[s.id] = s;
        // Also map by versionId and abbreviation for fast lookup
        if (s.versionId) map[s.versionId] = s;
        if (s.versionAbbreviation) map[s.versionAbbreviation] = s;
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
      if (updated.versionAbbreviation) next[updated.versionAbbreviation] = updated;
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
    async (versionId: string) => {
      await DownloadManager.deleteVersion(versionId);
      await loadAllData();
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
    async (versionId: string) => {
      await DownloadManager.cancelDownload(versionId);
      await loadAllData();
    },
    [loadAllData],
  );

  const getVersionStatus = useCallback(
    (versionIdOrAbbr: string): DownloadRecord | undefined => {
      if (!versionIdOrAbbr) return undefined;
      return downloadStates[versionIdOrAbbr];
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
