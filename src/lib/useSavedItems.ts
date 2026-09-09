'use client';

import { useCallback, useMemo, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';
import type { SavedItemType, ISavedItemMetadata } from '@/models/SavedItem';

export interface SavedItemClient {
  _id: string;
  type: SavedItemType;
  refId: string;
  metadata: ISavedItemMetadata;
  createdAt: string;
}

export interface SavePayloadClient {
  type: SavedItemType;
  refId: string;
  metadata?: ISavedItemMetadata;
}

interface UseSavedItemsReturn {
  savedItems: SavedItemClient[];
  isLoading: boolean;
  /** Check whether a given (type, refId) is currently saved */
  isSaved: (type: SavedItemType, refId: string) => boolean;
  /** Get the saved item document for a given (type, refId) — needed to get its _id for unsave */
  getSavedItem: (type: SavedItemType, refId: string) => SavedItemClient | undefined;
  /** Save a new item. Optimistic update + request / offline queue. */
  saveItem: (payload: SavePayloadClient) => Promise<SavedItemClient | undefined>;
  /** Unsave by the saved item's _id. Optimistic update + request / offline queue. */
  unsaveItem: (id: string) => Promise<boolean>;
  /** Convenience toggle — saves or unsaves based on current state */
  toggleSave: (payload: SavePayloadClient) => Promise<void>;
}

export function useSavedItems(): UseSavedItemsReturn {
  const { session, isAuthenticated } = useAuth();
  const userId = session?.user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKeySavedItems = useMemo(() => ['saved-items', userId || 'anonymous'], [userId]);

  const { data: savedItems = [], isLoading } = useQuery<SavedItemClient[]>({
    queryKey: queryKeySavedItems,
    queryFn: () =>
      fetchWithOfflineCache(`saved_items_${userId || 'anonymous'}`, async () => {
        const res = await fetch('/api/user/saved-items?limit=200');
        if (!res.ok) throw new Error('Failed to fetch saved items');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch saved items');
        return json.data as SavedItemClient[];
      }),
    enabled: isAuthenticated && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // Listen for sync completion
  useEffect(() => {
    const handleSyncCompleted = () => {
      queryClient.invalidateQueries({ queryKey: queryKeySavedItems });
    };
    window.addEventListener('bible-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('bible-sync-completed', handleSyncCompleted);
  }, [queryClient, queryKeySavedItems]);

  const isSaved = useCallback(
    (type: SavedItemType, refId: string) =>
      savedItems.some((i) => i.type === type && i.refId === refId),
    [savedItems]
  );

  const getSavedItem = useCallback(
    (type: SavedItemType, refId: string) =>
      savedItems.find((i) => i.type === type && i.refId === refId),
    [savedItems]
  );

  const saveItemMutation = useMutation({
    mutationFn: async (payload: SavePayloadClient) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        const actionType = payload.type === 'highlight' ? 'add_highlight' : 'save_item';
        await PendingActionsService.enqueue(
          actionType,
          '/api/user/save',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          type: payload.type,
          refId: payload.refId,
          metadata: payload.metadata ?? {},
          createdAt: new Date().toISOString(),
        } as SavedItemClient;
      }

      try {
        const res = await fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to save item');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error(json.error || 'Failed to save item');
        return json.data as SavedItemClient;
      } catch (err) {
        const actionType = payload.type === 'highlight' ? 'add_highlight' : 'save_item';
        await PendingActionsService.enqueue(
          actionType,
          '/api/user/save',
          'POST',
          payload as unknown as Record<string, unknown>,
        );
        return {
          _id: `offline_${Date.now()}`,
          type: payload.type,
          refId: payload.refId,
          metadata: payload.metadata ?? {},
          createdAt: new Date().toISOString(),
        } as SavedItemClient;
      }
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedItems });
      const previousItems = queryClient.getQueryData<SavedItemClient[]>(queryKeySavedItems) || [];

      // Optimistic: add a placeholder immediately
      const optimistic: SavedItemClient = {
        _id: `opt_${Date.now()}`,
        type: payload.type,
        refId: payload.refId,
        metadata: payload.metadata ?? {},
        createdAt: new Date().toISOString(),
      };

      const updated = (previousItems || []).some(
        (i) => i.type === payload.type && i.refId === payload.refId,
      )
        ? previousItems
        : [optimistic, ...(previousItems || [])];

      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, updated);
      ModuleOfflineService.saveCache(`saved_items_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousItems, optimistic };
    },
    onSuccess: (data, payload, context) => {
      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, (prev) => {
        const list = (prev || []).map((i) => (i._id === context?.optimistic._id ? data : i));
        ModuleOfflineService.saveCache(`saved_items_${userId || 'anonymous'}`, list).catch(() => {});
        return list;
      });
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeySavedItems });
      }
    },
  });

  const saveItem = useCallback(
    async (payload: SavePayloadClient) => {
      try {
        return await saveItemMutation.mutateAsync(payload);
      } catch (err) {
        console.error('[useSavedItems] saveItem error:', err);
        return undefined;
      }
    },
    [saveItemMutation]
  );

  const unsaveItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'delete_item',
          `/api/user/save/${id}`,
          'DELETE',
          { id },
        );
        return;
      }

      try {
        const res = await fetch(`/api/user/save/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to unsave item');
      } catch (err) {
        await PendingActionsService.enqueue(
          'delete_item',
          `/api/user/save/${id}`,
          'DELETE',
          { id },
        );
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedItems });
      const previousItems = queryClient.getQueryData<SavedItemClient[]>(queryKeySavedItems) || [];

      const updated = (previousItems || []).filter((i) => i._id !== id);
      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, updated);
      ModuleOfflineService.saveCache(`saved_items_${userId || 'anonymous'}`, updated).catch(() => {});

      return { previousItems };
    },
    onSettled: () => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        queryClient.invalidateQueries({ queryKey: queryKeySavedItems });
      }
    },
  });

  const unsaveItem = useCallback(
    async (id: string) => {
      try {
        await unsaveItemMutation.mutateAsync(id);
        return true;
      } catch (err) {
        console.error('[useSavedItems] unsaveItem error:', err);
        return false;
      }
    },
    [unsaveItemMutation]
  );

  const toggleSave = useCallback(
    async (payload: SavePayloadClient) => {
      const existing = getSavedItem(payload.type, payload.refId);
      if (existing) {
        await unsaveItem(existing._id);
      } else {
        await saveItem(payload);
      }
    },
    [getSavedItem, saveItem, unsaveItem]
  );

  return { savedItems, isLoading, isSaved, getSavedItem, saveItem, unsaveItem, toggleSave };
}
