'use client';

/**
 * useDownloadManager
 *
 * React hook that provides a reactive interface for downloading
 * individual Books or Chapters, tracking progress, and monitoring storage.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';
import { DownloadManager, DownloadProgressCallback } from '@/lib/offline/DownloadManager';
import { StorageManager, MAX_STORAGE_BYTES } from '@/lib/offline/StorageManager';
import { buildBookDownloadKey, buildChapterDownloadKey } from '@/lib/offline/db';
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
    setDownloadStates((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), ...patch, id } as DownloadRecord,
    }));
  }, []);

  const downloadBook = useCallback(
    async ({
      versionId,
      versionAbbreviation,
      bookId,
      bookName,
      chapterCount,
      testament,
      onProgress,
    }: {
      versionId: string;
      versionAbbreviation: string;
      bookId: string;
      bookName: string;
      chapterCount: number;
      testament?: 'OT' | 'NT';
      onProgress?: DownloadProgressCallback;
    }) => {
      const recordId = buildBookDownloadKey(versionId, bookId);
      updateState(recordId, {
        id: recordId,
        targetType: 'book',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        status: 'downloading',
        progressPercent: 0,
        downloadedChapters: 0,
        totalChapters: chapterCount,
      });

      try {
        await DownloadManager.downloadBook({
          versionId,
          versionAbbreviation,
          bookId,
          bookName,
          chapterCount,
          testament,
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

  const downloadChapter = useCallback(
    async ({
      versionId,
      versionAbbreviation,
      bookId,
      bookName,
      chapterNumber,
      testament,
      onProgress,
    }: {
      versionId: string;
      versionAbbreviation: string;
      bookId: string;
      bookName: string;
      chapterNumber: number;
      testament?: 'OT' | 'NT';
      onProgress?: DownloadProgressCallback;
    }) => {
      const recordId = buildChapterDownloadKey(versionId, bookId, chapterNumber);
      updateState(recordId, {
        id: recordId,
        targetType: 'chapter',
        versionId,
        versionAbbreviation,
        bookId,
        bookName,
        chapterNumber,
        status: 'downloading',
        progressPercent: 10,
      });

      try {
        await DownloadManager.downloadChapter({
          versionId,
          versionAbbreviation,
          bookId,
          bookName,
          chapterNumber,
          testament,
          onProgress: (progress, downloaded, total, msg) => {
            if (mountedRef.current) {
              updateState(recordId, {
                status: 'downloading',
                progressPercent: progress,
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

  const deleteBook = useCallback(
    async (versionId: string, bookId: string) => {
      await DownloadManager.deleteBook(versionId, bookId);
      await loadAllData();
    },
    [loadAllData],
  );

  const deleteChapter = useCallback(
    async (versionId: string, bookId: string, chapterNumber: number) => {
      await DownloadManager.deleteChapter(versionId, bookId, chapterNumber);
      await loadAllData();
    },
    [loadAllData],
  );

  const getBookStatus = useCallback(
    (versionId: string, bookId: string): DownloadRecord | undefined => {
      const key = buildBookDownloadKey(versionId, bookId);
      return downloadStates[key];
    },
    [downloadStates],
  );

  const getChapterStatus = useCallback(
    (versionId: string, bookId: string, chapterNumber: number): DownloadRecord | undefined => {
      const key = buildChapterDownloadKey(versionId, bookId, chapterNumber);
      return downloadStates[key];
    },
    [downloadStates],
  );

  return {
    downloadStates,
    storageInfo,
    isLoading,
    getBookStatus,
    getChapterStatus,
    downloadBook,
    downloadChapter,
    deleteBook,
    deleteChapter,
    refresh: loadAllData,
  };
}
