"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/context/ToastContext';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';
import { HomeOfflineService } from '@/lib/offline/HomeOfflineService';
import { useAuth } from '@/context/AuthContext';

export type LikeStatus = 'liked' | 'unliked';

export interface LikeState {
  desiredState: LikeStatus;
  serverState: LikeStatus;
  confirmedCount: number;
  inFlight: boolean;
}

interface LikeContextType {
  likes: Record<string, LikeState>;
  registerItem: (contentId: string, contentType: string, initialLiked: boolean, initialCount: number) => void;
  toggleLike: (contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion') => Promise<void>;
  setLikedStateDirectly: (contentId: string, contentType: string, liked: boolean, count?: number) => void;
}

const LikeContext = createContext<LikeContextType | undefined>(undefined);

// ── Helper: write server-confirmed like data directly into relevant caches ────
// Called after a successful like/unlike API response to avoid a full refetch
// (which causes a stale-prop re-registration race in the carousel ↔ modal).
function updateLikeInCache(
  queryClient: QueryClient,
  contentId: string,
  contentType: string,
  likeCount: number,
  liked: boolean,
) {
  const isVerse = contentType === 'daily-verse';
  const likeCountField = isVerse ? 'verseLikeCount' : 'devotionLikeCount';
  const isLikedField   = isVerse ? 'isVerseLiked'  : 'isDevotionLiked';

  const patcher = (prev: any[] | undefined) => {
    if (!Array.isArray(prev)) return prev;
    return prev.map((item: any) => {
      if (String(item._id) !== String(contentId)) return item;
      const updated = { ...item, [likeCountField]: likeCount, [isLikedField]: liked };
      // Also keep per-date slices in sync (populated by the daily queries)
      // These are keyed as ['daily-verse', date, version] and ['daily-devotion', date, version]
      if (item.date) {
        const allKeys = queryClient.getQueriesData({ queryKey: ['daily-verse', item.date] });
        allKeys.forEach(([key]) => {
          queryClient.setQueryData(key, (prev2: any) =>
            prev2 && String(prev2._id) === String(contentId) ? { ...prev2, [likeCountField]: likeCount, [isLikedField]: liked } : prev2
          );
        });
        const allKeys2 = queryClient.getQueriesData({ queryKey: ['daily-devotion', item.date] });
        allKeys2.forEach(([key]) => {
          queryClient.setQueryData(key, (prev2: any) =>
            prev2 && String(prev2._id) === String(contentId) ? { ...prev2, [likeCountField]: likeCount, [isLikedField]: liked } : prev2
          );
        });
      }
      return updated;
    });
  };

  // Update both list caches so the carousel and modal are always in sync
  queryClient.setQueriesData({ queryKey: ['daily-content-list'] }, patcher);
  queryClient.setQueriesData({ queryKey: ['daily-content-today'] }, patcher);
}

export function LikeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  
  // Keep mutable references for the sync loop to read latest state without re-creating functions
  const likesRef = useRef<Record<string, LikeState>>({});
  useEffect(() => {
    likesRef.current = likes;
  }, [likes]);

  // Listen for global sync completion to refresh server-authoritative state
  useEffect(() => {
    const handleSyncCompleted = () => {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
      queryClient.invalidateQueries({ queryKey: ['daily-content-list'] });
    };
    window.addEventListener('bible-sync-completed', handleSyncCompleted);
    return () => window.removeEventListener('bible-sync-completed', handleSyncCompleted);
  }, [queryClient]);

