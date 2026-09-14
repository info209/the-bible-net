'use client';

import { useEffect, useRef, useCallback } from 'react';

export interface AutoFocusOptions {
  /**
   * Whether autofocus should be active. Defaults to true.
   * When this transitions from false to true, focus will be triggered again.
   */
  active?: boolean;

  /**
   * Position the cursor: 'start', 'end', or select 'all'.
   */
  cursorPosition?: 'start' | 'end' | 'all';

  /**
   * Select all text on focus. Shorthand for cursorPosition: 'all'.
   */
  select?: boolean;

  /**
   * Prevent browser scrolling to the focused element. Defaults to true.
   */
  preventScroll?: boolean;

  /**
   * If true, forces focus even if another editable element currently has focus.
   * Defaults to false (avoids stealing focus if the user already moved elsewhere).
   */
  force?: boolean;

  /**
   * Callback fired when focus has been successfully applied.
   */
  onFocus?: () => void;
}

/**
 * Robustly focuses an HTML element according to production requirements:
 * - Checks DOM connectivity and interactivity (not disabled/hidden)
 * - Guards against stealing focus if the user already focused another field
 * - Positions cursor or selects text safely across input types
 */
export function focusTarget(
  element: HTMLElement | null | undefined,
  options: AutoFocusOptions = {}
): boolean {
  if (!element || typeof window === 'undefined') return false;

  // Ensure element is connected to the DOM
  if (!element.isConnected) return false;

  // Check disabled state
  if (
    element.hasAttribute('disabled') ||
    (element as HTMLInputElement).disabled ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }

  // Guard against stealing focus from another user-interactive input
  const activeEl = document.activeElement;
  if (
    !options.force &&
    activeEl &&
    activeEl !== element &&
    activeEl !== document.body &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      (activeEl as HTMLElement).isContentEditable)
  ) {
    // User has already intentionally focused another editable field; do not hijack
    return false;
  }

  try {
    element.focus({ preventScroll: options.preventScroll ?? true });
  } catch {
    // Fallback if preventScroll is not supported in older web engines
    element.focus();
  }

  // Verify if focus succeeded
  if (document.activeElement === element) {
    // Handle cursor positioning / selection if applicable
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const isSelectAll = options.select || options.cursorPosition === 'all';
      if (isSelectAll) {
        element.select();
      } else if (
        options.cursorPosition &&
        /^(text|search|URL|tel|password)$/i.test(element.type || 'text')
      ) {
        const len = element.value.length;
        const pos = options.cursorPosition === 'start' ? 0 : len;
        element.setSelectionRange(pos, pos);
      }
    }

    options.onFocus?.();
    return true;
  }

  return false;
}

/**
 * Production-ready autofocus hook for conditionally or dynamically mounted inputs:
 * - Synchronously attempts focus during user gestures (essential for iOS Safari/Android virtual keyboards)
 * - Uses requestAnimationFrame to ensure layout readiness across Framer Motion and mount lifecycles
 * - Re-focuses cleanly when toggled closed and reopened
 * - Safe against React Strict Mode double-invocation loops
 */
export function useAutoFocus<T extends HTMLElement = HTMLInputElement>(
  options: AutoFocusOptions = {},
  externalRef?: React.RefObject<T | null>
) {
  const {
    active = true,
    select = false,
    cursorPosition,
    preventScroll = true,
    force = false,
    onFocus,
  } = options;

  const internalRef = useRef<T | null>(null);
  const targetRef = externalRef || internalRef;

  const hasFocusedRef = useRef(false);
  const prevActiveRef = useRef(active);

  // Trigger focus attempt safely with RAF fallback
  const attemptFocus = useCallback(() => {
    if (typeof window === 'undefined') return;

    const el = targetRef.current;
    if (el && el.isConnected) {
      const focused = focusTarget(el, {
        select,
        cursorPosition,
        preventScroll,
        force,
        onFocus,
      });
      if (focused) {
        hasFocusedRef.current = true;
        return;
      }
    }

    // Schedule on next frame in case animation/mount layout is resolving
    const rafId = requestAnimationFrame(() => {
      const element = targetRef.current;
      if (element && element.isConnected) {
        const focused = focusTarget(element, {
          select,
          cursorPosition,
          preventScroll,
          force,
          onFocus,
        });
        if (focused) {
          hasFocusedRef.current = true;
        }
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [cursorPosition, force, onFocus, preventScroll, select, targetRef]);

  // Handle active state changes
  useEffect(() => {
    // If transitioning from false -> true (e.g. reopened modal/search), reset flag
    if (active && !prevActiveRef.current) {
      hasFocusedRef.current = false;
    }
    prevActiveRef.current = active;

    if (!active || hasFocusedRef.current) return;

    const cleanup = attemptFocus();
    return () => {
      if (cleanup) cleanup();
    };
  }, [active, attemptFocus]);

  // Combined ref callback allowing ref attachment to trigger immediate focus on mount
  const refCallback = useCallback(
    (node: T | null) => {
      if (externalRef) {
        (externalRef as React.MutableRefObject<T | null>).current = node;
      } else {
        internalRef.current = node;
      }

      if (node && active && !hasFocusedRef.current) {
        attemptFocus();
      }
    },
    [active, attemptFocus, externalRef]
  );

  return {
    ref: targetRef,
    refCallback,
    focus: (opts?: AutoFocusOptions) => focusTarget(targetRef.current, { ...options, ...opts }),
  };
}
