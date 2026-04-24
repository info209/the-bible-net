"use client";

import { useEffect } from "react";
import { Slider } from "./ui/slider";
import {
  ArrowLeft,
  Check,
  Square,
  FlipHorizontal,
  Layers,
} from "lucide-react";

export type ThemeType = "light" | "sepia" | "cream" | "dark";
export type TransitionType = "slide" | "fade" | "flip" | "curl" | "scroll";

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

  return (
    <div className="fixed inset-0 z-50 overlay-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl glass-heavy p-6">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-gray-600"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
            Fonts & Settings
          </h2>

          <button
            onClick={onClose}
            className="text-sm font-medium text-[var(--color-primary-teal)]"
          >
            Done
          </button>
        </div>

        {/* FONT FAMILY */}
        <div className="mb-6">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">
            Font family
          </p>

          <div className="relative">
            <select
              value={selectedFont}
              onChange={(e) => onFontChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[var(--color-gray-200)] bg-white px-4 py-3 text-sm outline-none"
              style={{ fontFamily: selectedFont }}
            >
              {FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>

            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              ▾
            </span>
          </div>
        </div>

        {/* FONT SIZE */}
        <div className="mb-6">
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            Font size
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">A-</span>

            <Slider
              value={[fontSize]}
              min={12}
              max={28}
              step={1}
              onValueChange={(v) => onFontSizeChange(v[0])}
              className="flex-1"
            />

            <span className="text-xs text-gray-500">A+</span>
          </div>
        </div>

        {/* THEME */}
        <div className="mb-6">
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
            Theme
          </p>

          <div className="flex gap-3">
            {["light", "sepia", "cream", "dark"].map((theme: any) => {
              const active = selectedTheme === theme;

              return (
                <button
                  key={theme}
                  onClick={() => onThemeChange(theme)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                    active
                      ? "border-[var(--color-primary-teal)]"
                      : "border-gray-200"
                  }`}
                >
                  {active && (
                    <Check size={14} className="text-[var(--color-primary-teal)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* TRANSITIONS */}
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-3">
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
                  className={`rounded-xl p-3 flex flex-col items-center gap-1 border ${
                    active
                      ? "border-[var(--color-primary-teal)] bg-[var(--color-primary-teal-subtle)]"
                      : "border-gray-200"
                  }`}
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