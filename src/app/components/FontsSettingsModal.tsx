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
  MoveVertical,
  Check,
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
  { id: "fade", label: "Fade", icon: Layers },
  { id: "slide", label: "Slide", icon: Square },
  { id: "curl", label: "Curl", icon: FlipHorizontal },
  { id: "scroll", label: "Scroll", icon: MoveVertical },
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
          <p className="text-xs mb-3 font-medium uppercase tracking-wider opacity-60" style={{ color: theme.subText }}>
            Theme Selection
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { id: "light", icon: Sun,      bg: "#ffffff", iconColor: "#f59e0b", label: "Light" },
              { id: "sepia", icon: Coffee,   bg: "#f5e6c8", iconColor: "#92400e", label: "Sepia" },
              { id: "cream", icon: CloudSun, bg: "#f8f6f1", iconColor: "#b45309", label: "Cream" },
              { id: "dark",  icon: Moon,     bg: "#2e2e2e", iconColor: "#c4b5fd", label: "Dark" },
            ] as const).map(({ id, icon: Icon, bg, iconColor, label }) => {
              const active = selectedTheme === id;
              return (
                <button
                  key={id}
                  onClick={() => onThemeChange(id)}
                  className="relative flex flex-col items-center justify-center py-5 rounded-2xl border transition-all duration-300 active:scale-95 group overflow-hidden"
                  style={{
                    background: bg,
                    borderColor: active ? "var(--color-primary-teal)" : theme.border,
                    borderWidth: active ? "2px" : "1px",
                    boxShadow: active ? "0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)" : "none",
                    transform: active ? "translateY(-2px)" : "translateY(0)",
                  }}
                >
                  {/* Subtle Background Glow for Active Theme */}
                  {active && (
                    <div 
                      className="absolute inset-0 opacity-[0.08] animate-pulse"
                      style={{ background: "var(--color-primary-teal)" }}
                    />
                  )}

                  <div className={`p-2.5 rounded-full mb-1.5 transition-all duration-300 ${active ? 'scale-110 shadow-sm' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`}
                       style={{ 
                         background: active ? 'rgba(0,0,0,0.03)' : 'transparent',
                       }}>
                    <Icon size={24} style={{ color: iconColor }} />
                  </div>
                  
                  <span className="text-[11px] font-bold uppercase tracking-wide transition-colors duration-300"
                        style={{ color: active ? "var(--color-primary-teal)" : theme.text }}>
                    {label}
                  </span>

                  {/* Active Indicator Badge */}
                  {active && (
                    <div className="absolute top-2 right-2 bg-[var(--color-primary-teal)] text-white p-0.5 rounded-full shadow-lg scale-110">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}

                  {/* Hover Effect Layer */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition-colors pointer-events-none" />
                </button>
              );
            })}
          </div>
        </div>

        {/* TRANSITIONS */}
        <div>
          <p className="text-xs mb-3 font-medium uppercase tracking-wider opacity-60" style={{ color: theme.subText }}>
            Page Transitions
          </p>

          <div className="grid grid-cols-4 gap-2.5">
            {TRANSITIONS.map((t) => {
              const active = pageTransition === t.id;
              const Icon = t.icon;

              return (
                <button
                  key={t.id}
                  onClick={() => onPageTransitionChange(t.id)}
                  className="relative rounded-2xl py-4 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 group overflow-hidden border"
                  style={{
                    borderColor: active ? "var(--color-primary-teal)" : theme.border,
                    borderWidth: active ? "2px" : "1px",
                    background: active
                      ? "rgba(210,57,82,0.05)"
                      : theme.card,
                    boxShadow: active ? "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)" : "none",
                    transform: active ? "translateY(-2px)" : "translateY(0)",
                  }}
                >
                  <div className={`p-2 rounded-full transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 group-hover:-translate-y-0.5'}`}
                       style={{ background: active ? 'rgba(0,0,0,0.03)' : 'transparent' }}>
                    <Icon size={20} style={{ color: active ? "var(--color-primary-teal)" : theme.text }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight"
                        style={{ color: active ? "var(--color-primary-teal)" : theme.text }}>
                    {t.label}
                  </span>

                  {active && (
                    <div className="absolute top-1.5 right-1.5 bg-[var(--color-primary-teal)] text-white p-0.5 rounded-full shadow-sm">
                      <Check size={8} strokeWidth={4} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}