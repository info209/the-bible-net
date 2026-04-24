"use client";

import { useRef, useCallback } from "react";
import { Play, Pause, X, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProgressRing from "./ui/ProgressRing";

// Bottom offset: BottomNav (h-16 = 64px) + gap (16px) + safe-area
const BOTTOM_OFFSET = "calc(64px + 16px + env(safe-area-inset-bottom))";
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
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // ─── Long-press handlers ───────────────────────────────────────────────────
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
    if (!didLongPress.current) {
      onPlayPause();
    }
    didLongPress.current = false;
  }, [cancelLongPress, onPlayPause]);

  return (
    <AnimatePresence mode="wait">
      {playerState === "default" ? (
        // ── STATE A: Default 3-button row ─────────────────────────────────────
        <motion.div
          key="default"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-50"
          style={{ bottom: BOTTOM_OFFSET }}
        >
          <div
            className="flex items-center gap-5 px-6 py-3
              bg-[var(--color-bg-primary)]/90
              border border-[var(--color-border)]
              rounded-full
              shadow-[0_4px_24px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.08)]
              backdrop-blur-xl"
          >
            {/* ← Previous */}
            <motion.button
              onClick={onPrev}
              whileTap={{ scale: 0.88 }}
              className="size-10 rounded-full flex items-center justify-center
                border border-[var(--color-border)]
                bg-[var(--color-bg-secondary)]
                hover:bg-[var(--color-bg-tertiary)]
                transition-colors"
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-5 text-[var(--color-text-primary)]" strokeWidth={2.5} />
            </motion.button>

            {/* ▶ Play / Pause — with ProgressRing + long-press */}
            <ProgressRing
              progress={progress}
              size={72}
              strokeWidth={3}
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
                className="size-14 rounded-full flex items-center justify-center
                  bg-[var(--color-bg-primary)]
                  border-2 border-[var(--color-accent-rose)]
                  shadow-[0_2px_8px_rgba(210,57,82,0.3)]
                  transition-colors select-none"
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
              >
                {isPlaying ? (
                  <Pause
                    className="size-6 fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)]"
                    strokeWidth={0}
                  />
                ) : (
                  <Play
                    className="size-6 fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)] ml-0.5"
                    strokeWidth={0}
                  />
                )}
              </motion.button>
            </ProgressRing>

            {/* → Next */}
            <motion.button
              onClick={onNext}
              whileTap={{ scale: 0.88 }}
              className="size-10 rounded-full flex items-center justify-center
                border border-[var(--color-border)]
                bg-[var(--color-bg-secondary)]
                hover:bg-[var(--color-bg-tertiary)]
                transition-colors"
              aria-label="Next chapter"
            >
              <ChevronRight className="size-5 text-[var(--color-text-primary)]" strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>
      ) : (
        // ── STATE B: Minimized oval pill ──────────────────────────────────────
        <motion.div
          key="minimized"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="fixed left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[420px]"
          style={{ bottom: BOTTOM_OFFSET }}
          onClick={onOpenPanel}
        >
          <div
            className="bg-[var(--color-bg-primary)]
              border border-[var(--color-border)]
              shadow-xl rounded-full px-4 py-3
              flex items-center gap-3 cursor-pointer
              hover:shadow-2xl transition-shadow"
          >
            {/* Progress Ring + Play */}
            <ProgressRing
              progress={progress}
              size={44}
              strokeWidth={3}
              trackColor="var(--color-bg-tertiary)"
              color="var(--color-accent-rose)"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause();
                }}
                className="w-8 h-8 flex items-center justify-center"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause
                    className="size-4 fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)]"
                    strokeWidth={0}
                  />
                ) : (
                  <Play
                    className="size-4 fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)] ml-px"
                    strokeWidth={0}
                  />
                )}
              </button>
            </ProgressRing>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-[var(--color-text-primary)]">
                {title}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] truncate">
                {subtitle}
              </p>
            </div>

            {/* Open panel chevron */}
            <ChevronUp className="size-5 text-[var(--color-text-tertiary)] shrink-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}