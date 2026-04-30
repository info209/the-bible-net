"use client";

import { useEffect } from "react";
import {
  Moon,
  Sun,
  Coffee,
  CloudSun,
  Square,
  Layers,
  FlipHorizontal,
} from "lucide-react";

export type ThemeType = "light" | "sepia" | "cream" | "dark";
export type TransitionType = "slide" | "fade" | "flip";

const FONTS = [
  "Times New Roman",
  "Georgia",
  "Arial",
  "Verdana",
  "Helvetica",
  "Merriweather",
];

const TRANSITIONS = [
  { id: "slide", label: "Slide", icon: Square },
  { id: "fade", label: "Fade", icon: Layers },
  { id: "flip", label: "Flip", icon: FlipHorizontal },
];

export default function FontsSettingsModal({
  isOpen,
  onClose,
  selectedFont,
  onFontChange,
  fontSize,
  onFontSizeChange,
  selectedTheme,
  onThemeChange,
  pageTransition,
  onPageTransitionChange,
}: any) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
  }, [isOpen]);

  if (!isOpen) return null;

  // 🔥 THEME SYSTEM
  const getThemeStyles = () => {
    switch (selectedTheme) {
      case "dark":
        return {
          bg: "#2e2e2e",
          text: "#ffffff",
          subText: "#b0b0b0",
          border: "#444",
          card: "#3a3a3a",
          accent: "#ffffff",
        };

      case "sepia":
        return {
          bg: "#f5e6c8",
          text: "#5b4636",
          subText: "#8a6f5a",
          border: "#e0c9a6",
          card: "#f8ecd4",
          accent: "var(--color-accent-rose)",
        };

      case "cream":
        return {
          bg: "#f8f6f1",
          text: "#31393a",
          subText: "#7c7c7c",
          border: "#e5e5e5",
          card: "#ffffff",
          accent: "var(--color-accent-rose)",
        };

      default:
        return {
          bg: "#ffffff",
          text: "#31393a",
          subText: "#7c7c7c",
          border: "#e5e5e5",
          card: "#ffffff",
          accent: "var(--color-accent-rose)",
        };
    }
  };

  const theme = getThemeStyles();

  const progressPercent = ((fontSize - 12) / (28 - 12)) * 100;

  return (
    <div className="fixed inset-0 z-50 overlay-light flex items-center justify-center px-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-xl p-6 transition-all duration-300"
        style={{
          background: theme.bg,
          color: theme.text,
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold">Fonts &amp; Settings</h2>

          <button
            onClick={onClose}
            className="text-sm font-medium"
            style={{ color: "var(--color-primary-teal)" }}
          >
            Done
          </button>
        </div>

        {/* FONT FAMILY */}
        <div className="mb-6">
          <p className="text-xs mb-2" style={{ color: theme.subText }}>
            Font family
          </p>

          <div className="relative">
            <select
              value={selectedFont}
              onChange={(e) => onFontChange(e.target.value)}
              className="w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none"
              style={{
                background: theme.card,
                border: `1px solid ${theme.border}`,
                fontFamily: selectedFont,
                color: theme.text,
              }}
            >
              {FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>

            <span
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: theme.subText }}
            >
              ▾
            </span>
          </div>
        </div>

        {/* FONT SIZE */}
        <div className="mb-6">
          <p className="text-xs mb-4" style={{ color: theme.subText }}>
            Font size
          </p>

          <div className="flex items-center gap-3">
            <span style={{ color: theme.subText }}>A-</span>

            <div className="relative flex-1 h-6">
              {/* BASE LINE */}
              <div
                className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 rounded-full"
                style={{ background: theme.border }}
              />

              {/* ACTIVE LINE */}
              <div
                className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-full transition-all"
                style={{
                  width: `${progressPercent}%`,
                  background: theme.accent,
                }}
              />

              {/* DOTS */}
              {[0, 1, 2, 3].map((i) => {
                const stepValue = 12 + i * ((28 - 12) / 3);
                const isActive = fontSize >= stepValue;

                return (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${(i / 3) * 100}%` }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        background: isActive
                          ? theme.accent
                          : theme.border,
                      }}
                    />
                  </div>
                );
              })}

              {/* INPUT */}
              <input
                type="range"
                min={12}
                max={28}
                step={1}
                value={fontSize}
                onChange={(e) =>
                  onFontSizeChange(Number(e.target.value))
                }
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />

              {/* THUMB */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${progressPercent}%`,
                  background: theme.accent,
                }}
              />
            </div>

            <span style={{ color: theme.subText }}>A+</span>
          </div>
        </div>

        {/* THEME */}
        <div className="mb-6">
          <p className="text-xs mb-3" style={{ color: theme.subText }}>
            Theme
          </p>

          <div className="flex gap-2 flex-wrap">
            {([
              { id: "light",  label: "Light",  icon: Sun,      bg: "#ffffff", iconColor: "#f59e0b" },
              { id: "sepia",  label: "Sepia",  icon: Coffee,   bg: "#f5e6c8", iconColor: "#92400e" },
              { id: "cream",  label: "Cream",  icon: CloudSun, bg: "#f8f6f1", iconColor: "#b45309" },
              { id: "dark",   label: "Night",  icon: Moon,     bg: "#2e2e2e", iconColor: "#c4b5fd" },
            ] as const).map(({ id, label, icon: Icon, bg, iconColor }) => {
              const active = selectedTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => onThemeChange(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    background: bg,
                    borderColor: active ? "var(--color-primary-teal)" : theme.border,
                    borderWidth: active ? "2px" : "1px",
                    boxShadow: active ? "0 0 0 1px var(--color-primary-teal)" : "none",
                  }}
                >
                  <Icon size={14} style={{ color: iconColor }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: id === "dark" ? "#e5e7eb" : "#374151" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TRANSITIONS */}
        <div>
          <p className="text-xs mb-3" style={{ color: theme.subText }}>
            Page transitions
          </p>

          <div className="grid grid-cols-3 gap-3">
            {TRANSITIONS.map((t) => {
              const active = pageTransition === t.id;
              const Icon = t.icon;

              return (
                <button
                  key={t.id}
                  onClick={() => onPageTransitionChange(t.id)}
                  className="rounded-xl p-3 flex flex-col items-center gap-1 transition-all"
                  style={{
                    border: `1px solid ${
                      active ? theme.accent : theme.border
                    }`,
                    background: active
                      ? "rgba(210,57,82,0.08)"
                      : theme.card,
                  }}
                >
                  <Icon size={18} />
                  <span className="text-xs">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}