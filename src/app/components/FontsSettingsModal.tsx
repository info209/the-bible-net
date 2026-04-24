"use client";

import { useEffect } from "react";
import { Slider } from "./ui/slider";

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

const THEME_OPTIONS: Array<{
  id: ThemeType;
  label: string;
  description: string;
  accent: string;
  bg: string;
}> = [
  {
    id: "light",
    label: "Light",
    description: "Bright background for daytime reading",
    accent: "border-slate-900",
    bg: "bg-white",
  },
  {
    id: "sepia",
    label: "Sepia",
    description: "Soft warm tint for long sessions",
    accent: "border-amber-500",
    bg: "bg-amber-100",
  },
  {
    id: "cream",
    label: "Cream",
    description: "Gentle off-white reading surface",
    accent: "border-emerald-600",
    bg: "bg-slate-50",
  },
  {
    id: "dark",
    label: "Dark",
    description: "Low-light mode with high contrast",
    accent: "border-slate-300",
    bg: "bg-slate-900",
  },
];

interface FontsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFont: string;
  onFontChange: (font: string) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  selectedTheme: ThemeType;
  onThemeChange: (theme: ThemeType) => void;
  pageTransition: TransitionType;
  onPageTransitionChange: (transition: TransitionType) => void;
}

function ThemeSelector({
  value,
  onChange,
}: {
  value: ThemeType;
  onChange: (theme: ThemeType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {THEME_OPTIONS.map((theme) => {
        const active = theme.id === value;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange(theme.id)}
            className={`rounded-3xl border p-4 text-left transition shadow-sm ${
              active
                ? "border-slate-900 bg-slate-100"
                : "border-gray-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`inline-flex h-3.5 w-3.5 rounded-full border ${theme.accent} ${theme.bg}`} 
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">{theme.label}</p>
                <p className="text-xs text-gray-500">{theme.description}</p>
              </div>
            </div>
            <div className="text-xs font-medium text-slate-700">
              {active ? "Selected" : "Tap to select"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

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
}: FontsSettingsModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const transitionOptions: TransitionType[] = [
    "slide",
    "fade",
    "flip",
    "curl",
    "scroll",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Back
          </button>
          <h2 className="text-base font-semibold text-slate-900">Fonts & Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Done
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div>
            <p className="text-sm text-gray-500 mb-3">Font family</p>
            <select
              value={selectedFont}
              onChange={(e) => onFontChange(e.target.value)}
              className="w-full rounded-3xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              style={{ fontFamily: selectedFont }}
            >
              {FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">Font size</p>
              <span className="text-sm font-semibold text-slate-900">{fontSize}px</span>
            </div>
            <Slider
              value={[fontSize]}
              min={12}
              max={24}
              step={1}
              onValueChange={(value) => onFontSizeChange(value[0] ?? 12)}
              className="h-10"
            />
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-3">Theme</p>
            <ThemeSelector value={selectedTheme} onChange={onThemeChange} />
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-3">Page transitions</p>
            <div className="grid grid-cols-3 gap-3">
              {transitionOptions.map((transition) => {
                const label = transition.charAt(0).toUpperCase() + transition.slice(1);
                const isActive = pageTransition === transition;

                return (
                  <button
                    key={transition}
                    type="button"
                    onClick={() => onPageTransitionChange(transition)}
                    className={`rounded-3xl border p-4 text-center text-sm transition ${
                      isActive
                        ? "border-slate-900 bg-slate-100 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
