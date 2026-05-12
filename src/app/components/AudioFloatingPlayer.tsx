"use client";

import { useRef, useCallback } from "react";
import { Play, Pause, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProgressRing from "./ui/ProgressRing";

// Sits above BottomNav (64px) with 12px breathing room + safe-area
const BOTTOM_NAV_HEIGHT = 64; // px
const BREATHING = 12; // px gap above nav
const LONG_PRESS_DURATION = 500; // ms

interface Props {
  playerState: "default" | "minimized";
  isPlaying: boolean;
  progress: number; // 0 to 1
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  title: string;
  subtitle: string;
  onOpenPanel: () => void;
  /** When true the bottom nav is hidden — shift buttons down to sit at safe-area-inset */
  isReadingMode?: boolean;
  /** When true the verse selection menu is open — shift buttons UP to stay visible above it */
  isVerseActionMenuOpen?: boolean;
}

export default function AudioFloatingPlayer({
  playerState,
  isPlaying,
  progress,
  onPlayPause,
  onNext,
  onPrev,
  title,
  subtitle,
  onOpenPanel,
  isReadingMode = false,
  isVerseActionMenuOpen = false,
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether the current press crossed the 2-second threshold
  const isLongPressRef = useRef(false);
  // Prevents mouse-event handlers from firing after a touch event (synthetic events)
  const isTouchActiveRef = useRef(false);

  const bottomValue = isVerseActionMenuOpen
    ? `calc(320px + env(safe-area-inset-bottom))`
    : isReadingMode
      ? `calc(${BREATHING}px + env(safe-area-inset-bottom))`
      : `calc(${BOTTOM_NAV_HEIGHT}px + ${BREATHING}px + env(safe-area-inset-bottom))`;

  /** Start the 2-second long-press timer. Called on pointer-down. */
  const startPressTimer = useCallback(() => {
    isLongPressRef.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressRef.current = true;
      onOpenPanel();
    }, LONG_PRESS_DURATION);
  }, [onOpenPanel]);

  /** Cancel the long-press timer without triggering any action. */
  const cancelPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Touch handlers ──────────────────────────────────────────────────────────
  // Touch events are always handled first; we suppress the synthetic mouse
  // events that follow by gating on isTouchActiveRef.

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    isTouchActiveRef.current = true;
    startPressTimer();
  }, [startPressTimer]);

  /**
   * onTouchMove fires when the finger moves — treat as a scroll intent.
   * Cancel the timer but do NOT trigger play (user is scrolling, not tapping).
   */
  const handleTouchMove = useCallback(() => {
    cancelPressTimer();
    // Don't clear isLongPress here — if 2s already elapsed, keep it true
  }, [cancelPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    cancelPressTimer();
    // Quick tap → play/pause. Long press already opened the sheet.
    if (!isLongPressRef.current) {
      onPlayPause();
    }
    isLongPressRef.current = false;
    // Suppress the synthetic mouse-up / click that the browser fires ~300ms later
    setTimeout(() => { isTouchActiveRef.current = false; }, 400);
  }, [cancelPressTimer, onPlayPause]);

  const handleTouchCancel = useCallback(() => {
    cancelPressTimer();
    isLongPressRef.current = false;
    setTimeout(() => { isTouchActiveRef.current = false; }, 400);
  }, [cancelPressTimer]);

  // ── Mouse handlers (desktop) — skip if a touch event already handled this ──

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isTouchActiveRef.current) return;
    e.stopPropagation();
    startPressTimer();
  }, [startPressTimer]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isTouchActiveRef.current) return;
    e.stopPropagation();
    cancelPressTimer();
    if (!isLongPressRef.current) {
      onPlayPause();
    }
    isLongPressRef.current = false;
  }, [cancelPressTimer, onPlayPause]);

  /** Pointer leaves the button — cancel timer, do NOT trigger play. */
  const handleMouseLeave = useCallback(() => {
    cancelPressTimer();
    isLongPressRef.current = false;
  }, [cancelPressTimer]);

  return (
    <AnimatePresence mode="wait">

      {/* ── STATE A: 3 individual buttons, constrained to content width ───────── */}
      {playerState === "default" && (
        <motion.div
          key="default-controls"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{ bottom: bottomValue, transition: 'bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
          className="fixed left-0 right-0 z-[1200] pointer-events-none"
        >
          <div className="max-w-3xl mx-auto px-5 flex items-center justify-between pointer-events-none">

            {/* ← Prev */}
            <motion.button
              onClick={onPrev}
              whileTap={{ scale: 0.86 }}
              className="pointer-events-auto
                size-10 rounded-full flex items-center justify-center
                bg-[var(--color-bg-primary)]/90 backdrop-blur-xl
                border border-[var(--color-border)]
                shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06)]
                hover:bg-[var(--color-bg-secondary)] transition-colors"
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-[18px] text-[var(--color-text-secondary)]" strokeWidth={2.5} />
            </motion.button>

            <div className="pointer-events-auto">
              <ProgressRing
                progress={progress}
                size={58}
                strokeWidth={2.5}
                trackColor="var(--color-bg-tertiary)"
                color="var(--color-accent-rose)"
              >
                <motion.button
                  // Touch events — handled first; suppress synthetic mouse events
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchCancel}
                  // Mouse events — only fire on desktop (gated by isTouchActiveRef)
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  // No onClick — play/pause is handled in onTouchEnd / onMouseUp
                  // to avoid the double-fire issue on touch devices.
                  whileTap={{ scale: 0.9 }}
                  className="size-11 rounded-full flex items-center justify-center
                    bg-[var(--color-primary-teal)]
                    shadow-[0_2px_12px_rgba(65,173,176,0.4)]
                    select-none"
                  aria-label={isPlaying ? "Pause" : "Play"}
                  style={{ userSelect: "none", WebkitUserSelect: "none" }}
                >
                  {isPlaying ? (
                    <Pause className="size-[18px] fill-white text-white" strokeWidth={0} />
                  ) : (
                    <Play className="size-[18px] fill-white text-white ml-0.5" strokeWidth={0} />
                  )}
                </motion.button>
              </ProgressRing>
            </div>

            {/* → Next */}
            <motion.button
              onClick={onNext}
              whileTap={{ scale: 0.86 }}
              className="pointer-events-auto
                size-10 rounded-full flex items-center justify-center
                bg-[var(--color-bg-primary)]/90 backdrop-blur-xl
                border border-[var(--color-border)]
                shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06)]
                hover:bg-[var(--color-bg-secondary)] transition-colors"
              aria-label="Next chapter"
            >
              <ChevronRight className="size-[18px] text-[var(--color-text-secondary)]" strokeWidth={2.5} />
            </motion.button>

          </div>
        </motion.div>
      )}

      {/* ── STATE B: Minimized oval pill ─────────────────────────────────────── */}
      {playerState === "minimized" && (
        <motion.div
          key="pill-minimized"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{ bottom: bottomValue, transition: 'bottom 0.35s cubic-bezier(0.4, 0, 0.2, 1)' }}
          className="fixed left-1/2 -translate-x-1/2 z-[1200] w-[92%] max-w-[420px]"
          onClick={onOpenPanel}
        >
          <div
            className="bg-[var(--color-bg-primary)]
              border border-[var(--color-border)]
              shadow-lg rounded-full px-4 py-2.5
              flex items-center gap-3 cursor-pointer
              hover:shadow-xl transition-shadow"
          >
            {/* Progress ring + play */}
            <ProgressRing
              progress={progress}
              size={40}
              strokeWidth={2.5}
              trackColor="var(--color-bg-tertiary)"
              color="var(--color-accent-rose)"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                className="size-7 rounded-full flex items-center justify-center
                  bg-[var(--color-primary-teal)]"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="size-3 fill-white text-white" strokeWidth={0} />
                ) : (
                  <Play className="size-3 fill-white text-white ml-px" strokeWidth={0} />
                )}
              </button>
            </ProgressRing>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[var(--color-text-primary)]">
                {title}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {subtitle}
              </p>
            </div>

            <ChevronUp className="size-4 text-[var(--color-text-tertiary)] shrink-0" />
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}