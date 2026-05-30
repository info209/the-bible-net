"use client";

import { useRef, useCallback, useEffect } from 'react';

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
 *  - Attaches NATIVE DOM listeners to the container element via useEffect
 *    (React synthetic events cannot be used because child verse elements call
 *     e.stopPropagation() in their long-press handlers, which blocks synthetic
 *     events from bubbling. Native listeners registered on the container fire
 *     independently of React's synthetic event system.)
 *  - Uses ONLY refs for hot-path data (no setState during touch events)
 *  - Implements strict direction locking (horizontal OR vertical, never both)
 *  - Tracks velocity via elapsed time
 *  - Is completely stateless from React's perspective during a drag
 *
 * Usage:
 *   const { containerRef } = useGestureNavigation({ onDragEnd: handleEnd }, { disabled: isPopupOpen });
 *   <div ref={containerRef} ... />
 */
export function useGestureNavigation(
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  // ── Stable refs ────────────────────────────────────────────────────────────

  /** Container element ref — attach to the reading area div */
  const containerRef = useRef<HTMLElement | null>(null);

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

  /** Active touch identifier (to ignore secondary fingers) */
  const activeTouchId = useRef<number | null>(null);

  /** Stable callbacks ref — avoids stale closure issues */
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /** Stable options ref — reads live values from event handlers */
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
    activeTouchId.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (isDragging.current) {
      callbacksRef.current.onDragCancel?.();
    }
    reset();
  }, [reset]);

  // ── Native DOM event handlers ────────────────────────────────────────────
  // These are registered directly on the DOM node so they fire regardless of
  // what child React components do with synthetic events (e.g. stopPropagation).

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (optionsRef.current.disabled) return;
      // Only track the first finger
      if (activeTouchId.current !== null) return;

      const touch = e.touches[0];
      activeTouchId.current = touch.identifier;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      currentX.current = touch.clientX;
      currentY.current = touch.clientY;
      startTime.current = Date.now();
      direction.current = 'none';
      isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (optionsRef.current.disabled) return;
      if (optionsRef.current.shouldAbort?.()) {
        cancel();
        return;
      }
      if (activeTouchId.current === null) return;

      // Find the finger we're tracking
      const touch = Array.from(e.touches).find(t => t.identifier === activeTouchId.current);
      if (!touch) return;

      currentX.current = touch.clientX;
      currentY.current = touch.clientY;

      const diffX = touch.clientX - startX.current;
      const diffY = touch.clientY - startY.current;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);
      const { classifyThreshold = 10, horizontalBias = 2.5 } = optionsRef.current;

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
        return; // Wait until classified before acting
      }

      if (direction.current === 'vertical') return;

      // ── Horizontal drag — report live offset ─────────────────────────────
      if (direction.current === 'horizontal' && isDragging.current) {
        callbacksRef.current.onDragMove?.(diffX);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouchId.current === null) return;

      // Check that OUR finger lifted (not a different finger)
      const liftedTouch = Array.from(e.changedTouches).find(
        t => t.identifier === activeTouchId.current
      );
      if (!liftedTouch) return;

      if (optionsRef.current.disabled) {
        reset();
        return;
      }

      const offset = currentX.current - startX.current;
      const elapsed = Math.max(1, Date.now() - startTime.current);
      const velocity = offset / elapsed; // signed px/ms
      const wasHorizontal = direction.current === 'horizontal';

      callbacksRef.current.onDragEnd?.(offset, velocity, wasHorizontal);
      reset();
    };

    const handleTouchCancel = () => {
      cancel();
    };

    // Use `passive: true` so we never block scroll (browser optimization).
    // We never call preventDefault, so passive is safe for all handlers.
    const opts = { passive: true };
    el.addEventListener('touchstart', handleTouchStart, opts);
    el.addEventListener('touchmove', handleTouchMove, opts);
    el.addEventListener('touchend', handleTouchEnd, opts);
    el.addEventListener('touchcancel', handleTouchCancel, opts);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  // Re-attach only when the container element changes (almost never)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancel, reset]);

  // ── Expose cancel for external use (e.g. popup opens mid-drag) ───────────

  return {
    containerRef,
    cancel,
  };
}
