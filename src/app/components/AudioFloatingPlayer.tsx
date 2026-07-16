"use client";

import { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronLeft, ChevronRight, Sliders, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProgressRing from "./ui/ProgressRing";

// Sits above BottomNav (64px) with 12px breathing room + safe-area
const BOTTOM_NAV_HEIGHT = 64; // px
const BREATHING = 12; // px gap above nav

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
  isNarrationActive?: boolean;
  onStop?: () => void;
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
  isNarrationActive = false,
  onStop,
}: Props) {
  const [sheetOffset, setSheetOffset] = useState(0);

  useEffect(() => {
    // We want to observe any active bottom sheets.
    const updateHeight = () => {
      const sheets = Array.from(document.querySelectorAll('[data-bottom-sheet="true"]'));
      if (sheets.length === 0) {
        setSheetOffset(0);
        return;
      }
      
      let maxOffset = 0;
      sheets.forEach(sheet => {
        const el = sheet as HTMLElement;
        const rect = el.getBoundingClientRect();
        // Ignore hidden sheets
        if (rect.height === 0) return;
        
        // Find the resting bottom distance. 
        // We can use the offsetHeight + any CSS bottom value (like 72px)
        const computed = window.getComputedStyle(el);
        let bottomVal = parseFloat(computed.bottom);
        if (isNaN(bottomVal)) bottomVal = 0;
        
        // If the element has a transform (like y: 60 during animation), we want the final resting height,
        // which is height + bottomVal.
        const totalRestingOffset = el.offsetHeight + bottomVal;
        if (totalRestingOffset > maxOffset) {
          maxOffset = totalRestingOffset;
        }
      });
      
      setSheetOffset(maxOffset);
    };

    // Initial check
    updateHeight();

    // Resize observer to watch the sheets' heights changing (e.g. expanding notes)
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    // Mutation observer to watch for new sheets being added/removed
    const mutationObserver = new MutationObserver(() => {
      updateHeight();
      resizeObserver.disconnect();
      document.querySelectorAll('[data-bottom-sheet="true"]').forEach(sheet => {
        resizeObserver.observe(sheet);
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    document.querySelectorAll('[data-bottom-sheet="true"]').forEach(sheet => {
      resizeObserver.observe(sheet);
    });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  const baselineBottom = isReadingMode
    ? BREATHING
    : BOTTOM_NAV_HEIGHT + BREATHING;

  // If a sheet is active, float 20px above its top edge. Otherwise use baseline.
  const finalOffset = sheetOffset > 0 ? sheetOffset + 20 : baselineBottom;
  const bottomValue = `calc(${finalOffset}px + env(safe-area-inset-bottom))`;

  return (
    <AnimatePresence mode="wait">

      {/* ── STATE A: 3 individual buttons, constrained to content width ───────── */}
      {playerState === "default" && (
        <motion.div
          key="default-controls"
          data-audio-player="true"
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

            <div className="flex items-center justify-center pointer-events-auto">
              <AnimatePresence>
                {isNarrationActive && (
                  <motion.button
                    key="settings-pill"
                    initial={{ width: 0, opacity: 0, x: 20 }}
                    animate={{ width: 52, opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
                    className="h-11 w-[52px] bg-[var(--color-bg-primary)]/95 backdrop-blur-md
                      border border-r-0 border-[var(--color-border)]
                      rounded-l-full pl-4 pr-0 -mr-4 flex items-center justify-start
                      shadow-md hover:bg-[var(--color-bg-secondary)] transition-colors
                      overflow-hidden whitespace-nowrap"
                    aria-label="Audio settings"
                  >
                    <Sliders className="size-[18px] text-[var(--color-text-secondary)] shrink-0" />
                  </motion.button>
                )}
              </AnimatePresence>

              <div className="z-10 relative">
                <ProgressRing
                  progress={progress}
                  size={58}
                  strokeWidth={2.5}
                  trackColor="var(--color-bg-tertiary)"
                  color="var(--color-accent-rose)"
                >
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
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

              <AnimatePresence>
                {isNarrationActive && (
                  <motion.button
                    key="stop-pill"
                    initial={{ width: 0, opacity: 0, x: -20 }}
                    animate={{ width: 52, opacity: 1, x: 0 }}
                    exit={{ width: 0, opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    onClick={(e) => { e.stopPropagation(); onStop?.(); }}
                    className="h-11 w-[52px] bg-[var(--color-bg-primary)]/95 backdrop-blur-md
                      border border-l-0 border-[var(--color-border)]
                      rounded-r-full pl-0 pr-4 -ml-4 flex items-center justify-end
                      shadow-md hover:bg-[var(--color-bg-secondary)] transition-colors
                      overflow-hidden whitespace-nowrap"
                    aria-label="Stop narration"
                  >
                    <Square className="size-[18px] text-[var(--color-accent-rose)] fill-[var(--color-accent-rose)] shrink-0" />
                  </motion.button>
                )}
              </AnimatePresence>
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
          data-audio-player="true"
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