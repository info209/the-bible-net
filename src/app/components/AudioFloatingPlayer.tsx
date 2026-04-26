"use client";

import { useRef, useCallback } from "react";
import { Play, Pause, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProgressRing from "./ui/ProgressRing";

// Bottom offset: BottomNav (h-16 = 64px) + gap (16px) + safe-area
const BOTTOM_OFFSET = "calc(64px + 16px + env(safe-area-inset-bottom))";
const LONG_PRESS_DURATION = 500; // ms

const SLIDE_UP = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as any },
};

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

  // ── Long-press logic ──────────────────────────────────────────────────────
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

  const isDefault = playerState === "default";

  return (
    <>
      {/* ── STATE A: 3 INDIVIDUAL floating buttons ──────────────────────────── */}

      {/* ← Prev — pinned left */}
      <AnimatePresence>
        {isDefault && (
          <motion.button
            key="btn-prev"
            {...SLIDE_UP}
            onClick={onPrev}
            whileTap={{ scale: 0.88 }}
            className="fixed left-5 z-50 size-11 rounded-full
              flex items-center justify-center
              bg-[var(--color-bg-primary)]/90 backdrop-blur-xl
              border border-[var(--color-border)]
              shadow-[0_4px_16px_rgba(0,0,0,0.14),0_1px_4px_rgba(0,0,0,0.08)]
              hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ bottom: BOTTOM_OFFSET }}
            aria-label="Previous chapter"
          >
            <ChevronLeft className="size-5 text-[var(--color-text-primary)]" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ▶ Play/Pause — pinned center, with ProgressRing + long-press */}
      <AnimatePresence>
        {isDefault && (
          <motion.div
            key="btn-play"
            {...SLIDE_UP}
            className="fixed left-1/2 -translate-x-1/2 z-50"
            style={{ bottom: BOTTOM_OFFSET }}
          >
            <ProgressRing
              progress={progress}
              size={76}
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
                className="size-[58px] rounded-full flex items-center justify-center
                  bg-[var(--color-bg-primary)]/95 backdrop-blur-xl
                  border-2 border-[var(--color-accent-rose)]
                  shadow-[0_4px_20px_rgba(210,57,82,0.28)]
                  select-none"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* → Next — pinned right */}
      <AnimatePresence>
        {isDefault && (
          <motion.button
            key="btn-next"
            {...SLIDE_UP}
            onClick={onNext}
            whileTap={{ scale: 0.88 }}
            className="fixed right-5 z-50 size-11 rounded-full
              flex items-center justify-center
              bg-[var(--color-bg-primary)]/90 backdrop-blur-xl
              border border-[var(--color-border)]
              shadow-[0_4px_16px_rgba(0,0,0,0.14),0_1px_4px_rgba(0,0,0,0.08)]
              hover:bg-[var(--color-bg-secondary)] transition-colors"
            style={{ bottom: BOTTOM_OFFSET }}
            aria-label="Next chapter"
          >
            <ChevronRight className="size-5 text-[var(--color-text-primary)]" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── STATE B: Minimized oval pill ────────────────────────────────────── */}
      <AnimatePresence>
        {!isDefault && (
          <motion.div
            key="pill-minimized"
            {...SLIDE_UP}
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
              {/* Progress ring + play */}
              <ProgressRing
                progress={progress}
                size={44}
                strokeWidth={3}
                trackColor="var(--color-bg-tertiary)"
                color="var(--color-accent-rose)"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
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

              {/* Title + subtitle */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--color-text-primary)]">
                  {title}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] truncate">
                  {subtitle}
                </p>
              </div>

              {/* Expand chevron */}
              <ChevronUp className="size-5 text-[var(--color-text-tertiary)] shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}