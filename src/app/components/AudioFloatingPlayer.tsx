"use client";

import { useState } from "react";
import ProgressRing from "./ui/ProgressRing";

interface AudioFloatingPlayerProps {
  isPlaying: boolean;
  progress: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function AudioFloatingPlayer({
  isPlaying,
  progress,
  onPlayPause,
  onNext,
  onPrev,
  className = "",
  title = "Audio Playback",
  subtitle = "Bible Narration",
}: AudioFloatingPlayerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 cursor-pointer rounded-full bg-white px-4 py-3 shadow-xl transition-all ${className}`}
        >
          <div className="flex items-center gap-3">
            <ProgressRing progress={progress} size={40} strokeWidth={4} trackColor="#e5e7eb" color="#10b981">
              <div className="flex h-8 w-8 items-center justify-center">
                <div className="flex gap-[2px]">
                  {[1, 2, 3].map((i) => (
                    <span key={i} className="h-4 w-[3px] rounded-full bg-emerald-600 animate-pulse" />
                  ))}
                </div>
              </div>
            </ProgressRing>

            <div>
              <p className="text-sm font-medium text-slate-900">{title}</p>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>

            <button
              onClick={(event) => {
                event.stopPropagation();
                onPlayPause();
              }}
              className="ml-auto text-slate-900"
              type="button"
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-6 shadow-2xl">
          <div className="relative text-center mb-5">
            <p className="text-base font-semibold text-slate-900">{title}</p>
            <p className="text-sm text-gray-400">{subtitle}</p>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute right-0 top-0 text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6">
            <button
              type="button"
              onClick={onPrev}
              className="rounded-full border border-gray-200 px-4 py-3 text-slate-900 transition hover:bg-gray-100"
            >
              ⏮
            </button>

            <ProgressRing progress={progress} size={120} strokeWidth={8} trackColor="#e5e7eb" color="#10b981">
              <button
                type="button"
                onClick={onPlayPause}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-700 text-white text-2xl shadow-lg"
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>
            </ProgressRing>

            <button
              type="button"
              onClick={onNext}
              className="rounded-full border border-gray-200 px-4 py-3 text-slate-900 transition hover:bg-gray-100"
            >
              ⏭
            </button>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-emerald-600"
              style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
}
