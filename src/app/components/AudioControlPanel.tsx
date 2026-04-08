import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, RotateCw, Repeat, Download, Gauge, Timer } from 'lucide-react';

interface AudioControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVerse: number;
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
  selectedVerse,
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
    if (deltaY > 0) { // Only allow dragging down
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
    if (deltaY > 0) { // Only allow dragging down
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

  return (
    <div className="fixed inset-0 z-[100] overlay-dark" onClick={onClose}>
      <div 
        ref={panelRef}
        className="absolute bottom-0 left-0 right-0 glass-heavy rounded-t-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-[600px] mx-auto transition-transform border-t border-white/40 max-h-[80dvh] overflow-hidden bg-white/95 backdrop-blur-xl" 
        style={{
          transform: `translateY(${currentY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable area with close indicator bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-[40px] flex items-center justify-center cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="w-[var(--drag-handle-width)] h-[var(--drag-handle-height)] bg-[var(--drag-handle-color)] rounded-full mt-[12px]" />
        </div>
        
        {/* Audio Control Content */}
        <div className="px-[16px] pt-[110px] pb-[32px] overflow-y-auto" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
          {/* Verse Selector - Positioned above progress bar */}
          <div 
            className="absolute left-[60px] top-[56px] transition-all duration-[var(--transition-slow)]"
            style={{ 
              left: `calc(60px + ${(audioCurrentTime / audioDuration) * 100}%)`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-[var(--color-accent-rose-lighter)] rounded-[var(--radius-xs)] px-[8px] py-[2px] flex flex-col items-center min-w-[48px]">
                <p className="text-[9px] leading-[14px] text-[var(--color-accent-rose)]">Verse</p>
                <p className="text-[14px] leading-[18px] text-[var(--color-accent-rose)] font-semibold">{selectedVerse}</p>
              </div>
              {/* Triangle pointer */}
              <div className="relative w-[12px] h-[8px]">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M6 8L0 0H12L6 8Z" fill="var(--color-accent-rose-lighter)" />
                </svg>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-[12px] px-[44px]">
            <div className="relative h-[20px] mb-[4px]">
              {/* Background track */}
              <div className="absolute top-[8px] w-full h-[4px] bg-[var(--color-bg-tertiary)] rounded-[2px]" />
              {/* Progress track */}
              <div 
                className="absolute top-[8px] h-[4px] bg-[var(--color-accent-rose)] rounded-[2px]" 
                style={{ width: `${(audioCurrentTime / audioDuration) * 100}%` }}
              />
              {/* Slider thumb */}
              <div 
                className="absolute top-[0px] w-[20px] h-[20px] bg-[var(--color-accent-rose)] border-[4px] border-[var(--color-accent-rose-light)] rounded-full -ml-[10px]"
                style={{ left: `${(audioCurrentTime / audioDuration) * 100}%` }}
              />
              <input
                type="range"
                min="1"
                max={Math.max(audioDuration, 1)}
                value={audioCurrentTime}
                onChange={(e) => onTimeChange(Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[11px] text-black font-medium">
              <span>Verse {Math.floor(audioCurrentTime)}</span>
              <span>Total {Math.floor(audioDuration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-[54px] mb-[32px]">
            {/* Skip Back Button */}
            <button 
              onClick={() => onVerseChange(Math.max(1, selectedVerse - 1))}
              className="relative bg-[var(--color-bg-secondary)] rounded-full shadow-[var(--shadow-sm)] size-[36px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <ChevronLeft className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>

            {/* Center group with 30s back, play, 30s forward */}
            <div className="flex items-center gap-[24px]">
              {/* 30 second back */}
              <button 
                onClick={() => onTimeChange(Math.max(0, audioCurrentTime - 30))}
                className="relative size-[32px] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="relative">
                   <RotateCcw className="size-[24px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                   <span className="absolute top-[7px] left-[7px] text-[7px] font-bold text-[var(--color-primary-teal)]">V-</span>
                </div>
              </button>

              {/* Play/Pause - Large Center Button */}
              <button 
                onClick={onPlayPauseToggle}
                className="bg-[var(--color-primary-teal-lighter)] rounded-full size-[58px] flex items-center justify-center shadow-[0px_2px_4px_0px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-transform"
              >
                {audioPlaying ? (
                  <Pause className="size-[26px] text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)]" strokeWidth={0} />
                ) : (
                  <Play className="size-[26px] text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)] ml-1" strokeWidth={0} />
                )}
              </button>

              {/* 30 second forward */}
              <button 
                onClick={() => onTimeChange(Math.min(audioDuration, audioCurrentTime + 30))}
                className="relative size-[32px] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
              >
                <div className="relative">
                  <RotateCw className="size-[24px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                  <span className="absolute top-[7px] right-[7px] text-[7px] font-bold text-[var(--color-primary-teal)]">V+</span>
                </div>
              </button>
            </div>

            {/* Skip Forward Button */}
            <button 
              onClick={() => onVerseChange(selectedVerse + 1)}
              className="relative bg-[var(--color-bg-secondary)] rounded-full shadow-[var(--shadow-sm)] size-[36px] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            >
              <ChevronRight className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-center gap-[32px] glass-light rounded-[var(--radius-xl)] py-[12px] px-[24px] mx-auto w-fit shadow-glass mb-[24px]">
            {/* Repeat */}
            <button 
              onClick={onRepeatModeToggle}
              className={`flex flex-col items-center justify-center relative hover:scale-110 active:scale-95 transition-transform ${repeatMode !== 'none' ? 'text-[var(--color-primary-teal)]' : 'text-[var(--color-text-tertiary)]'}`}
            >
              <div className="size-[28px] flex items-center justify-center">
                <Repeat className="size-[24px]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap absolute -bottom-[10px] uppercase">
                {repeatMode}
              </span>
            </button>

            {/* Playback Speed */}
            <button 
              onClick={() => {
                const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                const currentIndex = speeds.indexOf(playbackSpeed);
                onSpeedChange(speeds[(currentIndex + 1) % speeds.length]);
              }}
              className="flex flex-col items-center justify-center relative hover:scale-110 active:scale-95 transition-transform"
            >
              <div className="size-[28px] flex items-center justify-center">
                <Gauge className="size-[22px] text-[var(--color-text-tertiary)]" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold text-[var(--color-text-tertiary)] whitespace-nowrap absolute -bottom-[10px]">
                {playbackSpeed}x
              </span>
            </button>

            {/* Timer */}
            <button 
              onClick={onTimerClick}
              className="size-[28px] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            >
              <Timer className="size-[22px] text-[var(--color-text-tertiary)]" strokeWidth={2.2} />
            </button>
          </div>

          {/* Volume Slider row */}
          <div className="px-10 flex items-center justify-center gap-4 mt-2">
            <span className="text-xs font-bold text-gray-400">0%</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="5"
              value={Math.round(ttsVolume * 100)}
              onChange={(e) => {
                const newVolume = parseInt(e.target.value) / 100;
                onVolumeChange(newVolume);
                console.log('Volume changed to:', newVolume);
              }}
              className="w-full accent-[var(--color-primary-teal)]" 
            />
            <span className="text-xs font-bold text-gray-400">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
