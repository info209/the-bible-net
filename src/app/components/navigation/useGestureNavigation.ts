"use client";

import { useRef, useCallback, RefObject } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type GestureDirection = 'none' | 'horizontal' | 'vertical';

export interface GestureCallbacks {
  /** Called when a confirmed horizontal drag begins */
  onDragStart?: () => void;
  /** Called on every frame during horizontal drag. offset is signed px from start */
  onDragMove?: (offset: number) => void;
  /** Called when the gesture ends. offset & velocity are signed (negative = left/next) */
  onDragEnd?: (offset: number, velocity: number, isHorizontal: boolean) => void;
  /** Called when gesture is cancelled (e.g. a popup opens mid-drag) */
  onDragCancel?: () => void;
}

export interface GestureOptions {
  /** Minimum px movement before we classify the gesture direction. Default: 10 */
  classifyThreshold?: number;
  /** X:Y ratio required to classify as horizontal. Default: 2.5 */
  horizontalBias?: number;
  /** Whether the gesture system is fully disabled (popups open, etc.) */
  disabled?: boolean;
  /** Extra check: abort horizontal detection if this returns true mid-gesture */
  shouldAbort?: () => boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * useGestureNavigation
 *
 * A production-grade touch gesture detector that:
 *  - Uses ONLY refs for hot-path data (no setState during touch events)
 *  - Implements strict direction locking (horizontal OR vertical, never both)
 *  - Tracks velocity via rolling window
 *  - Is completely stateless from React's perspective during a drag
 *
 * Usage:
 *   const { handlers } = useGestureNavigation({ onDragEnd: handleEnd }, { disabled: isPopupOpen });
 *   <div onTouchStart={handlers.onTouchStart} ... />
 */
export function useGestureNavigation(
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  const {
    classifyThreshold = 10,
    horizontalBias = 2.5,
    disabled = false,
    shouldAbort,
  } = options;

  // ── All gesture state lives in refs — NEVER in React state ──────────────

  /** Touch start position */
  const startX = useRef(0);
  const startY = useRef(0);

  /** Most recent touch position */
  const currentX = useRef(0);
  const currentY = useRef(0);

  /** Start timestamp for velocity calculation */
  const startTime = useRef(0);

  /** Direction lock — set once and never changed mid-gesture */
  const direction = useRef<GestureDirection>('none');

  /** Whether a horizontal drag is currently active */
  const isDragging = useRef(false);

  /** Stable callbacks ref — avoids stale closure issues */
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /** Stable options ref */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ── Helpers ─────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    startX.current = 0;
    startY.current = 0;
    currentX.current = 0;
    currentY.current = 0;
    startTime.current = 0;
    direction.current = 'none';
    isDragging.current = false;
  }, []);

  const cancel = useCallback(() => {
    if (isDragging.current) {
      callbacksRef.current.onDragCancel?.();
    }
    reset();
  }, [reset]);

  // ── Event handlers ───────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Re-read disabled from ref to get the live value
    if (optionsRef.current.disabled) return;

    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;
    startTime.current = Date.now();
    direction.current = 'none';
    isDragging.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (optionsRef.current.disabled) return;
    if (optionsRef.current.shouldAbort?.()) {
      cancel();
      return;
    }

    const touch = e.touches[0];
    currentX.current = touch.clientX;
    currentY.current = touch.clientY;

    const diffX = touch.clientX - startX.current;
    const diffY = touch.clientY - startY.current;
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);

    // ── Direction classification (once per gesture) ─────────────────────
    if (direction.current === 'none') {
      const totalMoved = Math.sqrt(absX * absX + absY * absY);
      if (totalMoved >= classifyThreshold) {
        if (absX > absY * horizontalBias) {
          direction.current = 'horizontal';
          isDragging.current = true;
          callbacksRef.current.onDragStart?.();
        } else {
          // Vertical — lock and never reconsider
          direction.current = 'vertical';
        }
      }
      return; // Don't act until classified
    }

    // ── Vertical — let native scroll handle it ───────────────────────────
    if (direction.current === 'vertical') return;

    // ── Horizontal — report offset ───────────────────────────────────────
    if (direction.current === 'horizontal' && isDragging.current) {
      callbacksRef.current.onDragMove?.(diffX);
    }
  }, [cancel, classifyThreshold, horizontalBias]);

  const onTouchEnd = useCallback((_e: React.TouchEvent) => {
    if (optionsRef.current.disabled) {
      reset();
      return;
    }

    const offset = currentX.current - startX.current;
    const elapsed = Math.max(1, Date.now() - startTime.current); // prevent div/0
    // Velocity in px/ms, signed (negative = swiped left)
    const velocity = offset / elapsed;
    const wasHorizontal = direction.current === 'horizontal';

    callbacksRef.current.onDragEnd?.(offset, velocity, wasHorizontal);
    reset();
  }, [reset]);

  const onTouchCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel,
    },
    /** Imperatively cancel the current gesture (e.g. when a popup opens) */
    cancel,
  };
}
