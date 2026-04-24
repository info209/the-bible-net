"use client";

import { useState } from "react";
import { Play, Pause, X, ChevronUp } from "lucide-react";
import ProgressRing from "./ui/ProgressRing";

interface Props {
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  title: string;
  subtitle: string;
  onOpenPanel: () => void;
}

export default function AudioFloatingPlayer({
  isPlaying,
  progress,
  onPlayPause,
  onOpenPanel,
  onNext,
  onPrev,
  title,
  subtitle,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* ✅ MINIMIZED PLAYER (Image 3 style) */}
      {!expanded && (
        <div
          onClick={onOpenPanel}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 
          w-[92%] max-w-[420px]
          bg-[var(--color-bg-primary)]
          border border-[var(--color-border)]
          shadow-xl rounded-full px-4 py-3 flex items-center gap-3"
        >
          {/* Progress Ring */}
          <ProgressRing
            progress={progress}
            size={44}
            strokeWidth={4}
            trackColor="var(--color-bg-tertiary)"
            color="var(--color-accent-rose)"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayPause();
              }}
              className="w-8 h-8 flex items-center justify-center"
            >
              {isPlaying ? (
                <Pause className="text-[var(--color-accent-rose)]" />
              ) : (
                <Play className="text-[var(--color-accent-rose)] ml-[2px]" />
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

          {/* Expand */}
          <ChevronUp className="text-gray-400" />
        </div>
      )}

      {/* ✅ EXPANDED PLAYER (Image 2 + 4 style) */}
      {expanded && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full bg-[var(--color-bg-primary)] rounded-t-3xl p-5 shadow-2xl">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {title}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {subtitle}
                </p>
              </div>

              <button onClick={() => setExpanded(false)}>
                <X className="text-gray-500" />
              </button>
            </div>

            {/* MAIN PLAYER */}
            <div className="flex justify-center items-center gap-8 mb-6">

              {/* Prev */}
              <button onClick={onPrev} className="px-4 py-3 rounded-full border border-gray-200 
text-[var(--color-text-primary)] 
hover:bg-gray-100 transition">
                ⏮
              </button>

              {/* Big Play */}
              <ProgressRing
                progress={progress}
                size={130}
                strokeWidth={8}
                trackColor="var(--color-bg-tertiary)"
                color="var(--color-accent-rose)"
              >
                <button
                  onClick={onPlayPause}
                  className="w-20 h-20 rounded-full 
                  bg-[var(--color-accent-rose)] 
                  flex items-center justify-center text-white text-2xl shadow-lg"
                >
                  {isPlaying ? "❚❚" : "▶"}
                </button>
              </ProgressRing>

              {/* Next */}
              <button onClick={onNext} className="px-4 py-3 rounded-full border border-gray-200 
text-[var(--color-text-primary)] 
hover:bg-gray-100 transition">
                ⏭
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-rose)]"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}