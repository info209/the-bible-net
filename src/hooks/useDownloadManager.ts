'use client';

/**
 * useDownloadManager
 *
 * React hook that provides a reactive interface to the DownloadManager.
 * Manages per-version download state (progress, status) and exposes
 * actions: startDownload, pauseDownload, resumeDownload, retryDownload,
 * cancelDownload, deleteDownload.
 *
 * Also loads all download statuses from IndexedDB on mount and keeps
 * them synchronized.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';
import { DownloadManager } from '@/lib/offline/DownloadManager';
import type { VersionDownloadRecord } from '@/lib/offline/types';

export interface DownloadState {
  [versionId: string]: VersionDownloadRecord;
}

export function useDownloadManager() {
  const [downloadStates, setDownloadStates] = useState<DownloadState>({});
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Load all download statuses from IndexedDB on mount
  useEffect(() => {
    mountedRef.current = true;
    loadAllStatuses();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadAllStatuses = useCallback(async () => {
    try {
      const statuses = await BibleOfflineService.getAllDownloadStatuses();
      if (!mountedRef.current) return;
      const stateMap: DownloadState = {};
      for (const s of statuses) {
        stateMap[s.versionId] = s;
      }
      setDownloadStates(stateMap);
    } catch (err) {
      console.warn('[useDownloadManager] Failed to load statuses:', err);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  const updateState = useCallback((versionId: string, patch: Partial<VersionDownloadRecord>) => {
    setDownloadStates((prev) => ({
      ...prev,
      [versionId]: { ...(prev[versionId] ?? {}), ...patch, versionId } as VersionDownloadRecord,
    }));
  }, []);

  const startDownload = useCallback(
    async (
      versionId: string,
      versionAbbreviation: string,
      versionName: string,
      language: string,
    ) => {
      updateState(versionId, {
        versionId,
        versionAbbreviation,
        versionName,
        language,
        status: 'downloading',
        progressPercent: 0,
        downloadedChapters: 0,
        totalChapters: 0,
      });

      await DownloadManager.startDownload(
        versionId,
        versionAbbreviation,
        versionName,
        language,
        (progress, downloaded, total) => {
          if (mountedRef.current) {
            updateState(versionId, {
              status: 'downloading',
              progressPercent: progress,
              downloadedChapters: downloaded,
              totalChapters: total,
            });
          }
        },
      );

      // Refresh from IndexedDB to get final state
      if (mountedRef.current) {
        const finalStatus = await BibleOfflineService.getDownloadStatus(versionId);
        if (finalStatus && mountedRef.current) {
          updateState(versionId, finalStatus);
        }
      }
    },
    [updateState],
  );

  const pauseDownload = useCallback(
    async (versionId: string) => {
      updateState(versionId, { status: 'paused' });
      await DownloadManager.pauseDownload(versionId);
    },
    [updateState],
  );

  const resumeDownload = useCallback(
    async (versionId: string) => {
      updateState(versionId, { status: 'downloading' });
      await DownloadManager.resumeDownload(versionId, (progress, downloaded, total) => {
        if (mountedRef.current) {
          updateState(versionId, {
            status: 'downloading',
            progressPercent: progress,
            downloadedChapters: downloaded,
            totalChapters: total,
          });
        }
      });
      const finalStatus = await BibleOfflineService.getDownloadStatus(versionId);
      if (finalStatus && mountedRef.current) updateState(versionId, finalStatus);
    },
    [updateState],
  );

  const retryDownload = useCallback(
    async (versionId: string) => {
      updateState(versionId, { status: 'downloading', progressPercent: 0, downloadedChapters: 0 });
      await DownloadManager.retryDownload(versionId, (progress, downloaded, total) => {
        if (mountedRef.current) {
          updateState(versionId, {
            status: 'downloading',
            progressPercent: progress,
            downloadedChapters: downloaded,
            totalChapters: total,
          });
        }
      });
      const finalStatus = await BibleOfflineService.getDownloadStatus(versionId);
      if (finalStatus && mountedRef.current) updateState(versionId, finalStatus);
    },
    [updateState],
  );

  const cancelDownload = useCallback(
    async (versionId: string) => {
      await DownloadManager.cancelDownload(versionId);
      setDownloadStates((prev) => {
        const next = { ...prev };
        delete next[versionId];
        return next;
      });
    },
    [],
  );

  const deleteDownload = useCallback(
    async (versionId: string) => {
      await DownloadManager.deleteDownload(versionId);
      setDownloadStates((prev) => {
        const next = { ...prev };
        delete next[versionId];
        return next;
      });
    },
    [],
  );

  const getStatus = useCallback(
    (versionId: string): VersionDownloadRecord | undefined => downloadStates[versionId],
    [downloadStates],
  );

  const isDownloaded = useCallback(
    (versionId: string): boolean => downloadStates[versionId]?.status === 'downloaded',
    [downloadStates],
  );

  return {
    downloadStates,
    isLoading,
    getStatus,
    isDownloaded,
    startDownload,
    pauseDownload,
    resumeDownload,
    retryDownload,
    cancelDownload,
    deleteDownload,
    refresh: loadAllStatuses,
  };
}
