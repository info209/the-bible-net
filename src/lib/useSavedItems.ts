'use client';

import { useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  /** Save a new item. Optimistic update + request. */
  saveItem: (payload: SavePayloadClient) => Promise<SavedItemClient | undefined>;
  /** Unsave by the saved item's _id. Optimistic update + request. */
  unsaveItem: (id: string) => Promise<boolean>;
  /** Convenience toggle — saves or unsaves based on current state */
  toggleSave: (payload: SavePayloadClient) => Promise<void>;
}

export function useSavedItems(): UseSavedItemsReturn {
  const { data: session, status } = useSession();
  const userId = session?.user?.id as string | undefined;
  const queryClient = useQueryClient();

  const queryKeySavedItems = useMemo(() => ['saved-items', userId || 'anonymous'], [userId]);

  const { data: savedItems = [], isLoading } = useQuery<SavedItemClient[]>({
    queryKey: queryKeySavedItems,
    queryFn: async () => {
      const res = await fetch('/api/user/saved-items?limit=100');
      if (!res.ok) throw new Error('Failed to fetch saved items');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch saved items');
      return json.data as SavedItemClient[];
    },
    enabled: status === 'authenticated' && !!userId,
  });

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
      const res = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save item');
      const json = await res.json();
      if (!json.success || !json.data) throw new Error(json.error || 'Failed to save item');
      return json.data as SavedItemClient;
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

      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, (prev) => {
        if ((prev || []).some((i) => i.type === payload.type && i.refId === payload.refId)) {
          return prev;
        }
        return [optimistic, ...(prev || [])];
      });

      return { previousItems, optimistic };
    },
    onError: (err, payload, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeySavedItems, context.previousItems);
      }
    },
    onSuccess: (data, payload, context) => {
      // Replace optimistic entry with real one
      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, (prev) => {
        return (prev || []).map((i) => (i._id === context?.optimistic._id ? data : i));
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeySavedItems });
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
      const res = await fetch(`/api/user/save/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to unsave item');
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeySavedItems });
      const previousItems = queryClient.getQueryData<SavedItemClient[]>(queryKeySavedItems) || [];

      // Optimistic removal
      queryClient.setQueryData<SavedItemClient[]>(queryKeySavedItems, (prev) => {
        return (prev || []).filter((i) => i._id !== id);
      });

      return { previousItems };
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeySavedItems, context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeySavedItems });
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
