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
const OBSERVER_TIMEOUT_MS = 4000;

/** Approximate header height to exclude from the viewport center calculation */
const HEADER_OFFSET_PX = 60;

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
  // Stable ref so the observer callback always reads the latest params
  const paramsRef = useRef({ book, chapter, verseNumber, isChapterReady });
  useEffect(() => {
    paramsRef.current = { book, chapter, verseNumber, isChapterReady };
  });

  // Ref to the active MutationObserver so we can disconnect on cleanup
  const observerRef = useRef<MutationObserver | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // --- Guard: nothing to do ---
    if (!verseNumber || verseNumber < 1 || !isChapterReady || !book || !chapter) {
      return;
    }

    const targetId = `verse-${book}-${chapter}-${verseNumber}`;

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
      // NOTE: We do NOT clear highlightTimeoutRef here because the fade
      // animation should complete even if params change.
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

    // --- Core scroll + highlight logic ---
    const scrollToVerse = (el: HTMLElement) => {
      // Use two rAF frames to guarantee layout is fully settled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          // Re-query: element may have been re-mounted by React between frames
          const target = document.getElementById(targetId) ?? el;

          const rect = target.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const usableHeight = viewportHeight - HEADER_OFFSET_PX;

          // Calculate the scroll position that centers the verse in the usable viewport
          const elementAbsoluteTop = window.scrollY + rect.top;
          const idealScrollTop =
            elementAbsoluteTop - HEADER_OFFSET_PX - usableHeight / 2 + rect.height / 2;

          // Clamp: never negative, never beyond the document's max scroll
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          const clampedScrollTop = Math.max(0, Math.min(idealScrollTop, maxScroll));

          // Single smooth scroll — no follow-up adjustments
          window.scrollTo({ top: clampedScrollTop, behavior: 'smooth' });

          // Apply temporary highlight
          removeHighlight();
          target.classList.add(HIGHLIGHT_CLASS);

          // Remove the class after animation completes (matches CSS duration)
          highlightTimeoutRef.current = setTimeout(() => {
            target.classList.remove(HIGHLIGHT_CLASS);
            highlightTimeoutRef.current = null;
          }, 2000);
        });
      });
    };

    // --- Attempt immediate find (element already in DOM) ---
    const existingEl = document.getElementById(targetId);
    if (existingEl) {
      cleanup(); // cancel any stale observer
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
      // Graceful fallback: scroll to the nearest verse that exists
      const fallback = document.querySelector(`[id^="verse-${book}-${chapter}-"]`) as HTMLElement | null;
      if (fallback) {
        scrollToVerse(fallback);
      }
    }, OBSERVER_TIMEOUT_MS);

    return cleanup;
    // Re-run whenever the target verse, book, or chapter changes, or chapter becomes ready
  }, [book, chapter, verseNumber, isChapterReady]);
}
