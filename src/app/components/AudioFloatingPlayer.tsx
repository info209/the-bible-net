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
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // When footer is hidden, float just above the safe-area inset.
  // When footer is visible, float above the 64px nav bar.
  const bottomValue = isReadingMode
    ? `calc(${BREATHING}px + env(safe-area-inset-bottom))`
    : `calc(${BOTTOM_NAV_HEIGHT}px + ${BREATHING}px + env(safe-area-inset-bottom))`;

  const startLongPress = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      onOpenPanel();
    }, LONG_PRESS_DURATION);
  }, [onOpenPanel]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handlePlayRelease = useCallback(() => {
    cancelLongPress();
    if (!didLongPress.current) onPlayPause();
    didLongPress.current = false;
  }, [cancelLongPress, onPlayPause]);

  return (
    <AnimatePresence mode="wait">

      {/* ── STATE A: 3 individual buttons, constrained to content width ───────── */}
      {playerState === "default" && (
        <motion.div
          key="default-controls"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, bottom: bottomValue }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-0 right-0 z-50 pointer-events-none"
        >
          {/*
            max-w-3xl keeps buttons inside the reading content area on desktop.
            px-5 gives a bit of breathing room from the content edge.
            pointer-events-none on the row so only buttons receive clicks.
          */}
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

            {/* ▶ Play / Pause — center, with ProgressRing + long-press */}
            <div className="pointer-events-auto">
              <ProgressRing
                progress={progress}
                size={58}
                strokeWidth={2.5}
                trackColor="var(--color-bg-tertiary)"
                color="var(--color-accent-rose)"
              >
                <motion.button
                  onMouseDown={startLongPress}
                  onMouseUp={handlePlayRelease}
                  onMouseLeave={cancelLongPress}
                  onTouchStart={startLongPress}
                  onTouchEnd={handlePlayRelease}
                  onTouchCancel={cancelLongPress}
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
          animate={{ opacity: 1, y: 0, bottom: bottomValue }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[420px]"
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