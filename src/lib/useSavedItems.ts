'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
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
  saveItem: (payload: SavePayloadClient) => Promise<void>;
  /** Unsave by the saved item's _id. Optimistic update + request. */
  unsaveItem: (id: string) => Promise<void>;
  /** Convenience toggle — saves or unsaves based on current state */
  toggleSave: (payload: SavePayloadClient) => Promise<void>;
}

export function useSavedItems(): UseSavedItemsReturn {
  const { data: session, status } = useSession();
  const [savedItems, setSavedItems] = useState<SavedItemClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Prevent concurrent requests for the same item
  const pendingRef = useRef<Set<string>>(new Set());

  const userId = session?.user?.id as string | undefined;

  // Fetch all saved items once the user session is confirmed,
  // and re-fetch whenever the authenticated user's identity changes.
  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clear any data cached from a previous user
      setSavedItems([]);
      return;
    }

    if (status !== 'authenticated' || !userId) return;

    const fetchSaved = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/user/saved-items?limit=100');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success) {
          setSavedItems(json.data as SavedItemClient[]);
        }
      } catch (err) {
        console.error('[useSavedItems] fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    setSavedItems([]);
    fetchSaved();
  }, [status, userId]);

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

  const saveItem = useCallback(
    async (payload: SavePayloadClient) => {
      const key = `${payload.type}:${payload.refId}`;
      if (pendingRef.current.has(key)) return;
      pendingRef.current.add(key);

      // Optimistic: add a placeholder immediately
      const optimistic: SavedItemClient = {
        _id: `opt_${Date.now()}`,
        type: payload.type,
        refId: payload.refId,
        metadata: payload.metadata ?? {},
        createdAt: new Date().toISOString(),
      };
      setSavedItems((prev) => {
        if (prev.some((i) => i.type === payload.type && i.refId === payload.refId))
          return prev;
        return [optimistic, ...prev];
      });

      try {
        const res = await fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.success && json.data) {
          // Replace optimistic entry with real one
          setSavedItems((prev) =>
            prev.map((i) => (i._id === optimistic._id ? (json.data as SavedItemClient) : i))
          );
        }
      } catch (err) {
        // Revert on error
        setSavedItems((prev) => prev.filter((i) => i._id !== optimistic._id));
        console.error('[useSavedItems] saveItem error:', err);
      } finally {
        pendingRef.current.delete(key);
      }
    },
    []
  );

  const unsaveItem = useCallback(async (id: string) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);

    // Optimistic removal
    let removed: SavedItemClient | undefined;
    setSavedItems((prev) => {
      removed = prev.find((i) => i._id === id);
      return prev.filter((i) => i._id !== id);
    });

    try {
      const res = await fetch(`/api/user/save/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        // Revert
        if (removed) setSavedItems((prev) => [removed!, ...prev]);
      }
    } catch (err) {
      if (removed) setSavedItems((prev) => [removed!, ...prev]);
      console.error('[useSavedItems] unsaveItem error:', err);
    } finally {
      pendingRef.current.delete(id);
    }
  }, []);

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
