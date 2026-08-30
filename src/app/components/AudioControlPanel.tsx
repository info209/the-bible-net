import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, RotateCw, Repeat, Gauge, Timer, Volume2, X, Download, BookOpen, HardDrive, Trash2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import ProgressRing from './ui/ProgressRing';
import { useDownloadManager } from '@/hooks/useDownloadManager';
import { useNetworkStatusContext } from '@/lib/offline/NetworkStatusContext';
import { StorageManager, MAX_STORAGE_MB } from '@/lib/offline/StorageManager';
import { toast } from '@/context/ToastContext';

interface AudioControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize?: () => void; // kept for backwards compat — UI button removed
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
  selectedVersion?: string;
  selectedVersionId?: string;
  onChapterChange?: (chapter: number) => void;
  onBookChange?: (direction: 'prev' | 'next') => void;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

export default function AudioControlPanel({
  isOpen,
  onClose,

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
  selectedVersion = 'NKJV',
  selectedVersionId = 'NKJV',
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
  const [dragVersePreview, setDragVersePreview] = useState<number | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const { isOnline } = useNetworkStatusContext();
  const {
    storageInfo,
    getBookStatus,
    getChapterStatus,
    downloadBook,
    downloadChapter,
    deleteBook,
    deleteChapter,
    downloadStates,
  } = useDownloadManager();

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
    light: '#ffffff',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#1c1c1e'
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
    sepia: '#EDE3E1',
    cream: '#F5E8D5',
    dark: '#2c2c2e'
  }[theme];

  const pillBg = {
    light: '#f1f3f3',
    sepia: '#EDE3E1',
    cream: '#F5E8D5',
    dark: '#2c2c2e'
  }[theme];

  const pillBorder = {
    light: 'rgba(49, 57, 58, 0.08)',
    sepia: 'rgba(92, 74, 58, 0.1)',
    cream: 'rgba(74, 63, 42, 0.1)',
    dark: 'rgba(255, 255, 255, 0.05)'
  }[theme];

  const sliderTrackBg = {
    light: '#d9d9d9',
    sepia: '#d6c4b0',
    cream: '#dfd4c0',
    dark: '#2c2c2e'
  }[theme];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none">
      <div
        ref={panelRef}
        className="pointer-events-auto absolute bottom-0 left-0 right-0 rounded-t-[var(--radius-2xl)] shadow-[var(--shadow-xl)] max-w-[600px] mx-auto border-t max-h-[85dvh] flex flex-col overflow-hidden backdrop-blur-xl"
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
          {/* Drag zone (centered drag handle only to avoid blocking header buttons) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing z-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            <div className="w-[var(--drag-handle-width)] h-[var(--drag-handle-height)] bg-[var(--drag-handle-color)] rounded-full mt-2" />
          </div>

          {/* Header: Close button at top-right corner */}
          <div className="relative z-10 flex items-center justify-end px-4 pt-3 pb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="size-7 rounded-full flex items-center justify-center transition-colors hover:opacity-80 active:scale-95 cursor-pointer"
              style={{ backgroundColor: btnBg }}
              aria-label="Close player"
            >
              <X className="size-3.5" style={{ color: textSecondary }} />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ──────────────────────────────────────────────── */}
        <div
          className="px-4 pb-2 overflow-y-auto flex-1"
          style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
        >

          {/* Progress bar */}
          <div className="mb-2 px-8">
            <div className="relative h-4 mb-1" style={{ overflow: 'visible' }}>
              {/* Background track */}
              <div className="absolute top-[6px] w-full h-[4px] rounded-sm" style={{ backgroundColor: sliderTrackBg }} />
              {/* Progress track — uses preview verse during drag */}
              <div
                className="absolute top-[6px] h-[4px] bg-[var(--color-accent-rose)] rounded-sm"
                style={{ width: `${totalVerses > 0 ? (displayVerse / totalVerses) * 100 : 0}%` }}
              />
              {/* Thumb + tooltip — uses preview verse during drag */}
              <div
                className="absolute top-0 w-4 h-4 bg-[var(--color-accent-rose)] border-2 border-white rounded-full -ml-2 pointer-events-none shadow-sm"
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
                  setDragVersePreview(Number(e.target.value));
                }}
                onMouseDown={(e) => {
                  isDraggingSliderRef.current = true;
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
                  onVerseChange(verse);
                  setDragVersePreview(null);
                  onSliderDragEnd?.();
                }}
                onTouchEnd={(e) => {
                  isDraggingSliderRef.current = false;
                  const verse = Number((e.target as HTMLInputElement).value);
                  onVerseChange(verse);
                  setDragVersePreview(null);
                  onSliderDragEnd?.();
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            {/* Verse counter */}
            <div className="flex justify-between text-[10px] font-medium" style={{ color: textSecondary }}>
              <span>Verse {displayVerse}</span>
              <span>Total {totalVerses}</span>
            </div>
          </div>

          {/* ── Main controls ─────────────────────────────────────────────────── */}
          <div className="max-w-[280px] mx-auto flex items-center justify-between px-2 mb-3">

            {/* ← Chapter / Book back */}
            <button
              onClick={() => {
                if (selectedChapter > 1) {
                  onChapterChange?.(selectedChapter - 1);
                } else {
                  onBookChange?.('prev');
                }
              }}
              className="size-8 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: btnBg }}
              aria-label="Previous chapter"
            >
              <ChevronLeft className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>

            {/* Center group: Verse- / Play / Verse+ */}
            <div className="flex items-center gap-3">

              {/* V- */}
              <button
                onClick={() => (onVerseStep ?? onVerseChange)(Math.max(1, selectedVerse - 1))}
                className="size-8 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                aria-label="Previous verse"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCcw className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
                  <span className="absolute text-[7px] font-bold text-[var(--color-primary-teal)] mt-0.5">V-</span>
                </div>
              </button>

              {/* Big play with ProgressRing */}
              <ProgressRing
                progress={ringProgress}
                size={64}
                strokeWidth={3}
                trackColor={sliderTrackBg}
                color="var(--color-accent-rose)"
              >
                <button
                  onClick={onPlayPauseToggle}
                  className="size-[46px] rounded-full flex items-center justify-center
                    bg-[var(--color-primary-teal-lighter)]
                    shadow-[0px_2px_4px_0px_rgba(0,0,0,0.15)]
                    hover:scale-105 active:scale-95 transition-transform"
                  aria-label={audioPlaying ? "Pause" : "Play"}
                >
                  {audioPlaying ? (
                    <Pause className="size-4 text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)]" strokeWidth={0} />
                  ) : (
                    <Play className="size-4 text-[var(--color-primary-teal)] fill-[var(--color-primary-teal)] ml-0.5" strokeWidth={0} />
                  )}
                </button>
              </ProgressRing>

              {/* V+ */}
              <button
                onClick={() => (onVerseStep ?? onVerseChange)(Math.min(totalVerses, selectedVerse + 1))}
                className="size-8 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                aria-label="Next verse"
              >
                <div className="relative flex items-center justify-center">
                  <RotateCw className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
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
              className="size-8 rounded-full flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)] hover:scale-105 active:scale-95 transition-transform"
              style={{ backgroundColor: btnBg }}
              aria-label="Next chapter"
            >
              <ChevronRight className="size-[18px] text-[var(--color-primary-teal)]" strokeWidth={2.5} />
            </button>
          </div>

          {/* ── Secondary controls row ────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-4 rounded-[var(--radius-lg)] py-1.5 px-4 mx-auto w-fit shadow-sm mb-2"
            style={{
              backgroundColor: pillBg,
              border: `1px solid ${pillBorder}`,
            }}
          >

            {/* Repeat */}
            <button
              onClick={onRepeatModeToggle}
              className={`relative flex flex-col items-center justify-center gap-0.5
                hover:scale-105 active:scale-95 transition-transform
                ${repeatMode !== 'none' ? 'text-[var(--color-primary-teal)]' : ''}`}
              style={{ color: repeatMode !== 'none' ? undefined : textTertiary }}
              aria-label="Toggle repeat mode"
            >
              <div className="size-5 flex items-center justify-center">
                <Repeat className="size-4" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap leading-none">
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
              className="relative flex flex-col items-center justify-center gap-0.5
                hover:scale-105 active:scale-95 transition-transform"
              style={{ color: textTertiary }}
              aria-label="Change playback speed"
            >
              <div className="size-5 flex items-center justify-center">
                <Gauge className="size-4" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap leading-none">
                {playbackSpeed}x
              </span>
            </button>

            {/* Timer */}
            <button
              onClick={onTimerClick}
              className="relative flex flex-col items-center justify-center gap-0.5
                hover:scale-105 active:scale-95 transition-transform"
              style={{ color: textTertiary }}
              aria-label="Set sleep timer"
            >
              <div className="size-5 flex items-center justify-center">
                <Timer className="size-4" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap leading-none">
                Timer
              </span>
            </button>

            {/* Download */}
            <button
              id="audio-panel-download-btn"
              onClick={() => setShowDownloadModal(true)}
              className="relative flex flex-col items-center justify-center gap-0.5
                hover:scale-105 active:scale-95 transition-transform"
              style={{ color: textTertiary }}
              aria-label="Download book or chapter"
              title="Download options (100 MB Limit)"
            >
              <div className="size-5 flex items-center justify-center">
                <Download className="size-4" strokeWidth={2.2} />
              </div>
              <span className="text-[8px] font-bold whitespace-nowrap leading-none">
                Download
              </span>
            </button>
          </div>

          {/* ── Volume row ───────────────────────────────────────────────────── */}
          <div className="px-8 flex items-center gap-2.5 mt-1">
            <Volume2 className="size-3.5 shrink-0" strokeWidth={2.5} style={{ color: textTertiary }} />
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
            <span className="text-[11px] font-bold shrink-0 w-7 text-right" style={{ color: textTertiary }}>
              {Math.round(ttsVolume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Offline Downloads Modal (Book & Chapter Download + 100 MB Storage Cap) ── */}
      {showDownloadModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 pointer-events-auto"
          onClick={() => setShowDownloadModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 shadow-2xl border flex flex-col max-h-[85vh] overflow-hidden"
            style={{
              backgroundColor: panelBg,
              borderColor: panelBorder,
              color: textPrimary,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: panelBorder }}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Download className="size-4 text-[var(--color-primary-teal)]" />
                  Offline Downloads
                </h3>
                <p className="text-xs opacity-70 mt-0.5" style={{ color: textSecondary }}>
                  {selectedBook} {selectedChapter} &middot; {selectedVersion}
                </p>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="size-7 rounded-full flex items-center justify-center hover:opacity-80 transition-colors"
                style={{ backgroundColor: btnBg }}
              >
                <X className="size-4" style={{ color: textSecondary }} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              {/* 100 MB Storage Meter */}
              <div className="rounded-xl p-3.5 border" style={{ backgroundColor: btnBg, borderColor: panelBorder }}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="flex items-center gap-1.5" style={{ color: textPrimary }}>
                    <HardDrive className="size-3.5 text-[var(--color-primary-teal)]" />
                    Offline Storage Limit
                  </span>
                  <span style={{ color: textSecondary }}>
                    {StorageManager.formatBytes(storageInfo?.totalBytes ?? 0)} / 100 MB
                  </span>
                </div>
                <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: sliderTrackBg }}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (storageInfo?.totalBytes ?? 0) > 90 * 1024 * 1024
                        ? 'bg-rose-500'
                        : 'bg-[var(--color-primary-teal)]'
                    }`}
                    style={{
                      width: `${Math.min(100, ((storageInfo?.totalBytes ?? 0) / (100 * 1024 * 1024)) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] opacity-60 mt-1" style={{ color: textSecondary }}>
                  Strict 100 MB limit. Only one book of a version is downloaded at a time.
                </p>
              </div>

              {/* Action 1: Download Current Chapter */}
              <div className="rounded-xl p-3.5 border flex items-center justify-between gap-3" style={{ backgroundColor: pillBg, borderColor: panelBorder }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">
                    Download Chapter {selectedChapter}
                  </p>
                  <p className="text-[11px] opacity-60 truncate">
                    {selectedBook} {selectedChapter} ({selectedVersion})
                  </p>
                </div>
                {(() => {
                  const chStatus = getChapterStatus(selectedVersionId, selectedBook, selectedChapter);
                  const isDone = chStatus?.status === 'downloaded';
                  const isDownloading = chStatus?.status === 'downloading';

                  if (isDone) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Saved
                        </span>
                        <button
                          onClick={() => deleteChapter(selectedVersionId, selectedBook, selectedChapter)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-500 transition-colors"
                          title="Delete chapter"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  }

                  if (isDownloading) {
                    return (
                      <span className="text-xs text-[var(--color-primary-teal)] font-semibold flex items-center gap-1">
                        <RefreshCw className="size-3.5 animate-spin" /> Saving...
                      </span>
                    );
                  }

                  return (
                    <button
                      onClick={async () => {
                        if (!isOnline) {
                          toast.error('Connect to internet to download content.');
                          return;
                        }
                        try {
                          await downloadChapter({
                            versionId: selectedVersionId,
                            versionAbbreviation: selectedVersion,
                            bookId: selectedBook,
                            bookName: selectedBook,
                            chapterNumber: selectedChapter,
                          });
                          toast.success(`Downloaded ${selectedBook} ${selectedChapter}`);
                        } catch (err: any) {
                          toast.error(err.message || 'Download failed');
                        }
                      }}
                      disabled={!isOnline}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primary-teal)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shrink-0"
                    >
                      Download
                    </button>
                  );
                })()}
              </div>

              {/* Action 2: Download Full Book */}
              <div className="rounded-xl p-3.5 border space-y-2" style={{ backgroundColor: pillBg, borderColor: panelBorder }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">
                      Download Book ({selectedBook})
                    </p>
                    <p className="text-[11px] opacity-60">
                      All {totalChapters} chapters &middot; {selectedVersion}
                    </p>
                  </div>
                  {(() => {
                    const bStatus = getBookStatus(selectedVersionId, selectedBook);
                    const isDone = bStatus?.status === 'downloaded';
                    const isDownloading = bStatus?.status === 'downloading';

                    if (isDone) {
                      return (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Book Saved
                          </span>
                          <button
                            onClick={() => deleteBook(selectedVersionId, selectedBook)}
                            className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete book download"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    }

                    if (isDownloading) {
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-primary-teal)] font-semibold">
                          <RefreshCw className="size-3.5 animate-spin" />
                          <span>{bStatus?.progressPercent ?? 0}%</span>
                        </div>
                      );
                    }

                    return (
                      <button
                        onClick={async () => {
                          if (!isOnline) {
                            toast.error('Connect to internet to download content.');
                            return;
                          }
                          try {
                            await downloadBook({
                              versionId: selectedVersionId,
                              versionAbbreviation: selectedVersion,
                              bookId: selectedBook,
                              bookName: selectedBook,
                              chapterCount: totalChapters,
                            });
                            toast.success(`Downloaded all ${totalChapters} chapters of ${selectedBook}`);
                          } catch (err: any) {
                            toast.error(err.message || 'Download failed');
                          }
                        }}
                        disabled={!isOnline}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--color-primary-teal)] text-white hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shrink-0"
                      >
                        Download Book
                      </button>
                    );
                  })()}
                </div>

                {(() => {
                  const bStatus = getBookStatus(selectedVersionId, selectedBook);
                  if (bStatus?.status === 'downloading') {
                    return (
                      <div className="space-y-1 pt-1">
                        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: sliderTrackBg }}>
                          <div
                            className="h-full bg-[var(--color-primary-teal)] rounded-full transition-all duration-300"
                            style={{ width: `${bStatus.progressPercent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-right font-medium" style={{ color: textSecondary }}>
                          {bStatus.downloadedChapters ?? 0} of {totalChapters} chapters
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Section 3: List of Downloaded Books */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-60">
                  Downloaded Books
                </h4>
                {(() => {
                  const downloadedBooks = Object.values(downloadStates).filter(
                    (s) => s.status === 'downloaded' && s.targetType === 'book',
                  );

                  if (downloadedBooks.length === 0) {
                    return (
                      <p className="text-xs opacity-50 italic text-center py-2">
                        No books downloaded yet
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {downloadedBooks.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs"
                          style={{ backgroundColor: pillBg, borderColor: panelBorder }}
                        >
                          <div>
                            <span className="font-semibold">{rec.bookName}</span>
                            <span className="opacity-60 ml-1.5">({rec.versionAbbreviation})</span>
                          </div>
                          <button
                            onClick={() => deleteBook(rec.versionId, rec.bookId!)}
                            className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1 hover:underline"
                          >
                            <Trash2 className="size-3" /> Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
