'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SavedVerseClient {
  _id: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verses: number[];
  verseRangeText: string;
  labels: string[];
  note: string;
  version?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveVersePayload {
  bookId: string;
  bookName: string;
  chapter: number;
  verses: number[];
  verseRangeText: string;
  labels?: string[];
  note?: string;
  version?: string;
  isPrivate?: boolean;
}

export interface UpdateVersePayload {
  labels?: string[];
  note?: string;
  isPrivate?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Build a human-readable verse range string like "Genesis 1:2, 5-7" */
export function buildVerseRangeText(
  bookName: string,
  chapter: number,
  verses: number[]
): string {
  if (!verses.length) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      if (i < sorted.length) {
        start = sorted[i];
        end = start;
      }
    }
  }
  return `${bookName} ${chapter}:${ranges.join(', ')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseSavedVersesReturn {
  savedVerses: SavedVerseClient[];
  isLoading: boolean;
  userLabels: string[];
  isLabelsLoading: boolean;

  /** Check if any of the given verse numbers overlap with an existing save in the chapter */
  isSaved: (bookId: string, chapter: number, verses: number[]) => boolean;

  /** Get the save document for a given (bookId, chapter, verses) selection */
  getSavedVerse: (bookId: string, chapter: number, verses: number[]) => SavedVerseClient | undefined;

  /** All verse numbers that have been saved in the given (bookId, chapter) */
  savedVerseIdsForChapter: (bookId: string, chapter: number) => number[];

  /** Save (upsert) verses — optimistic update + offline queue */
  saveVerse: (payload: SaveVersePayload) => Promise<void>;

  /** Update an existing save — optimistic update + offline queue */
  updateSavedVerse: (id: string, patch: UpdateVersePayload) => Promise<void>;

  /** Delete a save — optimistic update + offline queue */
  deleteSavedVerse: (id: string) => Promise<void>;

  /** Add a user-created label to DB */
  addUserLabel: (label: string) => Promise<void>;

  /** Refresh saved verses from server */
  refresh: () => Promise<void>;
}

export function useSavedVerses(): UseSavedVersesReturn {
  const { session, isAuthenticated } = useAuth();
  const userId = session?.user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKeySavedVerses = useMemo(() => ['saved-verses', userId || 'anonymous'], [userId]);
  const queryKeyUserLabels = useMemo(() => ['user-labels', userId || 'anonymous'], [userId]);

  const { data: savedVerses = [], isLoading } = useQuery<SavedVerseClient[]>({
    queryKey: queryKeySavedVerses,
    queryFn: () =>
      fetchWithOfflineCache(`saved_verses_${userId || 'anonymous'}`, async () => {
        const res = await fetch('/api/saved-verses?limit=200');
        if (!res.ok) throw new Error('Failed to fetch saved verses');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch saved verses');
        return json.data as SavedVerseClient[];
      }),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const { data: userLabels = [], isLoading: isLabelsLoading } = useQuery<string[]>({
    queryKey: queryKeyUserLabels,
    queryFn: () =>
      fetchWithOfflineCache(`user_labels_${userId || 'anonymous'}`, async () => {
        const res = await fetch('/api/user-labels');
        if (!res.ok) throw new Error('Failed to fetch user labels');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch user labels');
        return json.data as string[];
      }),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // Listen for sync completion to refresh
  useEffect(() => {
    const handleSyncCompleted = () => {
      queryClient.invalidateQueries({ queryKey: queryKeySavedVerses });
      queryClient.invalidateQueries({ queryKey: queryKeyUserLabels });
    };
    window.addEventListener('bible-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('bible-sync-completed', handleSyncCompleted);
  }, [queryClient, queryKeySavedVerses, queryKeyUserLabels]);

  const isSaved = useCallback(
    (bookId: string, chapter: number, verses: number[]): boolean => {
      if (!verses.length) return false;
      return savedVerses.some(
        (sv) =>
          sv.bookId === bookId &&
          sv.chapter === chapter &&
          verses.some((v) => sv.verses.includes(v))
      );
    },
    [savedVerses]
  );

  const getSavedVerse = useCallback(
    (bookId: string, chapter: number, verses: number[]): SavedVerseClient | undefined => {
      if (!verses.length) return undefined;
      return savedVerses.find(
        (sv) =>
          sv.bookId === bookId &&
          sv.chapter === chapter &&
          verses.some((v) => sv.verses.includes(v))
      );
    },
    [savedVerses]
  );

  const savedVerseIdsForChapter = useCallback(
    (bookId: string, chapter: number): number[] => {
      return savedVerses
        .filter((sv) => sv.bookId === bookId && sv.chapter === chapter)
        .flatMap((sv) => sv.verses);
    },
    [savedVerses]
  );

  const saveVerseMutation = useMutation({
    mutationFn: async (payload: SaveVersePayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        // Enqueue action for background sync when back online
        await PendingActionsService.enqueue(
          'save_verse',
          '/api/saved-verses',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          bookId: payload.bookId,
          bookName: payload.bookName,
          chapter: payload.chapter,
          verses: [...payload.verses].sort((a, b) => a - b),
          verseRangeText: payload.verseRangeText,
          labels: payload.labels ?? [],
          note: payload.note ?? '',
          version: payload.version,
          isPrivate: payload.isPrivate ?? false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as SavedVerseClient;
      }

      try {
        const res = await fetch('/api/saved-verses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save verse');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to save verse');
        return json.data as SavedVerseClient;
      } catch (err) {
        // Fallback to queueing if network error occurs
        await PendingActionsService.enqueue(
          'save_verse',
          '/api/saved-verses',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          ...payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as unknown as SavedVerseClient;
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedVerses });
      const previousVerses = queryClient.getQueryData<SavedVerseClient[]>(queryKeySavedVerses) || [];

      // Optimistic insert
      const optimistic: SavedVerseClient = {
        _id: `opt_${Date.now()}`,
        bookId: payload.bookId,
        bookName: payload.bookName,
        chapter: payload.chapter,
        verses: [...payload.verses].sort((a, b) => a - b),
        verseRangeText: payload.verseRangeText,
        labels: payload.labels ?? [],
        note: payload.note ?? '',
        version: payload.version,
        isPrivate: payload.isPrivate ?? false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [
        optimistic,
        ...previousVerses.filter(
          (sv) =>
            !(
              sv.bookId === payload.bookId &&
              sv.chapter === payload.chapter &&
              payload.verses.some((v) => sv.verses.includes(v))
            ),
        ),
      ];

      queryClient.setQueryData<SavedVerseClient[]>(queryKeySavedVerses, updated);
      ModuleOfflineService.saveCache(`saved_verses_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousVerses, optimistic };
    },
    onSuccess: (data, payload, context) => {
      queryClient.setQueryData<SavedVerseClient[]>(queryKeySavedVerses, (prev) => {
        const list = (prev || []).map((sv) => (sv._id === context?.optimistic._id ? data : sv));
        ModuleOfflineService.saveCache(`saved_verses_${userId || 'anonymous'}`, list).catch(() => {});
        return list;
      });
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeySavedVerses });
      }
    },
  });

  const saveVerse = useCallback(async (payload: SaveVersePayload) => {
    await saveVerseMutation.mutateAsync(payload);
  }, [saveVerseMutation]);

  const updateSavedVerseMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateVersePayload }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'save_verse',
          `/api/saved-verses/${id}`,
          'PATCH',
          patch as unknown as Record<string, unknown>,
        );
        return { _id: id, ...patch } as unknown as SavedVerseClient;
      }

      try {
        const res = await fetch(`/api/saved-verses/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error('Failed to update saved verse');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to update saved verse');
        return json.data as SavedVerseClient;
      } catch (err) {
        await PendingActionsService.enqueue(
          'save_verse',
          `/api/saved-verses/${id}`,
          'PATCH',
          patch as unknown as Record<string, unknown>,
        );
        return { _id: id, ...patch } as unknown as SavedVerseClient;
      }
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedVerses });
      const previousVerses = queryClient.getQueryData<SavedVerseClient[]>(queryKeySavedVerses) || [];

      const updated = previousVerses.map((sv) => {
        if (sv._id === id) {
          return { ...sv, ...patch, updatedAt: new Date().toISOString() };
        }
        return sv;
      });

      queryClient.setQueryData<SavedVerseClient[]>(queryKeySavedVerses, updated);
      ModuleOfflineService.saveCache(`saved_verses_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousVerses };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<SavedVerseClient[]>(queryKeySavedVerses, (prev) => {
        const list = (prev || []).map((sv) => (sv._id === variables.id ? { ...sv, ...data } : sv));
        ModuleOfflineService.saveCache(`saved_verses_${userId || 'anonymous'}`, list).catch(() => {});
        return list;
      });
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeySavedVerses });
      }
    },
  });

  const updateSavedVerse = useCallback(async (id: string, patch: UpdateVersePayload) => {
    await updateSavedVerseMutation.mutateAsync({ id, patch });
  }, [updateSavedVerseMutation]);

  const deleteSavedVerseMutation = useMutation({
    mutationFn: async (id: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'delete_verse',
          `/api/saved-verses/${id}`,
          'DELETE',
          { id },
        );
        return;
      }

      try {
        const res = await fetch(`/api/saved-verses/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete saved verse');
      } catch (err) {
        await PendingActionsService.enqueue(
          'delete_verse',
          `/api/saved-verses/${id}`,
          'DELETE',
          { id },
        );
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedVerses });
      const previousVerses = queryClient.getQueryData<SavedVerseClient[]>(queryKeySavedVerses) || [];

      const updated = previousVerses.filter((sv) => sv._id !== id);
      queryClient.setQueryData<SavedVerseClient[]>(queryKeySavedVerses, updated);
      ModuleOfflineService.saveCache(`saved_verses_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousVerses };
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeySavedVerses });
      }
    },
  });

  const deleteSavedVerse = useCallback(async (id: string) => {
    await deleteSavedVerseMutation.mutateAsync(id);
  }, [deleteSavedVerseMutation]);

  const addUserLabelMutation = useMutation({
    mutationFn: async (label: string) => {
      const trimmed = label.trim();
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) return;

      const res = await fetch('/api/user-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to add user label');
    },
    onMutate: async (label) => {
      const trimmed = label.trim();
      await queryClient.cancelQueries({ queryKey: queryKeyUserLabels });
      const previousLabels = queryClient.getQueryData<string[]>(queryKeyUserLabels) || [];

      const updated = (previousLabels || []).some((l) => l.toLowerCase() === trimmed.toLowerCase())
        ? previousLabels
        : [trimmed, ...(previousLabels || [])];

      queryClient.setQueryData<string[]>(queryKeyUserLabels, updated);
      ModuleOfflineService.saveCache(`user_labels_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousLabels };
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeyUserLabels });
      }
    },
  });

  const addUserLabel = useCallback(async (label: string) => {
    await addUserLabelMutation.mutateAsync(label);
  }, [addUserLabelMutation]);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.refetchQueries({ queryKey: queryKeySavedVerses }),
      queryClient.refetchQueries({ queryKey: queryKeyUserLabels }),
    ]);
  }, [queryClient, queryKeySavedVerses, queryKeyUserLabels]);

  return {
    savedVerses,
    isLoading,
    userLabels,
    isLabelsLoading,
    isSaved,
    getSavedVerse,
    savedVerseIdsForChapter,
    saveVerse,
    updateSavedVerse,
    deleteSavedVerse,
    addUserLabel,
    refresh,
  };
}
