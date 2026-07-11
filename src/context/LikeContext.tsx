"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/context/ToastContext';
import { useQueryClient } from '@tanstack/react-query';

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

export function LikeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [likes, setLikes] = useState<Record<string, LikeState>>({});
  
  // Keep mutable references for the sync loop to read latest state without re-creating functions
  const likesRef = useRef<Record<string, LikeState>>({});
  useEffect(() => {
    likesRef.current = likes;
  }, [likes]);

  const registerItem = useCallback((contentId: string, contentType: string, initialLiked: boolean, initialCount: number) => {
    const key = `${contentId}_${contentType}`;
    const initialVal: LikeStatus = initialLiked ? 'liked' : 'unliked';

    setLikes(prev => {
      const existing = prev[key];
      if (existing) {
        // If there's an in-flight request or a pending mutation state, preserve it.
        if (existing.inFlight || existing.desiredState !== existing.serverState) {
          return prev;
        }
        // If no changes, avoid unnecessary state updates
        if (existing.serverState === initialVal && existing.confirmedCount === initialCount) {
          return prev;
        }
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
        body: JSON.stringify({ contentId, type: contentType }),
      });

      if (!res.ok) {
        throw new Error('API Request Failed');
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'API returned failure');
      }

      // Invalidate queries to sync state across views
      queryClient.invalidateQueries({ queryKey: ['daily-content-list'] });
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

      // Revert desired state to the confirmed server state
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
  }, []);

  const toggleLike = useCallback(async (contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion') => {
    const key = `${contentId}_${contentType}`;
    
    setLikes(prev => {
      const current = prev[key];
      if (!current) return prev;

      const newDesired: LikeStatus = current.desiredState === 'liked' ? 'unliked' : 'liked';

      const newState = {
        ...prev,
        [key]: {
          ...current,
          desiredState: newDesired
        }
      };

      // Keep ref perfectly in sync for the immediately following setTimeout
      likesRef.current = newState;
      return newState;
    });

    // Run the synchronization loop in the background
    setTimeout(() => {
      runSync(contentId, contentType);
    }, 0);
  }, [runSync]);

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
