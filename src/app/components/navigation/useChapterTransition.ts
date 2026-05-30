"use client";

import { useState, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionMode = 'slide' | 'curl' | 'fade' | 'scroll';

export interface TransitionState {
  /** Monotonically-incrementing key — changing this triggers AnimatePresence */
  key: number;
  /** Navigation direction for transition variants */
  direction: 'next' | 'prev';
}

// Lock durations per transition mode (ms) — how long to block new navigations
const LOCK_DURATIONS: Record<TransitionMode, number> = {
  slide: 480,
  curl:  900,
  fade:  380,
  scroll: 460,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useChapterTransition
 *
 * Centralized transition state manager that:
 *  - Atomically updates key + direction to avoid race conditions
 *  - Implements a navigation lock (prevents double-navigation / rapid-fire)
 *  - Exposes `navigateNext` / `navigatePrev` as stable callbacks
 *  - Exposes `isNavigating` boolean for UI feedback
 *
 * The caller is responsible for actually changing the chapter (book/chapter state)
 * AFTER calling navigateNext/navigatePrev, because this hook only manages the
 * visual transition key/direction — not the data.
 */
export function useChapterTransition(mode: TransitionMode) {
  const [transitionState, setTransitionState] = useState<TransitionState>({
    key: 0,
    direction: 'next',
  });

  const [isNavigating, setIsNavigating] = useState(false);

  /** Ref-based lock so gesture callbacks read the live value (avoids stale closure) */
  const isNavigatingRef = useRef(false);

  /** Unlock timer handle */
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Internal lock management ────────────────────────────────────────────

  const acquireLock = useCallback((lockDuration: number): boolean => {
    if (isNavigatingRef.current) return false;

    isNavigatingRef.current = true;
    setIsNavigating(true);

    // Clear any previous lock timer (safety net)
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

    lockTimerRef.current = setTimeout(() => {
      isNavigatingRef.current = false;
      setIsNavigating(false);
      lockTimerRef.current = null;
    }, lockDuration);

    return true;
  }, []);

  /** Force-release the lock (e.g. on interrupt/cancel) */
  const releaseLock = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    isNavigatingRef.current = false;
    setIsNavigating(false);
  }, []);

  // ── Public navigation triggers ──────────────────────────────────────────

  /**
   * Call this to trigger a "next chapter" transition animation.
   * Returns true if navigation was accepted, false if locked.
   */
  const navigateNext = useCallback((): boolean => {
    const lockDuration = LOCK_DURATIONS[mode];
    if (!acquireLock(lockDuration)) return false;

    setTransitionState(prev => ({
      key: prev.key + 1,
      direction: 'next',
    }));

    return true;
  }, [mode, acquireLock]);

  /**
   * Call this to trigger a "prev chapter" transition animation.
   * Returns true if navigation was accepted, false if locked.
   */
  const navigatePrev = useCallback((): boolean => {
    const lockDuration = LOCK_DURATIONS[mode];
    if (!acquireLock(lockDuration)) return false;

    setTransitionState(prev => ({
      key: prev.key + 1,
      direction: 'prev',
    }));

    return true;
  }, [mode, acquireLock]);

  /**
   * Direct check — useful inside gesture callbacks that need the live value.
   * Reading `isNavigating` state from a closure gives you the captured value;
   * this ref always returns the current truth.
   */
  const isNavigatingLive = useCallback((): boolean => {
    return isNavigatingRef.current;
  }, []);

  return {
    transitionState,
    isNavigating,
    isNavigatingLive,
    navigateNext,
    navigatePrev,
    releaseLock,
  };
}
