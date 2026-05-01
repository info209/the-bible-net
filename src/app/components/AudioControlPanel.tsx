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
  onTimeChange: (time: number) => void;
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
  onTimeChange,
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
  onBookChange
}: AudioControlPanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Progress for the ProgressRing: audio progress
  const ringProgress = audioDuration > 0 ? Math.min(Math.max(audioCurrentTime / audioDuration, 0), 1) : 0;

  return (
    <div className="fixed inset-0 z-[100] overlay-dark" onClick={onClose}>
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 glass-heavy rounded-t-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-[600px] mx-auto border-t border-white/40 max-h-[85dvh] flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl"
        style={{
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
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

          {/* Header: Minimize (left) + Close (right) */}
          <div className="flex items-center justify-between px-4 pt-6 pb-2">
            <button
              onClick={onMinimize ?? onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full
                bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
                transition-colors"
              aria-label="Minimize player"
            >
              <Minimize2 className="size-4 text-[var(--color-text-secondary)]" />
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Minimize</span>
            </button>

            <button
              onClick={onClose}
              className="size-8 rounded-full flex items-center justify-center
                bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]
                transition-colors"
              aria-label="Close player"
            >
              <X className="size-4 text-[var(--color-text-secondary)]" />
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
            <div className="relative h-5 mb-1">
              {/* Background track */}
              <div className="absolute top-[8px] w-full h-[4px] bg-[var(--color-bg-tertiary)] rounded-sm" />
              {/* Progress track */}
              <div
                className="absolute top-[8px] h-[4px] bg-[var(--color-accent-rose)] rounded-sm"
                style={{ width: `${totalVerses > 0 ? (selectedVerse / totalVerses) * 100 : 0}%` }}
              />
              {/* Thumb + tooltip */}
              <div
                className="absolute top-0 w-5 h-5 bg-[var(--color-accent-rose)] border-4 border-[var(--color-accent-rose-light)] rounded-full -ml-2.5 pointer-events-none"
                style={{ left: `${totalVerses > 0 ? (selectedVerse / totalVerses) * 100 : 0}%` }}
              >
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center">
                  <div className="bg-[var(--color-accent-rose-lighter)] rounded-[var(--radius-xs)] px-2 py-0.5 flex flex-col items-center min-w-[40px] shadow-sm">
                    <p className="text-[8px] leading-3 text-[var(--color-accent-rose)]">Verse</p>
                    <p className="text-[12px] leading-4 text-[var(--color-accent-rose)] font-bold">{selectedVerse}</p>
                  </div>
                  <svg width="8" height="6" viewBox="0 0 12 8" fill="none" className="mx-auto block">
                    <path d="M6 8L0 0H12L6 8Z" fill="var(--color-accent-rose-lighter)" />
                  </svg>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max={Math.max(totalVerses, 1)}
                value={selectedVerse}
                onChange={(e) => onVerseChange(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Verse counter */}
            <div className="flex justify-between text-[11px] text-[var(--color-text-secondary)] font-medium">
              <span>Verse {selectedVerse}</span>
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
              className="size-9 rounded-full flex items-center justify-center shrink-0
                bg-[var(--color-bg-secondary)] shadow-[var(--shadow-sm)]
                hover:scale-105 active:scale-95 transition-transform"
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>

            {/* Center group: Verse- / Play / Verse+ */}
            <div className="flex items-center gap-6">

              {/* V- */}
              <button
                onClick={() => onVerseChange(Math.max(1, selectedVerse - 1))}
                className="size-8 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
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
                trackColor="var(--color-bg-tertiary)"
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
                onClick={() => onVerseChange(Math.min(totalVerses, selectedVerse + 1))}
                className="size-8 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
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
              className="size-9 rounded-full flex items-center justify-center shrink-0
                bg-[var(--color-bg-secondary)] shadow-[var(--shadow-sm)]
                hover:scale-105 active:scale-95 transition-transform"
              aria-label="Next chapter"
            >
              <ChevronRight className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>
          </div>

          {/* ── Secondary controls row ────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-6
            glass-light rounded-[var(--radius-xl)]
            py-2 px-6 mx-auto w-fit
            shadow-glass mb-4">

            {/* Repeat */}
            <button
              onClick={onRepeatModeToggle}
              className={`relative flex flex-col items-center justify-center gap-3
                hover:scale-110 active:scale-95 transition-transform
                ${repeatMode !== 'none' ? 'text-[var(--color-primary-teal)]' : 'text-[var(--color-text-tertiary)]'}`}
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
              aria-label="Change playback speed"
            >
              <div className="size-7 flex items-center justify-center">
                <Gauge className="size-[22px] text-[var(--color-text-tertiary)]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold text-[var(--color-text-tertiary)] whitespace-nowrap leading-none">
                {playbackSpeed}x
              </span>
            </button>

            {/* Timer */}
            <button
              onClick={onTimerClick}
              className="size-7 flex items-center justify-center
                hover:scale-110 active:scale-95 transition-transform"
              aria-label="Set sleep timer"
            >
              <Timer className="size-[22px] text-[var(--color-text-tertiary)]" strokeWidth={2.2} />
            </button>
          </div>

          {/* ── Volume row ───────────────────────────────────────────────────── */}
          <div className="px-10 flex items-center gap-4 mt-2">
            <Volume2 className="size-4 text-[var(--color-text-tertiary)] shrink-0" strokeWidth={2.5} />
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
            <span className="text-xs font-bold text-[var(--color-text-tertiary)] shrink-0 w-8 text-right">
              {Math.round(ttsVolume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