  const registerItem = useCallback((contentId: string, contentType: string, initialLiked: boolean, initialCount: number) => {
    const key = `${contentId}_${contentType}`;
    const initialVal: LikeStatus = initialLiked ? 'liked' : 'unliked';

    setLikes(prev => {
      const existing = prev[key];
      if (existing) {
        // If user has an active in-flight mutation or pending change, preserve their desired state
        if (existing.inFlight || existing.desiredState !== existing.serverState) {
          return prev;
        }
        // If server authoritative state updated, reconcile smoothly
        if (existing.serverState !== initialVal || existing.confirmedCount !== initialCount) {
          return {
            ...prev,
            [key]: {
              ...existing,
              desiredState: initialVal,
              serverState: initialVal,
              confirmedCount: initialCount,
            }
          };
        }
        return prev;
      }

      return {
        ...prev,
        [key]: {
          desiredState: initialVal,
          serverState: initialVal,
          confirmedCount: initialCount,
          inFlight: false,
        }
      };
    });
  }, []);

  // Sets state directly, helpful if syncing from LikesPage fetches
  const setLikedStateDirectly = useCallback((contentId: string, contentType: string, liked: boolean, count?: number) => {
    const key = `${contentId}_${contentType}`;
    const status: LikeStatus = liked ? 'liked' : 'unliked';
    setLikes(prev => {
      const existing = prev[key];
      const newConfirmedCount = count !== undefined
        ? count
        : (existing ? (liked ? existing.confirmedCount + 1 : Math.max(0, existing.confirmedCount - 1)) : 0);

      return {
        ...prev,
        [key]: {
          desiredState: status,
          serverState: status,
          confirmedCount: newConfirmedCount,
          inFlight: false,
        }
      };
    });
  }, []);

  // Sync logic execution runner
  const runSync = useCallback(async (contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion') => {
    const key = `${contentId}_${contentType}`;
    const state = likesRef.current[key];
    
    if (!state || state.inFlight) {
      return; // Already in-flight or not registered
    }

    // Check if we need to sync
    if (state.desiredState === state.serverState) {
      return; // Already in sync
    }

    const targetAction = state.desiredState === 'liked' ? 'like' : 'unlike';
    const clientMutationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    // Mark as in-flight
    setLikes(prev => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: { ...current, inFlight: true }
      };
    });

    try {
      const res = await fetch('/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type: contentType, action: targetAction, clientMutationId }),
      });

