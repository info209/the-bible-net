'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import Link from 'next/link';
import {
  BookmarkPlus, FileText, Plus, X, ChevronLeft, ChevronDown, ChevronUp,
  CheckCircle2, MinusCircle, ArrowRightLeft,
  Share2, Bookmark, Lock, Trash2, BookmarkCheck, Copy
} from 'lucide-react';
import { RiShareForwardLine } from 'react-icons/ri';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_LABEL_LENGTH = 40;
const SUGGESTED_LABELS = ['Hope', 'Faith', 'Prayer', 'Wisdom', 'Joy', 'Grace', 'Peace', 'Love'];

const PRIMARY_COLORS = [
  { id: 'yellow', color: '#FFD234', label: 'Yellow' },
  { id: 'green', color: '#4CD964', label: 'Green' },
  { id: 'blue', color: '#34AADC', label: 'Blue' },
  { id: 'pink', color: '#FF6B9D', label: 'Pink' },
  { id: 'purple', color: '#A66CFF', label: 'Purple' },
];
const ALL_COLORS = [
  ...PRIMARY_COLORS,
  { id: 'orange', color: '#FF9500', label: 'Orange' },
  { id: 'red', color: '#FF3B30', label: 'Red' },
  { id: 'teal', color: '#5AC8FA', label: 'Teal' },
  { id: 'lime', color: '#A4D65E', label: 'Lime' },
  { id: 'rose', color: '#FF2D55', label: 'Rose' },
];

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFD234',
  green:  '#4CD964',
  blue:   '#34AADC',
  pink:   '#FF6B9D',
  purple: '#A66CFF',
  orange: '#FF9500',
  red:    '#FF3B30',
  teal:   '#5AC8FA',
  lime:   '#A4D65E',
  rose:   '#FF2D55',
};

// ─── Types ───────────────────────────────────────────────────────────────────
export interface VerseActionMenuProps {
  isOpen: boolean;
  bookName: string;
  chapter: number;
  selectedVerses: number[];
  onClose: () => void;
  onHighlight: (color: string) => void | Promise<void>;
  onSave: (labels: string[], note: string, isPrivate: boolean) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onNote: (note: string, labels: string[]) => void | Promise<void>;
  onCompare?: () => void;
  onShare?: () => void;
  onCopy?: () => void;
  existingHighlightColor?: string | null;
  /** Labels the verses are already saved under */
  existingSaveLabels?: string[] | null;
  existingSaveNote?: string | null;
  existingSaveIsPrivate?: boolean;
  existingNoteText?: string | null;
  existingNoteLabels?: string[] | null;
  /** The _id of the existing save (if it exists) */
  savedVerseId?: string | null;
  /** DB-persisted user labels */
  userLabels?: string[];
  /** Called when user creates a new label */
  onAddUserLabel?: (label: string) => Promise<void>;
  isLoggedIn?: boolean;
  isDark?: boolean;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatVerses(bookName: string, chapter: number, selectedVerses: number[]): string {
  if (!selectedVerses.length) return '';
  const sorted = [...selectedVerses].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = start;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) { end = sorted[i]; }
    else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      if (i < sorted.length) { start = sorted[i]; end = start; }
    }
  }
  return `${bookName} ${chapter}:${ranges.join(', ')}`;
}

