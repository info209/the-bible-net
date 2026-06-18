"use client";

import React, { KeyboardEvent, useRef } from "react";

export const FONT_SIZES = [
  { label: "Small", value: 14 },
  { label: "Medium", value: 16 },
  { label: "Large", value: 18 },
  { label: "Extra Large", value: 22 },
];

interface FontSizeSelectorProps {
  fontSize: number;
  onChange: (value: number) => void;
  theme: {
    bg: string;
    text: string;
    subText: string;
    border: string;
    card: string;
    accent: string;
  };
}

export default function FontSizeSelector({
  fontSize,
  onChange,
  theme,
}: FontSizeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize/fallback value to closest mapping
  const activeIndex = FONT_SIZES.findIndex((f) => f.value === fontSize);
  const currentIndex = activeIndex >= 0 ? activeIndex : 2; // Default to Large (18)

  const progressPercent = (currentIndex / (FONT_SIZES.length - 1)) * 100;

  // Accidental double tap / rapid click protection
  const lastClickTime = useRef(0);
  const handleSelect = (value: number) => {
    const now = Date.now();
    if (now - lastClickTime.current < 250) {
      return; // Block rapid repeated taps
    }
    lastClickTime.current = now;

    if (value !== fontSize) {
      onChange(value);
    }
  };

  // Keyboard accessibility: Left/Right arrow keys
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, FONT_SIZES.length - 1);
      handleSelect(FONT_SIZES[nextIndex].value);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      handleSelect(FONT_SIZES[prevIndex].value);
    }
  };

  // Helper for dot dimensions based on requirements:
  // Dot 1 -> 10px
  // Dot 2 -> 14px
  // Dot 3 -> 18px
  // Dot 4 -> 22px
  const getDotSizeClass = (index: number) => {
    switch (index) {
      case 0:
        return "w-2.5 h-2.5"; // 10px
      case 1:
        return "w-3.5 h-3.5"; // 14px
      case 2:
        return "w-[18px] h-[18px]"; // 18px
      case 3:
      default:
        return "w-[22px] h-[22px]"; // 22px
    }
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-valuemin={14}
      aria-valuemax={22}
      aria-valuenow={fontSize}
      aria-valuetext={FONT_SIZES[currentIndex].label}
      aria-label="Font size selector"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative flex-1 h-11 flex items-center outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-lg"
      style={{
        color: theme.accent,
      }}
    >
      {/* BASE TRACK LINE */}
      <div
        className="absolute left-0 right-0 h-[3px] rounded-full transition-colors duration-300"
        style={{ background: theme.border }}
      />

      {/* ACTIVE TRACK PROGRESS */}
      <div
        className="absolute left-0 h-[3px] rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${progressPercent}%`,
          background: theme.accent,
        }}
      />

      {/* CLICKABLE STEP DOTS */}
      {FONT_SIZES.map((option, i) => {
        const isActive = i <= currentIndex;
        const isSelected = i === currentIndex;
        const dotSize = getDotSizeClass(i);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-11 h-11 flex items-center justify-center rounded-full transition-transform active:scale-95 hover:scale-105 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              left: `${(i / (FONT_SIZES.length - 1)) * 100}%`,
              ["--tw-ring-color" as any]: theme.accent,
            }}
            aria-label={`Font size: ${option.label} (${option.value} pixels)`}
            aria-pressed={isSelected}
          >
            {/* Masking dot to hide the track line behind it */}
            <div
              className={`absolute rounded-full ${dotSize}`}
              style={{
                backgroundColor: theme.bg,
              }}
            />

            {/* The visual dot */}
            <div
              className={`rounded-full transition-all duration-300 ease-out flex items-center justify-center relative ${dotSize}`}
              style={{
                background: isSelected
                  ? theme.accent
                  : isActive
                  ? theme.accent
                  : theme.border,
                border: isSelected ? "2px solid #ffffff" : "none",
                boxShadow: isSelected ? "0 4px 6px -1px rgba(0,0,0,0.15), 0 2px 4px -1px rgba(0,0,0,0.1)" : "none",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
