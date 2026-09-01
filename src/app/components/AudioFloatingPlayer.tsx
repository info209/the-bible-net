import { useEffect, useState } from "react";
import { Play, Pause, ChevronUp, ChevronLeft, ChevronRight, X } from "lucide-react";
import { PiSlidersHorizontal } from "react-icons/pi";
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
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
  isDark?: boolean;
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
  selectedTheme,
  isDark = false,
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

  // Theme color tokens
  const theme = selectedTheme || (isDark ? 'dark' : 'light');

  const btnBg = {
    light: '#ffffff',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#1c1c1e'
  }[theme];

  const btnBorder = {
    light: 'rgba(49, 57, 58, 0.15)',
    sepia: 'rgba(92, 74, 58, 0.2)',
    cream: 'rgba(74, 63, 42, 0.2)',
    dark: 'rgba(255, 255, 255, 0.12)'
  }[theme];

  const iconColor = {
    light: '#31393a',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#e5e7e7'
  }[theme];

  const subTextColor = {
    light: '#6b7280',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: '#8e8e93'
  }[theme];

  const ringTrackColor = {
    light: 'rgba(49, 57, 58, 0.15)',
    sepia: 'rgba(92, 74, 58, 0.2)',
    cream: 'rgba(74, 63, 42, 0.2)',
    dark: 'rgba(255, 255, 255, 0.15)'
  }[theme];

  return (
    <AnimatePresence mode="wait">

      {/* ── STATE A: 3 individual controls row, constrained to content width ───────── */}
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

            {/* ← Prev Chapter */}
            <motion.button
              onClick={onPrev}
              whileTap={{ scale: 0.86 }}
              className="pointer-events-auto size-10 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06)] transition-colors"
              style={{
                backgroundColor: btnBg,
                borderColor: btnBorder,
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-[18px]" style={{ color: iconColor }} strokeWidth={2.5} />
            </motion.button>

            {/* Center Controls (Single Play button or Expanded 3-Control Pill) */}
            <div className="flex items-center justify-center pointer-events-auto">
              <AnimatePresence mode="wait">
                {!isNarrationActive ? (
                  /* ── Single Play Button (Narration Inactive - No Progress Ring) ── */
                  <motion.div
                    key="single-play-button"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="z-10 relative"
                  >
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                      whileTap={{ scale: 0.9 }}
                      className="size-11 rounded-full flex items-center justify-center
                        shadow-[0_4px_16px_rgba(0,0,0,0.12)]
                        select-none active:scale-95 transition-all"
                      aria-label="Play narration"
                      style={{
                        backgroundColor: btnBg,
                        borderColor: btnBorder,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        userSelect: "none",
                        WebkitUserSelect: "none",
                      }}
                    >
                      <Play className="size-[18px] fill-[#31C4BE] text-[#31C4BE] ml-0.5" strokeWidth={0} />
                    </motion.button>
                  </motion.div>
                ) : (
                  /* ── Expanded 3-Control Pill Player (Narration Active - With Progress Ring) ── */
                  <motion.div
                    key="expanded-pill-player"
                    initial={{ scale: 0.88, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.88, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="relative flex items-center h-[46px] px-2 rounded-full backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.14)]"
                    style={{
                      backgroundColor: btnBg,
                      borderColor: btnBorder,
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    {/* Left: Audio Controls Settings */}
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
                      className="size-9 rounded-full flex items-center justify-center text-[#31C4BE] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      aria-label="Audio controls settings"
                      title="Audio settings"
                    >
                      <PiSlidersHorizontal className="size-[18px]" strokeWidth={2} />
                    </motion.button>

                    {/* Center: Dominant Overlapping White Play/Pause Button with Teal Icon & Progress Ring */}
                    <div className="relative mx-1.5 -my-2.5 z-10 flex items-center justify-center">
                      <ProgressRing
                        progress={progress}
                        size={58}
                        strokeWidth={2.5}
                        trackColor={ringTrackColor}
                        color="#31C4BE"
                      >
                        <motion.button
                          onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                          whileTap={{ scale: 0.9 }}
                          className="size-11 rounded-full flex items-center justify-center
                            shadow-[0_4px_16px_rgba(0,0,0,0.12)]
                            select-none transition-all"
                          aria-label={isPlaying ? "Pause" : "Play"}
                          style={{
                            backgroundColor: btnBg,
                            borderColor: btnBorder,
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            userSelect: "none",
                            WebkitUserSelect: "none",
                          }}
                        >
                          {isPlaying ? (
                            <Pause className="size-[18px] fill-[#31C4BE] text-[#31C4BE]" strokeWidth={0} />
                          ) : (
                            <Play className="size-[18px] fill-[#31C4BE] text-[#31C4BE] ml-0.5" strokeWidth={0} />
                          )}
                        </motion.button>
                      </ProgressRing>
                    </div>

                    {/* Right: Stop (×) Narration Button */}
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={(e) => { e.stopPropagation(); onStop?.(); }}
                      className="size-9 rounded-full flex items-center justify-center text-[#31C4BE] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      aria-label="Stop narration"
                      title="Stop narration"
                    >
                      <X className="size-[19px]" strokeWidth={2.5} />
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* → Next Chapter */}
            <motion.button
              onClick={onNext}
              whileTap={{ scale: 0.86 }}
              className="pointer-events-auto size-10 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.06)] transition-colors"
              style={{
                backgroundColor: btnBg,
                borderColor: btnBorder,
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
              aria-label="Next chapter"
            >
              <ChevronRight className="size-[18px]" style={{ color: iconColor }} strokeWidth={2.5} />
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
            className="shadow-lg rounded-full px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:shadow-xl transition-shadow"
            style={{
              backgroundColor: btnBg,
              borderColor: btnBorder,
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {/* Progress ring + play */}
            <ProgressRing
              progress={progress}
              size={40}
              strokeWidth={2.5}
              trackColor={ringTrackColor}
              color="#31C4BE"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onPlayPause(); }}
                className="size-7 rounded-full flex items-center justify-center shadow-sm"
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  backgroundColor: btnBg,
                  borderColor: btnBorder,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                {isPlaying ? (
                  <Pause className="size-3 fill-[#31C4BE] text-[#31C4BE]" strokeWidth={0} />
                ) : (
                  <Play className="size-3 fill-[#31C4BE] text-[#31C4BE] ml-px" strokeWidth={0} />
                )}
              </button>
            </ProgressRing>

            {/* Title + subtitle */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: iconColor }}>
                {title}
              </p>
              <p className="text-xs truncate" style={{ color: subTextColor }}>
                {subtitle}
              </p>
            </div>

            <ChevronUp className="size-4 shrink-0" style={{ color: subTextColor }} />
          </div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}