// ─── Toggle component ────────────────────────────────────────────────────────
function IOSToggle({ checked, onChange, isDark, selectedTheme }: { checked: boolean; onChange: (v: boolean) => void; isDark: boolean; selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark' }) {
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  const uncheckedBg = {
    light: '#E5E7EB',
    sepia: '#e0c9a6',
    cream: '#e5e5e5',
    dark: '#2C2C2E'
  }[theme];
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 transition-all active:scale-95"
      style={{
        width: 38, height: 22,
        borderRadius: 999,
        backgroundColor: checked ? '#31C4BE' : uncheckedBg,
      }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        style={{
          position: 'absolute', top: 2, width: 18, height: 18,
          borderRadius: '50%', backgroundColor: '#ffffff',
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.22)',
        }}
      />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VerseActionMenu({
  isOpen,
  bookName,
  chapter,
  selectedVerses,
  onClose,
  onHighlight,
  onSave,
  onDelete,
  onNote,
  onCompare,
  onShare,
  onCopy,
  existingHighlightColor = null,
  existingSaveLabels = null,
  existingSaveNote = null,
  existingSaveIsPrivate = false,
  existingNoteText = null,
  existingNoteLabels = null,
  savedVerseId = null,
  userLabels = [],
  onAddUserLabel,
  isLoggedIn = false,
  isDark = false,
  selectedTheme,
}: VerseActionMenuProps) {
  const [view, setView] = useState<'main' | 'save' | 'note'>('main');
  const dragControls = useDragControls();
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    existingHighlightColor && existingHighlightColor !== 'none' ? existingHighlightColor : null
  );

  const [labelInput, setLabelInput] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [isPrivate, setIsPrivate] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const labelInputRef = useRef<HTMLInputElement>(null);

  const isSavedVerse = Array.isArray(existingSaveLabels);
  const formattedVerses = formatVerses(bookName, chapter, selectedVerses);

  // Reset form when opened / verse changes
  useEffect(() => {
    if (isOpen) {
      setView('main');
      setPaletteExpanded(false);
      setSelectedColor(
        existingHighlightColor && existingHighlightColor !== 'none' ? existingHighlightColor : null
      );
      setSelectedLabels(existingSaveLabels ?? []);
      setNoteInput(existingSaveNote ?? '');
      setIsPrivate(existingSaveIsPrivate ?? false);
      setLabelInput('');
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [isOpen, existingHighlightColor, existingSaveLabels, existingSaveNote, existingSaveIsPrivate, existingNoteText, existingNoteLabels]);

  // ── Dynamic Themes tokens ────────────────────────────────────────────────
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  const dm = theme === 'dark';
  
  const iconColor = {
    light: '#000000',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#FFFFFF'
  }[theme];
  
  const sheetBg = {
    light: '#FFFFFF',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#1c1c1e'
  }[theme];

  const dragBg = {
    light: 'rgba(0,0,0,0.14)',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255,255,255,0.18)'
  }[theme];

  const labelText = {
    light: '#1C1C1E',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#F5F5F7'
  }[theme];

  const subText = {
    light: '#8E8E93',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: '#8E8E93'
  }[theme];

  const inputBg = {
    light: '#F9FAFB',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#111111'
  }[theme];

  const inputBorder = {
    light: '#E5E7EB',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: '#2C2C2E'
  }[theme];

  const inputText = {
    light: '#374151',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#F5F5F7'
  }[theme];

  const headerBorder = {
    light: '1px solid rgba(0,0,0,0.04)',
    sepia: '1px solid rgba(92, 74, 58, 0.12)',
    cream: '1px solid rgba(74, 63, 42, 0.12)',
    dark: '1px solid rgba(255,255,255,0.06)'
  }[theme];

  const actionBg = {
    light: '#F9FAFB',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#111111'
  }[theme];

  const actionBorder = {
    light: '1px solid rgba(0,0,0,0.06)',
    sepia: '1px solid rgba(92, 74, 58, 0.15)',
    cream: '1px solid rgba(74, 63, 42, 0.15)',
    dark: '1px solid rgba(255,255,255,0.18)'
  }[theme];

  const chipBg = {
    light: '#F3F4F6',
    sepia: '#EDE3E1',
    cream: '#F5E8D5',
    dark: '#111111'
  }[theme];

  const chipBorder = {
    light: '1px solid #E5E7EB',
    sepia: '1px solid rgba(92, 74, 58, 0.15)',
    cream: '1px solid rgba(74, 63, 42, 0.15)',
    dark: '1px solid rgba(255,255,255,0.18)'
  }[theme];

  const sectionTxt = {
    light: '#9CA3AF',
    sepia: '#927d6c',
    cream: '#83745c',
    dark: '#636366'
  }[theme];

  // ── Label helpers ─────────────────────────────────────────────────────────
  const allUserLabels = userLabels.filter(
    (l) => !SUGGESTED_LABELS.some((s) => s.toLowerCase() === l.toLowerCase())
  );

  const toggleLabel = useCallback((label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }, []);

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = labelInput.trim();
    if (!trimmed || trimmed.length > MAX_LABEL_LENGTH) return;

    const alreadyExists = [...SUGGESTED_LABELS, ...userLabels].some(
      (l) => l.toLowerCase() === trimmed.toLowerCase()
    );

    if (!alreadyExists && onAddUserLabel) {
      await onAddUserLabel(trimmed);
    }
    if (!selectedLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedLabels((prev) => [...prev, trimmed]);
    }
    setLabelInput('');
  };

  const handleCommitSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await onSave(selectedLabels, noteInput, isPrivate);
    setIsSaving(false);
    setView('main');
  };

  const handleDeleteSave = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    await onDelete?.();
    setIsDeleting(false);
    onClose();
  };

  // ── Applied Highlight State Resolution ─────────────────────────────────────
  const isHighlighted = !!existingHighlightColor && existingHighlightColor !== 'none';

  const appliedColorObj = isHighlighted
    ? ALL_COLORS.find(
        (c) =>
          c.id === existingHighlightColor ||
          c.color.toLowerCase() === existingHighlightColor.toLowerCase()
      ) || {
        id: existingHighlightColor!,
        color: HIGHLIGHT_COLOR_MAP[existingHighlightColor!] || existingHighlightColor!,
        label: 'Current Highlight',
      }
    : null;

  const FRONT_COLORS = [
    { id: 'yellow', color: '#FFD234', label: 'Yellow' },
    { id: 'green', color: '#4CD964', label: 'Green' },
    { id: 'blue', color: '#34AADC', label: 'Blue' },
  ];

  let paletteList: typeof ALL_COLORS = [];
  if (paletteExpanded) {
    if (isHighlighted && appliedColorObj) {
      const remaining = ALL_COLORS.filter(
        (c) => c.id !== appliedColorObj.id && c.color.toLowerCase() !== appliedColorObj.color.toLowerCase()
      );
      paletteList = [appliedColorObj, ...remaining];
    } else {
      paletteList = ALL_COLORS;
    }
  } else {
    if (isHighlighted && appliedColorObj) {
      const remaining = ALL_COLORS.filter(
        (c) => c.id !== appliedColorObj.id && c.color.toLowerCase() !== appliedColorObj.color.toLowerCase()
      ).slice(0, 2);
      paletteList = [appliedColorObj, ...remaining];
    } else {
      paletteList = FRONT_COLORS;
    }
  }

  // ── Swipe-down dismiss ────────────────────────────────────────────────────
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80 && info.velocity.y > 0) onClose();
  };

  if (!isOpen) return null;

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* ── Bottom Sheet ──────────────────────────────────────────────── */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[1110] overflow-hidden"
            style={{
              backgroundColor: sheetBg,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              height: 'auto',
              maxHeight: view !== 'main' ? '85vh' : '50vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            data-bottom-sheet="true"
          >
            {/* ── Drag Handle ───────────────────────────────────────────── */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="flex items-center justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing shrink-0"
            >
              <div className="w-9 h-1 rounded-full" style={{ backgroundColor: dragBg }} />
            </div>

            <AnimatePresence mode="wait">
              {/* ═══ MAIN VIEW ═══════════════════════════════════════════ */}
              {view === 'main' && (
                <motion.div
                  key="main"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 pt-2 pb-4 flex flex-col flex-1 min-h-0 overflow-y-auto"
                >
                  {/* Selected verse label */}
                  <p
                    className="text-center text-[11px] mb-2 shrink-0"
                    style={{ color: subText }}
                  >
                    Selected:{' '}
                    <span className="font-semibold" style={{ color: labelText }}>
                      {formattedVerses}
                    </span>
                  </p>

                  {!isLoggedIn ? (
                    /* ── Login prompt ──────────────────────────────────── */
                    <div
                      className="rounded-[16px] p-4 border border-dashed"
                      style={{ backgroundColor: actionBg, borderColor: dm ? '#3A3A3C' : '#E5E7EB' }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
                          style={{ backgroundColor: dm ? '#1C1C1E' : '#FFFFFF' }}
                        >
                          <BookmarkPlus className="w-[18px] h-[18px] text-[#31C4BE]" />
                        </div>
                        <h3 className="text-[13px] font-bold mb-0.5" style={{ color: labelText }}>
                          Log in to save & highlight
                        </h3>
                        <p className="text-[10px] mb-3 leading-relaxed" style={{ color: subText }}>
                          Sign in to save verses, highlight, and take personal notes.
                        </p>
                        <div className="flex w-full">
                          <Link
                            href="/auth/login"
                            className="flex-1 py-2 bg-[#31C4BE] text-white text-[12px] font-bold rounded-[12px] shadow-[0_4px_15px_rgba(49,196,190,0.22)] active:scale-95 transition-all text-center"
                          >
                            Log in
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── Single Action Row (Highlight Palette + Action Icons) ── */}
                      <div className="flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto scrollbar-none flex-nowrap py-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {/* ── Highlight Palette Container ──────────── */}
                        <motion.div
                          layout
                          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                          className="shrink-0 flex items-center justify-between gap-1 sm:gap-1.5 px-2 rounded-[16px] h-[58px] min-h-[58px] max-h-[58px]"
                          style={{
                            backgroundColor: actionBg,
                            border: actionBorder,
                          }}
                        >
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap">
                            <AnimatePresence initial={false} mode="popLayout">
                              {paletteList.map((c, index) => {
                                const isApplied = isHighlighted && appliedColorObj && (c.id === appliedColorObj.id || c.color.toLowerCase() === appliedColorObj.color.toLowerCase());
                                const isFirstItemWithRemove = isApplied && index === 0;

                                return (
                                  <motion.button
                                    key={c.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.15 }}
                                    onClick={() => {
                                      if (isFirstItemWithRemove) {
                                        onHighlight('none');
                                        onClose();
                                      } else {
                                        setSelectedColor(c.id);
                                        onHighlight(c.id);
                                        onClose();
                                      }
                                    }}
                                    title={isFirstItemWithRemove ? `Remove ${c.label} highlight` : `Highlight ${c.label}`}
                                    aria-label={isFirstItemWithRemove ? `Remove ${c.label} highlight` : `Highlight ${c.label}`}
                                    className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-sm"
                                    style={{ backgroundColor: c.color }}
                                  >
                                    {/* Active selection ring */}
                                    {isApplied && (
                                      <span
                                        className="absolute rounded-full pointer-events-none"
                                        style={{
                                          inset: -2.5,
                                          border: '1.5px solid #31C4BE',
                                          boxShadow: '0 0 5px rgba(49,196,190,0.35)',
                                        }}
                                      />
                                    )}

                                    {/* Remove "×" icon overlay on the first item if highlighted */}
                                    {isFirstItemWithRemove && (
                                      <span className="w-4 h-4 rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center text-white shadow-sm border border-white/30">
                                        <X className="w-2.5 h-2.5 stroke-[2.5]" />
                                      </span>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </AnimatePresence>
                          </div>

                          {/* Overlapping Double-Circle Expand / Collapse Button */}
                          <motion.button
                            layout
                            onClick={() => setPaletteExpanded((prev) => !prev)}
                            title={paletteExpanded ? "Collapse colors" : "More colors"}
                            aria-label={paletteExpanded ? "Collapse colors" : "More colors"}
                            className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-sm overflow-hidden ml-0.5"
                            style={{
                              backgroundColor: dm ? '#2C2C2E' : '#E5E7EB',
                              border: actionBorder,
                            }}
                          >
                            {paletteExpanded ? (
                              <ChevronLeft className="w-4 h-4" style={{ color: labelText }} />
                            ) : (
                              <div className="relative w-full h-full flex items-center justify-center">
                                {/* Purple circle (underneath / right) */}
                                <span
                                  className="absolute right-[2px] top-[4px] w-4 h-4 rounded-full border border-white dark:border-[#1c1c1e] shadow-sm"
                                  style={{ backgroundColor: '#A66CFF' }}
                                />
                                {/* Pink circle (on top / left) */}
                                <span
                                  className="absolute left-[2px] top-[4px] w-4 h-4 rounded-full border border-white dark:border-[#1c1c1e] shadow-sm"
                                  style={{ backgroundColor: '#FF6B9D' }}
                                />
                              </div>
                            )}
                          </motion.button>
                        </motion.div>

                        {/* ── Save Button ──────────────────────────── */}
                        <button
                          onClick={() => {
                            setSelectedLabels(existingSaveLabels ?? []);
                            setNoteInput(existingSaveNote ?? '');
                            setView('save');
                          }}
                          id="verse-action-save"
                          aria-label="Save verse"
                          className="flex flex-col items-center justify-center gap-0.5 w-[42px] sm:w-[48px] md:w-[52px] h-[58px] rounded-[16px] shrink-0 transition-all active:scale-95"
                          style={{
                            backgroundColor: isSavedVerse ? 'rgba(49,196,190,0.16)' : actionBg,
                            border: isSavedVerse ? '1px solid rgba(49,196,190,0.24)' : actionBorder,
                          }}
                        >
                          {isSavedVerse ? (
                            <BookmarkCheck className="w-[18px] h-[18px] text-[#31C4BE]" strokeWidth={2} />
                          ) : (
                            <BookmarkPlus className="w-[18px] h-[18px]" strokeWidth={2} style={{ color: iconColor }} />
                          )}
                          <span className="text-[10px] font-bold" style={{ color: isSavedVerse ? '#31C4BE' : iconColor }}>
                            {isSavedVerse ? 'Saved' : 'Save'}
                          </span>
                        </button>

                        {/* ── Note Button ──────────────────────────── */}
                        <button
                          onClick={() => {
                            setSelectedLabels(existingNoteLabels ?? []);
                            setNoteInput(existingNoteText ?? '');
                            setView('note');
                          }}
                          id="verse-action-note"
                          aria-label="Add note"
                          className="flex flex-col items-center justify-center gap-0.5 w-[42px] sm:w-[48px] md:w-[52px] h-[58px] rounded-[16px] shrink-0 transition-all active:scale-95"
                          style={{ backgroundColor: actionBg, border: actionBorder }}
                        >
                          <FileText className="w-[18px] h-[18px]" strokeWidth={2} style={{ color: iconColor }} />
                          <span className="text-[10px] font-bold" style={{ color: iconColor }}>Note</span>
                        </button>

                        {/* ── Copy Button ──────────────────────────── */}
                        <button
                          onClick={() => onCopy?.()}
                          id="verse-action-copy"
                          aria-label="Copy verse"
                          className="flex flex-col items-center justify-center gap-0.5 w-[42px] sm:w-[48px] md:w-[52px] h-[58px] rounded-[16px] shrink-0 transition-all active:scale-95"
                          style={{ backgroundColor: actionBg, border: actionBorder }}
                        >
                          <Copy className="w-[18px] h-[18px]" strokeWidth={2} style={{ color: iconColor }} />
                          <span className="text-[10px] font-bold" style={{ color: iconColor }}>Copy</span>
                        </button>

                        {/* ── Share Button ──────────────────────────── */}
                        <button
                          onClick={() => onShare?.()}
                          id="verse-action-share"
                          aria-label="Share verse"
                          className="flex flex-col items-center justify-center gap-0.5 w-[42px] sm:w-[48px] md:w-[52px] h-[58px] rounded-[16px] shrink-0 transition-all active:scale-95"
                          style={{ backgroundColor: actionBg, border: actionBorder }}
                        >
                          <RiShareForwardLine className="w-[18px] h-[18px]" style={{ color: iconColor }} />
                          <span className="text-[10px] font-bold" style={{ color: iconColor }}>Share</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ═══ SAVE VIEW ════════════════════════════════════════════ */}
              {view === 'save' && (
                <motion.div
                  key="save-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col flex-1 min-h-0"
                  style={{ height: '100%' }}
                >
                  {/* ── Header ──────────────────────────────────────────── */}
                  <div
                    className="flex items-center px-4 pt-3 shrink-0"
                    style={{ borderBottom: headerBorder, paddingBottom: 12 }}
                  >
                    <button
                      onClick={() => setView('main')}
                      className="relative z-20 p-1.5 -ml-1.5 rounded-xl active:scale-95 transition-colors"
                      style={{ color: subText }}
                      aria-label="Back to actions"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <div className="flex-1 text-center -ml-6">
                      <h4
                        className="font-semibold"
                        style={{ fontSize: 17, color: labelText, letterSpacing: '-0.02em', lineHeight: 1.1 }}
                      >
                        {isSavedVerse ? 'Saved Verse' : 'Save Verse'}
                      </h4>
                      <p className="mt-0.5" style={{ fontSize: 12, color: subText, lineHeight: 1 }}>
                        {isSavedVerse ? 'Saved' : 'Saving'} {formattedVerses}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="relative z-20 p-1.5 rounded-xl active:scale-95 transition-colors"
                      style={{ color: subText }}
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* ── Scrollable body ──────────────────────────────────── */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-4">
                    {/* ── Label input ──────────────────────────────────── */}
                    <form onSubmit={handleAddLabel} className="flex gap-2 mt-3 mb-4 shrink-0">
                      <input
                        ref={labelInputRef}
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        maxLength={MAX_LABEL_LENGTH}
                        placeholder="Create new label..."
                        aria-label="New label name"
                        className="flex-1 focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 transition-all text-[16px] md:text-[13px]"
                        style={{
                          height: 38,
                          borderRadius: 12,
                          padding: '0 12px',
                          backgroundColor: inputBg,
                          border: `1px solid ${inputBorder}`,
                          color: inputText,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!labelInput.trim()}
                        aria-label="Add label"
                        className="flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40"
                        style={{
                          width: 38, height: 38,
                          borderRadius: 12,
                          backgroundColor: '#31C4BE',
                          boxShadow: '0 4px 12px rgba(49,196,190,0.22)',
                        }}
                      >
                        <Plus className="w-[14px] h-[14px] text-white" strokeWidth={2.5} />
                      </button>
                    </form>

                    {/* ── Saved Labels section ─────────────────────────── */}
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-widest mb-1.5" style={{ color: sectionTxt }}>
                        Saved labels
                      </p>
                      {allUserLabels.length === 0 ? (
                        <p className="text-[11px]" style={{ color: subText }}>No saved labels yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {allUserLabels.map((label) => {
                            const isSelected = selectedLabels.includes(label);
                            return (
                              <button
                                key={label}
                                onClick={() => toggleLabel(label)}
                                aria-selected={isSelected}
                                className={`flex items-center gap-1.5 transition-all active:scale-95 ${
                                  isSelected ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400' : ''
                                }`}
                                style={{
                                  height: 28,
                                  borderRadius: 999,
                                  padding: '0 10px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  backgroundColor: isSelected ? (isDark ? 'rgba(11,122,129,0.20)' : '#E6F4F5') : chipBg,
                                  border: isSelected ? (isDark ? '1px solid rgba(11,122,129,0.40)' : '1px solid rgba(11,122,129,0.20)') : chipBorder,
                                  color: isSelected ? (isDark ? '#14B8A6' : '#0B7A81') : labelText,
                                }}
                              >
                                <span>{label}</span>
                                {isSelected && <X className="w-3 h-3 shrink-0 ml-auto opacity-70 hover:opacity-100" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ── Suggestions section ──────────────────────────── */}
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-widest mb-1.5" style={{ color: sectionTxt }}>
                        Suggestions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_LABELS.map((label) => {
                          const isSelected = selectedLabels.includes(label);
                          return (
                            <button
                              key={label}
                              onClick={() => toggleLabel(label)}
                              aria-selected={isSelected}
                              className={`flex items-center gap-1.5 transition-all active:scale-95 ${
                                isSelected ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400' : ''
                              }`}
                              style={{
                                height: 28,
                                borderRadius: 999,
                                padding: '0 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: isSelected ? (isDark ? 'rgba(11,122,129,0.20)' : '#E6F4F5') : chipBg,
                                border: isSelected ? (isDark ? '1px solid rgba(11,122,129,0.40)' : '1px solid rgba(11,122,129,0.20)') : chipBorder,
                                color: isSelected ? (isDark ? '#14B8A6' : '#0B7A81') : labelText,
                              }}
                            >
                              <span>{label}</span>
                              {isSelected && <X className="w-3 h-3 shrink-0 ml-auto opacity-70 hover:opacity-100" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>


                    {/* ── Delete button (if already saved) ────────────── */}
                    {isSavedVerse && onDelete && (
                      <button
                        onClick={handleDeleteSave}
                        disabled={isDeleting}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px] mb-3 active:scale-95 transition-all disabled:opacity-60"
                        style={{
                          backgroundColor: 'rgba(255,59,48,0.12)',
                          border: '1px solid rgba(255,59,48,0.18)',
                          color: '#FF3B30',
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        aria-label="Delete saved verse"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isDeleting ? 'Deleting…' : 'Delete Saved Verse'}
                      </button>
                    )}

                    {/* bottom padding for scroll */}
                    <div className="h-3 shrink-0" />
                  </div>

                  {/* ── Sticky Save Button ───────────────────────────────── */}
                  <div
                    className="px-4 pt-2.5 pb-4 shrink-0"
                    style={{ borderTop: headerBorder }}
                  >
                    <button
                      onClick={handleCommitSave}
                      disabled={isSaving}
                      id="save-verse-btn"
                      className="w-full flex items-center justify-center font-semibold active:scale-[0.98] transition-all disabled:opacity-60"
                      style={{
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: '#31C4BE',
                        color: 'white',
                        fontSize: 13,
                        boxShadow: '0 4px 12px rgba(49,196,190,0.22)',
                      }}
                      aria-label={isSavedVerse ? 'Update saved verse' : 'Save verse'}
                    >
                      {isSaving ? 'Saving…' : isSavedVerse ? 'Update Saved Verse' : 'Save Verse'}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ═══ NOTE VIEW ════════════════════════════════════════════ */}
              {view === 'note' && (
                <motion.div
                  key="note-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col flex-1 min-h-0"
                  style={{ height: '100%' }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center px-4 pt-3 shrink-0"
                    style={{ borderBottom: headerBorder, paddingBottom: 12 }}
                  >
                    <button
                      onClick={() => setView('main')}
                      className="relative z-20 p-1.5 -ml-1.5 transition-colors rounded-xl active:scale-95"
                      style={{ color: subText }}
                      aria-label="Back"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <div className="flex-1 text-center -ml-6">
                      <h4
                        className="font-semibold"
                        style={{ fontSize: 17, color: labelText, letterSpacing: '-0.02em', lineHeight: 1.1 }}
                      >
                        Add Note
                      </h4>
                      <p className="mt-0.5" style={{ fontSize: 12, color: subText, lineHeight: 1 }}>
                        {formattedVerses}
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="relative z-20 p-1.5 rounded-xl active:scale-95 transition-colors"
                      style={{ color: subText }}
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto min-h-0 px-4">
                    {/* Label input */}
                    <form onSubmit={handleAddLabel} className="flex gap-2 mt-3 mb-4 shrink-0">
                      <input
                        ref={labelInputRef}
                        type="text"
                        value={labelInput}
                        onChange={(e) => setLabelInput(e.target.value)}
                        maxLength={MAX_LABEL_LENGTH}
                        placeholder="Create new label..."
                        aria-label="New label name"
                        className="flex-1 focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 transition-all text-[16px] md:text-[13px]"
                        style={{
                          height: 38,
                          borderRadius: 12,
                          padding: '0 12px',
                          backgroundColor: inputBg,
                          border: `1px solid ${inputBorder}`,
                          color: inputText,
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!labelInput.trim()}
                        aria-label="Add label"
                        className="flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40"
                        style={{
                          width: 38, height: 38,
                          borderRadius: 12,
                          backgroundColor: '#31C4BE',
                          boxShadow: '0 4px 12px rgba(49,196,190,0.22)',
                        }}
                      >
                        <Plus className="w-[14px] h-[14px] text-white" strokeWidth={2.5} />
                      </button>
                    </form>

                    {/* Saved Labels section */}
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-widest mb-1.5" style={{ color: sectionTxt }}>
                        Saved labels
                      </p>
                      {allUserLabels.length === 0 ? (
                        <p className="text-[11px]" style={{ color: subText }}>No saved labels yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {allUserLabels.map((label) => {
                            const isSelected = selectedLabels.includes(label);
                            return (
                              <button
                                key={label}
                                onClick={() => toggleLabel(label)}
                                aria-selected={isSelected}
                                className={`flex items-center gap-1.5 transition-all active:scale-95 ${
                                  isSelected ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400' : ''
                                }`}
                                style={{
                                  height: 28,
                                  borderRadius: 999,
                                  padding: '0 10px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  backgroundColor: isSelected ? (isDark ? 'rgba(11,122,129,0.20)' : '#E6F4F5') : chipBg,
                                  border: isSelected ? (isDark ? '1px solid rgba(11,122,129,0.40)' : '1px solid rgba(11,122,129,0.20)') : chipBorder,
                                  color: isSelected ? (isDark ? '#14B8A6' : '#0B7A81') : labelText,
                                }}
                              >
                                <span>{label}</span>
                                {isSelected && <X className="w-3 h-3 shrink-0 ml-auto opacity-70 hover:opacity-100" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Suggestions section */}
                    <div className="mb-4">
                      <p className="text-[10px] font-semibold tracking-widest mb-1.5" style={{ color: sectionTxt }}>
                        Suggestions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {SUGGESTED_LABELS.map((label) => {
                          const isSelected = selectedLabels.includes(label);
                          return (
                            <button
                              key={label}
                              onClick={() => toggleLabel(label)}
                              aria-selected={isSelected}
                              className={`flex items-center gap-1.5 transition-all active:scale-95 ${
                                isSelected ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400' : ''
                              }`}
                              style={{
                                height: 28,
                                borderRadius: 999,
                                padding: '0 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                backgroundColor: isSelected ? (isDark ? 'rgba(11,122,129,0.20)' : '#E6F4F5') : chipBg,
                                border: isSelected ? (isDark ? '1px solid rgba(11,122,129,0.40)' : '1px solid rgba(11,122,129,0.20)') : chipBorder,
                                color: isSelected ? (isDark ? '#14B8A6' : '#0B7A81') : labelText,
                              }}
                            >
                              <span>{label}</span>
                              {isSelected && <X className="w-3 h-3 shrink-0 ml-auto opacity-70 hover:opacity-100" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <textarea
                      autoFocus
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="Write your thoughts here…"
                      className="w-full rounded-[12px] p-3 text-[16px] md:text-[13px] focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 resize-none mb-4 shrink-0"
                      style={{
                        height: 110,
                        backgroundColor: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: inputText,
                      }}
                    />

                    {/* bottom padding for scroll */}
                    <div className="h-3 shrink-0" />
                  </div>

                  {/* Sticky Save Note Button */}
                  <div
                    className="px-4 pt-2.5 pb-4 shrink-0"
                    style={{ borderTop: headerBorder }}
                  >
                    <button
                      onClick={() => { onNote(noteInput, selectedLabels); onClose(); }}
                      className="w-full flex items-center justify-center font-semibold active:scale-[0.98] transition-all"
                      style={{
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: '#31C4BE',
                        color: 'white',
                        fontSize: 13,
                        boxShadow: '0 4px 12px rgba(49,196,190,0.22)',
                      }}
                    >
                      Save Note
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