      if (!res.ok) {
        throw new Error(`API Request Failed with status ${res.status}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'API returned failure');
      }

      // Write server-confirmed counts directly into the cache.
      // This avoids a full refetch which would create a stale-prop race where the
      // carousel re-renders with old initialCount and overwrites the confirmed state.
      updateLikeInCache(queryClient, contentId, contentType, data.likeCount, data.liked);

      // Still invalidate the /likes profile page — it needs a fresh list fetch
      queryClient.invalidateQueries({ queryKey: ['likes'] });

      const newServerState: LikeStatus = data.liked ? 'liked' : 'unliked';
      const newCount = data.likeCount;

      // Update state with server results
      setLikes(prev => {
        const current = prev[key];
        if (!current) return prev;

        const updated = {
          ...current,
          serverState: newServerState,
          confirmedCount: newCount,
          inFlight: false
        };

        return {
          ...prev,
          [key]: updated
        };
      });

      // After updating, check if the desired state changed during our API call.
      // If it did, trigger sync again immediately.
      setTimeout(() => {
        const latestState = likesRef.current[key];
        if (latestState && latestState.desiredState !== latestState.serverState) {
          runSync(contentId, contentType);
        }
      }, 0);

    } catch (error) {
      console.error('Error syncing like state:', error);

      // If network is offline or connection dropped, do not revert optimistic state.
      // Enqueue to PendingActionsService so it syncs when connection returns.
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        HomeOfflineService.updateLikeInDailyCache(
          contentId,
          contentType,
          state.desiredState === 'liked',
          Math.max(0, state.confirmedCount + (state.desiredState === 'liked' ? 1 : 0) - (state.serverState === 'liked' ? 1 : 0)),
        ).catch(() => {});

        await PendingActionsService.enqueue(
          targetAction === 'like' ? 'like_content' : 'unlike_content',
          '/api/interactions/like',
          'POST',
          { contentId, type: contentType, action: targetAction, clientMutationId },
          { userId, clientMutationId }
        );
        setLikes(prev => {
          const current = prev[key];
          if (!current) return prev;
          return {
            ...prev,
            [key]: { ...current, inFlight: false }
          };
        });
        return;
      }

      // Revert desired state to the confirmed server state on genuine server failure
      setLikes(prev => {
        const current = prev[key];
        if (!current) return prev;
        
        toast.error('Unable to update like. Please try again.');

        return {
          ...prev,
          [key]: {
            ...current,
            desiredState: current.serverState,
            inFlight: false
          }
        };
      });
    }
  }, [queryClient, userId]);

  const toggleLike = useCallback(async (contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion') => {
    const key = `${contentId}_${contentType}`;
    const current = likesRef.current[key];
    if (!current) return;

    const newDesired: LikeStatus = current.desiredState === 'liked' ? 'unliked' : 'liked';
    const targetAction = newDesired === 'liked' ? 'like' : 'unlike';
    const clientMutationId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());

    // Calculate optimistic count
    const optimisticCount = Math.max(
      0,
      current.confirmedCount + (newDesired === 'liked' ? 1 : 0) - (current.serverState === 'liked' ? 1 : 0)
    );

    const newState = {
      ...likesRef.current,
      [key]: {
        ...current,
        desiredState: newDesired
      }
    };
    likesRef.current = newState;
    setLikes(newState);

    // Optimistically update React Query cache so carousel and modal sync immediately
    updateLikeInCache(queryClient, contentId, contentType, optimisticCount, newDesired === 'liked');

    // Also persist optimistic like to persistent IndexedDB storage (home_cache)
    HomeOfflineService.updateLikeInDailyCache(
      contentId,
      contentType,
      newDesired === 'liked',
      optimisticCount,
    ).catch(() => {});

    // If offline, enqueue to PendingActionsService directly
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await PendingActionsService.enqueue(
        targetAction === 'like' ? 'like_content' : 'unlike_content',
        '/api/interactions/like',
        'POST',
        { contentId, type: contentType, action: targetAction, clientMutationId },
        { userId, clientMutationId }
      );
      return;
    }

    // Run the synchronization loop in the background
    setTimeout(() => {
      runSync(contentId, contentType);
    }, 0);
  }, [queryClient, runSync, userId]);

  return (
    <LikeContext.Provider value={{ likes, registerItem, toggleLike, setLikedStateDirectly }}>
      {children}
    </LikeContext.Provider>
  );
}

export function useLikeContext() {
  const context = useContext(LikeContext);
  if (!context) {
    throw new Error('useLikeContext must be used within a LikeProvider');
  }
  return context;
}

export function useLikeState(
  contentId: string, 
  contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion',
  initialLiked?: boolean,
  initialCount?: number
) {
  const context = useContext(LikeContext);
  if (!context) {
    throw new Error('useLikeState must be used within a LikeProvider');
  }

  const { likes, registerItem, toggleLike } = context;
  const key = `${contentId}_${contentType}`;

  // Automatically register on mount if initial parameters are supplied
  useEffect(() => {
    if (initialLiked !== undefined && initialCount !== undefined) {
      registerItem(contentId, contentType, initialLiked, initialCount);
    }
  }, [contentId, contentType, initialLiked, initialCount, registerItem]);

  const itemState = likes[key];

  if (!itemState) {
    return {
      isLiked: !!initialLiked,
      likeCount: initialCount ?? 0,
      toggleLike: () => toggleLike(contentId, contentType),
      isPending: false,
    };
  }

  const isLiked = itemState.desiredState === 'liked';
  const likeCount = itemState.confirmedCount + 
    (itemState.desiredState === 'liked' ? 1 : 0) - 
    (itemState.serverState === 'liked' ? 1 : 0);

  return {
    isLiked,
    likeCount: Math.max(0, likeCount),
    toggleLike: () => toggleLike(contentId, contentType),
    isPending: itemState.inFlight,
  };
}
