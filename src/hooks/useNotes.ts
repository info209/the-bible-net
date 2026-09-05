'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';

export interface NoteItem {
  _id: string;
  noteText: string;
  labels: string[];
  verses: Array<{
    bookId: string;
    bookName: string;
    chapter: number;
    verses: number[];
    verseText?: string;
  }>;
  version?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotePayload {
  noteText: string;
  labels?: string[];
  verses?: Array<{
    bookId: string;
    bookName: string;
    chapter: number;
    verses: number[];
    verseText?: string;
  }>;
  version?: string;
}

export function useNotes() {
  const { session, isAuthenticated } = useAuth();
  const userId = session?.user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKeyNotes = useMemo(() => ['notes', userId || 'anonymous'], [userId]);

  const { data: notes = [], isLoading } = useQuery<NoteItem[]>({
    queryKey: queryKeyNotes,
    queryFn: () =>
      fetchWithOfflineCache(`notes_${userId || 'anonymous'}`, async () => {
        const res = await fetch('/api/notes');
        if (!res.ok) throw new Error('Failed to fetch notes');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch notes');
        return (json.data || []) as NoteItem[];
      }),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // Listen for sync completion to refresh
  useEffect(() => {
    const handleSyncCompleted = () => {
      queryClient.invalidateQueries({ queryKey: queryKeyNotes });
    };
    window.addEventListener('bible-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('bible-sync-completed', handleSyncCompleted);
  }, [queryClient, queryKeyNotes]);

  const createNoteMutation = useMutation({
    mutationFn: async (payload: CreateNotePayload) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'add_note',
          '/api/notes',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          noteText: payload.noteText,
          labels: payload.labels || [],
          verses: payload.verses || [],
          version: payload.version,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as NoteItem;
      }

      try {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create note');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to create note');
        return json.data as NoteItem;
      } catch (err) {
        await PendingActionsService.enqueue(
          'add_note',
          '/api/notes',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          noteText: payload.noteText,
          labels: payload.labels || [],
          verses: payload.verses || [],
          version: payload.version,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as NoteItem;
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeyNotes });
      const previousNotes = queryClient.getQueryData<NoteItem[]>(queryKeyNotes) || [];

      const optimistic: NoteItem = {
        _id: `opt_${Date.now()}`,
        noteText: payload.noteText,
        labels: payload.labels || [],
        verses: payload.verses || [],
        version: payload.version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [optimistic, ...previousNotes];
      queryClient.setQueryData<NoteItem[]>(queryKeyNotes, updated);
      ModuleOfflineService.saveCache(`notes_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousNotes, optimistic };
    },
    onSuccess: (data, payload, context) => {
      queryClient.setQueryData<NoteItem[]>(queryKeyNotes, (prev) => {
        const list = (prev || []).map((n) => (n._id === context?.optimistic._id ? data : n));
        ModuleOfflineService.saveCache(`notes_${userId || 'anonymous'}`, list).catch(() => {});
        return list;
      });
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeyNotes });
      }
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CreateNotePayload> }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'edit_note',
          `/api/notes/${id}`,
          'PATCH',
          payload as unknown as Record<string, unknown>,
        );
        return { _id: id, ...payload } as unknown as NoteItem;
      }

      try {
        const res = await fetch(`/api/notes/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update note');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to update note');
        return json.data as NoteItem;
      } catch (err) {
        await PendingActionsService.enqueue(
          'edit_note',
          `/api/notes/${id}`,
          'PATCH',
          payload as unknown as Record<string, unknown>,
        );
        return { _id: id, ...payload } as unknown as NoteItem;
      }
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeyNotes });
      const previousNotes = queryClient.getQueryData<NoteItem[]>(queryKeyNotes) || [];

      const updated = previousNotes.map((n) =>
        n._id === id ? { ...n, ...payload, updatedAt: new Date().toISOString() } : n,
      );

      queryClient.setQueryData<NoteItem[]>(queryKeyNotes, updated);
      ModuleOfflineService.saveCache(`notes_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousNotes };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData<NoteItem[]>(queryKeyNotes, (prev) => {
        const list = (prev || []).map((n) => (n._id === variables.id ? { ...n, ...data } : n));
        ModuleOfflineService.saveCache(`notes_${userId || 'anonymous'}`, list).catch(() => {});
        return list;
      });
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeyNotes });
      }
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'delete_note',
          `/api/notes/${id}`,
          'DELETE',
          { id },
        );
        return;
      }

      try {
        const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete note');
      } catch (err) {
        await PendingActionsService.enqueue(
          'delete_note',
          `/api/notes/${id}`,
          'DELETE',
          { id },
        );
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeyNotes });
      const previousNotes = queryClient.getQueryData<NoteItem[]>(queryKeyNotes) || [];

      const updated = previousNotes.filter((n) => n._id !== id);
      queryClient.setQueryData<NoteItem[]>(queryKeyNotes, updated);
      ModuleOfflineService.saveCache(`notes_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousNotes };
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeyNotes });
      }
    },
  });

  const createNote = useCallback(
    async (payload: CreateNotePayload) => {
      return await createNoteMutation.mutateAsync(payload);
    },
    [createNoteMutation],
  );

  const updateNote = useCallback(
    async (id: string, payload: Partial<CreateNotePayload>) => {
      return await updateNoteMutation.mutateAsync({ id, payload });
    },
    [updateNoteMutation],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      return await deleteNoteMutation.mutateAsync(id);
    },
    [deleteNoteMutation],
  );

  return {
    notes,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
  };
}
