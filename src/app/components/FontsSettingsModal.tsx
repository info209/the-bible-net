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
import FontSizeSelector from "./FontSizeSelector";

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
          bg: "#1c1c1e",
          text: "#e5e7e7",
          subText: "#8e8e93",
          border: "rgba(255,255,255,0.08)",
          card: "#2c2c2e",
          accent: "var(--color-accent-rose)",
        };

      case "sepia":
        return {
          bg: "#F7EFED",
          text: "#5c4a3a",
          subText: "#7d6855",
          border: "rgba(92, 74, 58, 0.15)",
          card: "#EDE3E1",
          accent: "var(--color-accent-rose)",
        };

      case "cream":
        return {
          bg: "#FEF6EB",
          text: "#4a3f2a",
          subText: "#6e5f46",
          border: "rgba(74, 63, 42, 0.15)",
          card: "#F5E8D5",
          accent: "var(--color-accent-rose)",
        };

      default:
        return {
          bg: "#ffffff",
          text: "#31393a",
          subText: "#6b7280",
          border: "rgba(49, 57, 58, 0.1)",
          card: "#f1f3f3",
          accent: "var(--color-accent-rose)",
        };
    }
  };

  const theme = getThemeStyles();

  const backdropBg = selectedTheme === 'dark'
    ? 'rgba(0,0,0,0.85)'
    : 'rgba(0,0,0,0.4)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: backdropBg, backdropFilter: selectedTheme === 'dark' ? 'blur(8px)' : 'blur(4px)' }}
    >
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
            <span style={{ color: theme.subText }} aria-hidden="true">A-</span>

            <FontSizeSelector
              fontSize={fontSize}
              onChange={onFontSizeChange}
              theme={theme}
            />

            <span style={{ color: theme.subText }} aria-hidden="true">A+</span>
          </div>
        </div>

        {/* THEME */}
        <div className="mb-6">
          <p className="text-xs mb-3 font-medium uppercase tracking-wider opacity-60" style={{ color: theme.subText }}>
            Theme Selection
          </p>

          <div className="flex justify-between items-center w-full px-2">
            {([
              { id: "light", icon: Sun,      bg: "#ffffff", iconColor: "#f59e0b", label: "Light" },
              { id: "sepia", icon: Coffee,   bg: "#F7EFED", iconColor: "#92400e", label: "Sepia" },
              { id: "cream", icon: CloudSun, bg: "#FEF6EB", iconColor: "#b45309", label: "Cream" },
              { id: "dark",  icon: Moon,     bg: "#2e2e2e", iconColor: "#c4b5fd", label: "Dark" },
            ] as const).map(({ id, icon: Icon, bg, iconColor, label }) => {
              const active = selectedTheme === id;
              return (
                <div key={id} className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => onThemeChange(id)}
                    className="relative flex items-center justify-center size-12 rounded-full transition-all duration-300 shadow-sm active:scale-95 group"
                    style={{
                      background: bg,
                      borderColor: active ? "var(--color-primary-teal)" : theme.border,
                      borderWidth: active ? "2px" : "1px",
                    }}
                    aria-label={`Select ${label} theme`}
                  >
                    <Icon size={20} style={{ color: iconColor }} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                    
                    {/* Active Indicator Badge */}
                    {active && (
                      <div className="absolute -top-1 -right-1 bg-[var(--color-primary-teal)] text-white p-0.5 rounded-full shadow-md z-10 scale-90">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wide transition-colors duration-300"
                        style={{ color: active ? "var(--color-primary-teal)" : theme.subText }}>
                    {label}
                  </span>
                </div>
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
                  className="relative rounded-none aspect-square p-2 flex flex-col items-center justify-center gap-1.5 transition-all duration-300 active:scale-95 group overflow-hidden border"
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