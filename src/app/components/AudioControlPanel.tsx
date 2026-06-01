import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, RotateCw, Repeat, Gauge, Timer, Volume2, Minimize2, X } from 'lucide-react';
import ProgressRing from './ui/ProgressRing';

interface AudioControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  selectedVerse: number;
  totalVerses: number;           // NEW: actual verse count for the chapter
  audioCurrentTime: number;
  audioDuration: number;
  audioPlaying: boolean;
  playbackSpeed: number;
  onVerseChange: (verse: number) => void;
  onVerseStep?: (verse: number) => void;  // Direct V+/V- step — does NOT cancel narration
  onTimeChange: (time: number) => void;
  onSliderDragStart?: () => void;
  onSliderDragEnd?: () => void;
  onPlayPauseToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onTimerClick: () => void;
  ttsVolume: number;
  onVolumeChange: (vol: number) => void;
  repeatMode: 'none' | 'chapter' | 'verse';
  onRepeatModeToggle: () => void;
  selectedChapter?: number;
  totalChapters?: number;
  selectedBook?: string;
  onChapterChange?: (chapter: number) => void;
  onBookChange?: (direction: 'prev' | 'next') => void;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

export default function AudioControlPanel({
  isOpen,
  onClose,
  onMinimize,
  selectedVerse,
  totalVerses,
  audioCurrentTime,
  audioDuration,
  audioPlaying,
  playbackSpeed,
  onVerseChange,
  onVerseStep,
  onTimeChange,
  onSliderDragStart,
  onSliderDragEnd,
  onPlayPauseToggle,
  onSpeedChange,
  onTimerClick,
  ttsVolume,
  onVolumeChange,
  repeatMode,
  onRepeatModeToggle,
  selectedChapter = 1,
  totalChapters = 50,
  selectedBook = '',
  onChapterChange,
  onBookChange,
  isDark = false,
  selectedTheme
}: AudioControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  // Tracks whether the verse slider is actively being dragged
  // Used to freeze the progress ring and suppress auto-scroll
  const isDraggingSliderRef = useRef(false);
  // Preview verse shown on thumb/tooltip during drag — committed on release
  const [dragVersePreview, setDragVersePreview] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentY(0);
    }
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setStartY(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (currentY > 100) {
      onClose();
    }
    setCurrentY(0);
    setStartY(0);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, startY, currentY]);

  if (!isOpen) return null;

  // Progress for the ProgressRing: frozen at 0 while slider is being dragged
  // so the ring doesn't fight the user's drag gesture
  const ringProgress = isDraggingSliderRef.current
    ? 0
    : (audioDuration > 0 ? Math.min(Math.max(audioCurrentTime / audioDuration, 0), 1) : 0);

  // Displayed verse: use preview during drag, committed value otherwise
  const displayVerse = (isDraggingSliderRef.current && dragVersePreview !== null)
    ? dragVersePreview
    : selectedVerse;
  const panelTitle = `${selectedBook || 'Bible'} ${selectedChapter}:${displayVerse}`;

  // Premium themes variables
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  const dm = theme === 'dark';
  
  const panelBg = {
    light: 'rgba(255, 255, 255, 0.95)',
    sepia: 'rgba(250, 240, 227, 0.97)',
    cream: 'rgba(253, 246, 235, 0.97)',
    dark: '#000000'
  }[theme];

  const panelBorder = {
    light: 'rgba(49, 57, 58, 0.1)',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255, 255, 255, 0.08)'
  }[theme];

  const textPrimary = {
    light: '#31393a',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#e5e7e7'
  }[theme];

  const textSecondary = {
    light: '#6b7280',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: '#8e8e93'
  }[theme];

  const textTertiary = {
    light: '#9ca3a3',
    sepia: '#927d6c',
    cream: '#83745c',
    dark: '#636366'
  }[theme];

  const btnBg = {
    light: '#f1f3f3',
    sepia: '#f2dec6',
    cream: '#fcf0db',
    dark: '#1c1c1e'
  }[theme];

  const pillBg = {
    light: 'rgba(255, 255, 255, 0.88)',
    sepia: 'rgba(250, 240, 227, 0.88)',
    cream: 'rgba(253, 246, 235, 0.88)',
    dark: 'rgba(255, 255, 255, 0.03)'
  }[theme];

  const pillBorder = {
    light: 'rgba(49, 57, 58, 0.08)',
    sepia: 'rgba(92, 74, 58, 0.1)',
    cream: 'rgba(74, 63, 42, 0.1)',
    dark: 'rgba(255, 255, 255, 0.05)'
  }[theme];

  const sliderTrackBg = {
    light: '#d9d9d9',
    sepia: '#e0c9a6',
    cream: '#e5e5e5',
    dark: '#2c2c2e'
  }[theme];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none">
      <div
        ref={panelRef}
        className={`pointer-events-auto absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-[600px] mx-auto border-t max-h-[85dvh] flex flex-col overflow-hidden backdrop-blur-xl ${
          dm ? '' : 'glass-heavy bg-white/95'
        }`}
        style={{
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          backgroundColor: panelBg,
          borderColor: panelBorder,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Drag handle + header actions ───────────────────────────────────── */}
        <div className="relative">
          {/* Drag zone */}
          <div
            className="absolute top-0 left-0 right-0 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <div className="w-[var(--drag-handle-width)] h-[var(--drag-handle-height)] bg-[var(--drag-handle-color)] rounded-full mt-3" />
          </div>

          {/* Header: Minimize (left) + reference (center) + Close (right) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 pt-6 pb-3">
            <button
              onClick={onMinimize ?? onClose}
              className="justify-self-start flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{ backgroundColor: btnBg }}
              aria-label="Minimize player"
            >
              <Minimize2 className="size-4" style={{ color: textSecondary }} />
              <span className="text-xs font-medium" style={{ color: textSecondary }}>Minimize</span>
            </button>

            <h2 className="min-w-0 max-w-[150px] sm:max-w-[240px] truncate text-center text-base font-semibold" style={{ color: textPrimary }}>
              {panelTitle}
            </h2>

            <button
              onClick={onClose}
              className="justify-self-end size-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: btnBg }}
              aria-label="Close player"
            >
              <X className="size-4" style={{ color: textSecondary }} />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────────── */}
        <div
          className="px-4 pb-4 overflow-y-auto flex-1"
          style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
        >

          {/* Progress bar */}
          <div className="mb-4 px-11">
            <div className="relative h-5 mb-1" style={{ overflow: 'visible' }}>
              {/* Background track */}
              <div className="absolute top-[8px] w-full h-[4px] rounded-sm" style={{ backgroundColor: sliderTrackBg }} />
              {/* Progress track — uses preview verse during drag */}
              <div
                className="absolute top-[8px] h-[4px] bg-[var(--color-accent-rose)] rounded-sm"
                style={{ width: `${totalVerses > 0 ? (displayVerse / totalVerses) * 100 : 0}%` }}
              />
              {/* Thumb + tooltip — uses preview verse during drag */}
              <div
                className="absolute top-0 w-5 h-5 bg-[var(--color-accent-rose)] border-4 border-[var(--color-accent-rose-light)] rounded-full -ml-2.5 pointer-events-none"
                style={{ left: `${totalVerses > 0 ? (displayVerse / totalVerses) * 100 : 0}%` }}
              >
                {/* Only show tooltip while actively dragging */}
                {isDraggingSliderRef.current && dragVersePreview !== null && (
                  <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center" style={{ zIndex: 10 }}>
                    <div className="bg-[var(--color-accent-rose)] rounded-[var(--radius-xs)] px-2 py-0.5 flex flex-col items-center min-w-[40px] shadow-sm">
                      <p className="text-[8px] leading-3 text-white">Verse</p>
                      <p className="text-[12px] leading-4 text-white font-bold">{displayVerse}</p>
                    </div>
                    <svg width="8" height="6" viewBox="0 0 12 8" fill="none" className="mx-auto block">
                      <path d="M6 8L0 0H12L6 8Z" fill="var(--color-accent-rose)" />
                    </svg>
                  </div>
                )}
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(totalVerses, 1)}
                value={displayVerse}
                onChange={(e) => {
                  // During drag: only update the visual preview — do NOT commit to parent yet
                  setDragVersePreview(Number(e.target.value));
                }}
                onMouseDown={(e) => {
                  isDraggingSliderRef.current = true;
                  // Seed the preview with the current committed verse
                  setDragVersePreview(Number((e.target as HTMLInputElement).value));
                  onSliderDragStart?.();
                }}
                onTouchStart={(e) => {
                  isDraggingSliderRef.current = true;
                  setDragVersePreview(Number((e.target as HTMLInputElement).value));
                  onSliderDragStart?.();
                }}
                onMouseUp={(e) => {
                  isDraggingSliderRef.current = false;
                  const verse = Number((e.target as HTMLInputElement).value);
                  // Commit: call parent ONCE on release
                  onVerseChange(verse);
                  setDragVersePreview(null);
                  onSliderDragEnd?.();
                }}
                onTouchEnd={(e) => {
                  isDraggingSliderRef.current = false;
                  const verse = Number((e.target as HTMLInputElement).value);
                  // Commit: call parent ONCE on release
                  onVerseChange(verse);
                  setDragVersePreview(null);
                  onSliderDragEnd?.();
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Verse counter — uses preview during drag */}
            <div className="flex justify-between text-[11px] font-medium" style={{ color: textSecondary }}>
              <span>Verse {displayVerse}</span>
              <span>Total {totalVerses}</span>
            </div>
          </div>

          {/* ── Main controls ─────────────────────────────────────────────────── */}
          <div className="max-w-[400px] mx-auto flex items-center justify-between px-6 mb-8">

            {/* ← Chapter / Book back */}
            <button
              onClick={() => {
                if (selectedChapter > 1) {
                  onChapterChange?.(selectedChapter - 1);
                } else {
                  onBookChange?.('prev');
                }
              }}
              className="size-9 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: btnBg }}
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-6 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>

            {/* Center group: Verse- / Play / Verse+ */}
            <div className="flex items-center gap-6">

              {/* V- */}
              <button
                onClick={() => (onVerseStep ?? onVerseChange)(Math.max(1, selectedVerse - 1))}
                className="size-9 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                aria-label="Previous verse"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCcw className="size-6 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                  <span className="absolute text-[7px] font-bold text-[var(--color-primary-teal)] mt-0.5">V-</span>
                </div>
              </button>

              {/* Big play with ProgressRing */}
              <ProgressRing
                progress={ringProgress}
                size={80}
                strokeWidth={4}
                trackColor={sliderTrackBg}
                color="var(--color-accent-rose)"
              >
                <button
                  onClick={onPlayPauseToggle}
                  className="size-[58px] rounded-full flex items-center justify-center
                    bg-[var(--color-primary-teal-lighter)]
                    shadow-[0px_2px_4px_0px_rgba(0,0,0,0.2)]
                    hover:scale-105 active:scale-95 transition-transform"
                  aria-label={audioPlaying ? "Pause" : "Play"}
                >
                  {audioPlaying ? (
                    <Pause className="size-6 text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)]" strokeWidth={0} />
                  ) : (
                    <Play className="size-6 text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)] ml-0.5" strokeWidth={0} />
                  )}
                </button>
              </ProgressRing>

              {/* V+ */}
              <button
                onClick={() => (onVerseStep ?? onVerseChange)(Math.min(totalVerses, selectedVerse + 1))}
                className="size-9 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                aria-label="Next verse"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCw className="size-6 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                  <span className="absolute text-[7px] font-bold text-[var(--color-primary-teal)] mt-0.5">V+</span>
                </div>
              </button>
            </div>

            {/* → Chapter / Book forward */}
            <button
              onClick={() => {
                if (selectedChapter < totalChapters) {
                  onChapterChange?.(selectedChapter + 1);
                } else {
                  onBookChange?.('next');
                }
              }}
              className="size-9 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: btnBg }}
              aria-label="Next chapter"
            >
              <ChevronRight className="size-6 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>
          </div>

          {/* ── Secondary controls row ────────────────────────────────────────── */}
          <div className={`flex items-center justify-center gap-6 rounded-[var(--radius-xl)] py-2 px-6 mx-auto w-fit shadow-glass mb-4 ${
            dm ? '' : 'glass-light'
          }`}
            style={{
              backgroundColor: pillBg,
              border: dm ? `1px solid ${pillBorder}` : undefined,
            }}
          >

            {/* Repeat */}
            <button
              onClick={onRepeatModeToggle}
              className={`relative flex flex-col items-center justify-center gap-3
                hover:scale-110 active:scale-95 transition-transform
                ${repeatMode !== 'none' ? 'text-[var(--color-primary-teal)]' : ''}`}
              style={{ color: repeatMode !== 'none' ? undefined : textTertiary }}
              aria-label="Toggle repeat mode"
            >
              <div className="size-7 flex items-center justify-center">
                <Repeat className="size-[22px]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold uppercase whitespace-nowrap leading-none">
                {repeatMode}
              </span>
            </button>

            {/* Playback speed */}
            <button
              onClick={() => {
                const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                const currentIndex = speeds.indexOf(playbackSpeed);
                onSpeedChange(speeds[(currentIndex + 1) % speeds.length]);
              }}
              className="relative flex flex-col items-center justify-center gap-3
                hover:scale-110 active:scale-95 transition-transform"
              style={{ color: textTertiary }}
              aria-label="Change playback speed"
            >
              <div className="size-7 flex items-center justify-center">
                <Gauge className="size-[22px]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap leading-none">
                {playbackSpeed}x
              </span>
            </button>

            {/* Timer */}
            <button
              onClick={onTimerClick}
              className="relative flex flex-col items-center justify-center gap-3
                hover:scale-110 active:scale-95 transition-transform"
              style={{ color: textTertiary }}
              aria-label="Set sleep timer"
            >
              <div className="size-7 flex items-center justify-center">
                <Timer className="size-[22px]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold uppercase whitespace-nowrap leading-none">
                Timer
              </span>
            </button>
          </div>

          {/* ── Volume row ───────────────────────────────────────────────────── */}
          <div className="px-10 flex items-center gap-4 mt-2">
            <Volume2 className="size-4 shrink-0" strokeWidth={2.5} style={{ color: textTertiary }} />
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(ttsVolume * 100)}
              onChange={(e) => {
                const newVolume = parseInt(e.target.value) / 100;
                onVolumeChange(newVolume);
              }}
              className="w-full accent-[var(--color-primary-teal)]"
              aria-label="Volume"
            />
            <span className="text-xs font-bold shrink-0 w-8 text-right" style={{ color: textTertiary }}>
              {Math.round(ttsVolume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
