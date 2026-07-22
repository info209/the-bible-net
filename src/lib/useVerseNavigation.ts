/**
 * useVerseNavigation
 *
 * Production-grade, race-condition-free verse navigation hook.
 *
 * Guaranteed pipeline:
 *   1. Chapter data loaded + DOM rendered
 *   2. Watch for verse element to appear via MutationObserver
 *   3. Scroll to center (clamped — never negative, never beyond document end)
 *   4. Apply temporary teal highlight that fades automatically
 *   5. Cleanup on param change or unmount
 *
 * Usage:
 *   Call this hook from ChapterContent, passing the current book/chapter/verseNumber
 *   and a flag indicating whether the chapter data has been rendered.
 *   The hook does nothing when verseNumber is null/undefined.
 */

import { useEffect, useRef } from 'react';

/** CSS class applied to the verse element on arrival — defined in globals.css */
const HIGHLIGHT_CLASS = 'verse-nav-highlight';

/** How long to wait for the verse element to appear before giving up (ms) */
const OBSERVER_TIMEOUT_MS = 5000;

interface UseVerseNavigationParams {
  book: string;
  chapter: number;
  verseNumber: number | null | undefined;
  /** Set to true once chapter data has been fetched AND the verse list has rendered */
  isChapterReady: boolean;
}

export function useVerseNavigation({
  book,
  chapter,
  verseNumber,
  isChapterReady,
}: UseVerseNavigationParams): void {
  // Ref to observer and timers so we can clean up properly
  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track last executed target key to prevent duplicate triggering during reading
  const lastNavigatedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    // --- Guard: nothing to do ---
    if (!verseNumber || verseNumber < 1 || !isChapterReady || !book || !chapter) {
      return;
    }

    const targetId = `verse-${book}-${chapter}-${verseNumber}`;
    const targetKey = targetId;

    // Prevent duplicate navigation for the exact same target key if already executed
    if (lastNavigatedKeyRef.current === targetKey) {
      return;
    }

    // --- Cleanup helper ---
    const cleanup = () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (postScrollTimerRef.current !== null) {
        clearTimeout(postScrollTimerRef.current);
        postScrollTimerRef.current = null;
      }
    };

    // --- Remove previous highlight from any verse ---
    const removeHighlight = () => {
      document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((el) => {
        el.classList.remove(HIGHLIGHT_CLASS);
      });
      if (highlightTimeoutRef.current !== null) {
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };

    // Helper: Compute dynamic sticky header height
    const getDynamicHeaderHeight = (): number => {
      const stickyEl = document.querySelector('.sticky.top-0') || document.querySelector('header');
      if (stickyEl) {
        const rect = stickyEl.getBoundingClientRect();
        if (rect.bottom > 0 && rect.bottom < 200) {
          return rect.bottom;
        }
      }
      return 60; // Fallback standard header height
    };

    // Calculate clamped centered scroll position
    const calculateTargetScrollTop = (target: HTMLElement): number => {
      const rect = target.getBoundingClientRect();
      const headerHeight = getDynamicHeaderHeight();
      const viewportHeight = window.innerHeight;
      const usableHeight = Math.max(100, viewportHeight - headerHeight);

      // Verse center relative to document top
      const elementAbsoluteCenter = window.scrollY + rect.top + (rect.height / 2);
      // Viewport target center is headerHeight + usableHeight / 2
      const idealScrollTop = elementAbsoluteCenter - (headerHeight + usableHeight / 2);

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewportHeight);
      return Math.max(0, Math.min(idealScrollTop, maxScroll));
    };

    // --- Core scroll + highlight logic ---
    const scrollToVerse = (el: HTMLElement) => {
      lastNavigatedKeyRef.current = targetKey;

      let prevTop = -1;
      let frameCount = 0;

      // Poll across animation frames to wait until DOM layout (fonts, framer-motion, etc.) settles
      const checkAndScroll = () => {
        const target = document.getElementById(targetId) ?? el;
        if (!target) return;

        const currentTop = target.getBoundingClientRect().top + window.scrollY;

        // If position changed significantly or we haven't checked minimum frames, wait (up to 8 frames ~120ms max)
        if (frameCount < 4 || (Math.abs(currentTop - prevTop) > 1 && frameCount < 10)) {
          prevTop = currentTop;
          frameCount++;
          rafRef.current = requestAnimationFrame(checkAndScroll);
          return;
        }

        // Layout has settled — compute position
        const targetScrollTop = calculateTargetScrollTop(target);

        // Perform smooth scroll
        window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });

        // Apply temporary highlight animation
        removeHighlight();
        target.classList.add(HIGHLIGHT_CLASS);

        highlightTimeoutRef.current = setTimeout(() => {
          target.classList.remove(HIGHLIGHT_CLASS);
          highlightTimeoutRef.current = null;
        }, 2000);

        // Post-scroll alignment check: after smooth scroll finishes (~450ms),
        // verify if layout shifted (e.g. late image/font load) and make minor non-disruptive correction if needed
        postScrollTimerRef.current = setTimeout(() => {
          const freshTarget = document.getElementById(targetId);
          if (freshTarget) {
            const finalScrollTop = calculateTargetScrollTop(freshTarget);
            // Only adjust if drift is greater than 12px
            if (Math.abs(window.scrollY - finalScrollTop) > 12) {
              window.scrollTo({ top: finalScrollTop, behavior: 'auto' });
            }
          }
        }, 450);
      };

      rafRef.current = requestAnimationFrame(checkAndScroll);
    };

    // --- Attempt immediate find (element already in DOM) ---
    const existingEl = document.getElementById(targetId);
    if (existingEl) {
      cleanup();
      scrollToVerse(existingEl);
      return cleanup;
    }

    // --- Watch for the element to appear (async render / data load) ---
    const observer = new MutationObserver(() => {
      const el = document.getElementById(targetId);
      if (el) {
        observer.disconnect();
        observerRef.current = null;
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        scrollToVerse(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    observerRef.current = observer;

    // Safety timeout: stop waiting after OBSERVER_TIMEOUT_MS
    timeoutRef.current = setTimeout(() => {
      cleanup();
      const fallback = document.querySelector(`[id^="verse-${book}-${chapter}-"]`) as HTMLElement | null;
      if (fallback) {
        scrollToVerse(fallback);
      }
    }, OBSERVER_TIMEOUT_MS);

    return cleanup;
  }, [book, chapter, verseNumber, isChapterReady]);
}

