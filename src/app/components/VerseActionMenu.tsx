'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import Link from 'next/link';
import {
  BookmarkPlus, FileText, Plus, X, ChevronLeft,
  CheckCircle2, MinusCircle, PenTool, ArrowRightLeft,
  Share2, Bookmark, Lock, Trash2, BookmarkCheck
} from 'lucide-react';

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
  onNote: (note: string) => void | Promise<void>;
  onCompare?: () => void;
  onShare?: () => void;
  existingHighlightColor?: string | null;
  /** Labels the verses are already saved under */
  existingSaveLabels?: string[] | null;
  existingSaveNote?: string | null;
  existingSaveIsPrivate?: boolean;
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
  existingHighlightColor = null,
  existingSaveLabels = null,
  existingSaveNote = null,
  existingSaveIsPrivate = false,
  savedVerseId = null,
  userLabels = [],
  onAddUserLabel,
  isLoggedIn = false,
  isDark = false,
  selectedTheme,
}: VerseActionMenuProps) {
  const [view, setView] = useState<'main' | 'save' | 'note' | 'highlight'>('main');
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>(existingHighlightColor || 'yellow');

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
      setSelectedColor(existingHighlightColor || 'yellow');
      setSelectedLabels(existingSaveLabels ?? []);
      setNoteInput(existingSaveNote ?? '');
      setIsPrivate(existingSaveIsPrivate ?? false);
      setLabelInput('');
      setIsSaving(false);
      setIsDeleting(false);
    }
  }, [isOpen, existingHighlightColor, existingSaveLabels, existingSaveNote, existingSaveIsPrivate]);

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
    sepia: '#faf0e3',
    cream: '#fdf6eb',
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
    sepia: '#faf0e3',
    cream: '#fdf6eb',
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
    sepia: '#faf0e3',
    cream: '#fdf6eb',
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
    sepia: '#f2dec6',
    cream: '#fcf0db',
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

  const backdropBg = {
    light: 'rgba(0,0,0,0.42)',
    sepia: 'rgba(0,0,0,0.45)',
    cream: 'rgba(0,0,0,0.45)',
    dark: 'rgba(0,0,0,0.82)'
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

  const handleColorTap = (colorId: string, index: number, total: number) => {
    const isLast = index === total - 1;
    if (isLast && !paletteExpanded) { setPaletteExpanded(true); return; }
    setSelectedColor(colorId);
    onHighlight(colorId);
    onClose();
  };

  const displayColors = paletteExpanded ? ALL_COLORS : PRIMARY_COLORS;

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
            dragConstraints={{ top: 0 }}
            dragElastic={0.18}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[1110] overflow-hidden"
            style={{
              backgroundColor: sheetBg,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              height: '38vh',
              maxHeight: '38vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            data-bottom-sheet="true"
          >
            {/* ── Drag Handle ───────────────────────────────────────────── */}
            <div className="flex items-center justify-center pt-3 pb-0 cursor-grab active:cursor-grabbing">
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
                  className="px-4 pt-3 pb-6 flex flex-col flex-1 min-h-0 overflow-y-auto"
                >
                  {/* Selected verse label */}
                  <p
                    className="text-center text-[11px] mb-3"
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
                      className="rounded-[20px] p-5 border border-dashed"
                      style={{ backgroundColor: actionBg, borderColor: dm ? '#3A3A3C' : '#E5E7EB' }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                          style={{ backgroundColor: dm ? '#1C1C1E' : '#FFFFFF' }}
                        >
                          <BookmarkPlus className="w-6 h-6 text-[#31C4BE]" />
                        </div>
                        <h3 className="text-[14px] font-bold mb-1" style={{ color: labelText }}>
                          Login to Save & Highlight
                        </h3>
                        <p className="text-[11px] mb-4 leading-relaxed" style={{ color: subText }}>
                          Sign in to save verses, highlight, and take personal notes.
                        </p>
                        <div className="flex w-full">
                          <Link
                            href="/auth/login"
                            className="flex-1 py-3 bg-[#31C4BE] text-white text-[13px] font-bold rounded-[16px] shadow-[0_6px_20px_rgba(49,196,190,0.28)] active:scale-95 transition-all text-center"
                          >
                            Login
                          </Link>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ── Action Button Grid ──────────────────────────── */}
                      <div className="grid grid-cols-4 gap-2.5">
                        {/* Highlight */}
                        <button
                          onClick={() => setView('highlight')}
                          id="verse-action-highlight"
                          aria-label="Highlight verse"
                          className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[18px] transition-all active:scale-95 animate-none"
                          style={{
                            backgroundColor: existingHighlightColor ? 'rgba(49,196,190,0.16)' : actionBg,
                            border: existingHighlightColor ? '1px solid rgba(49,196,190,0.24)' : actionBorder,
                          }}
                        >
                          <PenTool
                            className="w-[24px] h-[24px]"
                            strokeWidth={2.2}
                            style={{ color: existingHighlightColor ? '#31C4BE' : iconColor }}
                          />
                          <span className="text-[10px] font-bold" style={{ color: existingHighlightColor ? '#31C4BE' : iconColor }}>
                            Highlight
                          </span>
                        </button>

                        {/* Save */}
                        <button
                          onClick={() => setView('save')}
                          id="verse-action-save"
                          aria-label="Save verse"
                          className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[18px] transition-all active:scale-95"
                          style={{
                            backgroundColor: isSavedVerse ? 'rgba(49,196,190,0.16)' : actionBg,
                            border: isSavedVerse ? '1px solid rgba(49,196,190,0.24)' : actionBorder,
                          }}
                        >
                          {isSavedVerse ? (
                            <BookmarkCheck className="w-[24px] h-[24px] text-[#31C4BE]" strokeWidth={2.2} />
                          ) : (
                            <BookmarkPlus className="w-[24px] h-[24px]" strokeWidth={2.2} style={{ color: iconColor }} />
                          )}
                          <span className="text-[10px] font-bold" style={{ color: isSavedVerse ? '#31C4BE' : iconColor }}>
                            {isSavedVerse ? 'Saved' : 'Save'}
                          </span>
                        </button>

                        {/* Note */}
                        <button
                          onClick={() => setView('note')}
                          id="verse-action-note"
                          aria-label="Add note"
                          className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[18px] transition-all active:scale-95"
                          style={{ backgroundColor: actionBg, border: actionBorder }}
                        >
                          <FileText className="w-[24px] h-[24px]" strokeWidth={2.2} style={{ color: iconColor }} />
                          <span className="text-[10px] font-bold" style={{ color: iconColor }}>Note</span>
                        </button>

                        {/* Share */}
                        <button
                          onClick={() => onShare?.()}
                          id="verse-action-share"
                          aria-label="Share verse"
                          className="flex flex-col items-center justify-center gap-1.5 aspect-square rounded-[18px] transition-all active:scale-95"
                          style={{ backgroundColor: actionBg, border: actionBorder }}
                        >
                          <Share2 className="w-[24px] h-[24px]" strokeWidth={2.2} style={{ color: iconColor }} />
                          <span className="text-[10px] font-bold" style={{ color: iconColor }}>Share</span>
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ═══ HIGHLIGHT VIEW (separate full palette) ═══════════════ */}
              {view === 'highlight' && (
                <motion.div
                  key="highlight-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 pt-3 pb-6 flex flex-col flex-1 min-h-0 overflow-y-auto"
                >
                  {/* Header */}
                  <div
                    className="flex items-center mb-4"
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
                      <h4 className="text-[17px] font-semibold tracking-tight" style={{ color: labelText, letterSpacing: '-0.02em' }}>
                        Highlight
                      </h4>
                      <p className="text-[12px] mt-0.5" style={{ color: subText, lineHeight: 1 }}>
                        {formattedVerses}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 py-2">
                    {ALL_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleColorTap(c.id, 0, 1)}
                        title={c.label}
                        className="relative active:scale-90 transition-transform"
                        style={{ width: 36, height: 36 }}
                      >
                        {selectedColor === c.id && existingHighlightColor && (
                          <span
                            className="absolute rounded-full"
                            style={{ inset: -3, border: `2px solid ${c.color}`, borderRadius: '50%' }}
                          />
                        )}
                        <span className="absolute inset-0 rounded-full" style={{ backgroundColor: c.color }} />
                      </button>
                    ))}
                    {existingHighlightColor && (
                      <button
                        onClick={() => { onHighlight('none'); onClose(); }}
                        className="w-9 h-9 rounded-full flex items-center justify-center border active:scale-90 transition-transform"
                        style={{ borderColor: inputBorder, backgroundColor: chipBg, color: subText }}
                        title="Remove highlight"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
                        className="flex-1 focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 transition-all"
                        style={{
                          height: 38,
                          borderRadius: 12,
                          padding: '0 12px',
                          fontSize: 13,
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
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: sectionTxt }}>
                        Saved Labels
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
                                className="flex items-center gap-1.5 transition-all active:scale-95"
                                style={{
                                  height: 28,
                                  borderRadius: 999,
                                  padding: '0 10px',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  backgroundColor: isSelected ? 'rgba(49,196,190,0.16)' : chipBg,
                                  border: isSelected ? '1px solid rgba(49,196,190,0.28)' : chipBorder,
                                  color: isSelected ? '#31C4BE' : labelText,
                                }}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                <span>{label}</span>
                                {isSelected && <MinusCircle className="w-3 h-3 shrink-0 ml-auto" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* ── Suggestions section ──────────────────────────── */}
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: sectionTxt }}>
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
                              className="flex items-center gap-1.5 transition-all active:scale-95"
                              style={{
                                height: 28,
                                borderRadius: 999,
                                  padding: '0 10px',
                                  fontSize: 11,
                                  fontWeight: 500,
                                  backgroundColor: isSelected ? 'rgba(49,196,190,0.16)' : chipBg,
                                  border: isSelected ? '1px solid rgba(49,196,190,0.28)' : chipBorder,
                                  color: isSelected ? '#31C4BE' : labelText,
                              }}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                              <span>{label}</span>
                              {isSelected && <MinusCircle className="w-3 h-3 shrink-0 ml-auto" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Private toggle ───────────────────────────────── */}
                    <div
                      className="flex items-center gap-2 py-2 px-3 mb-3 rounded-[12px]"
                      style={{ backgroundColor: actionBg, border: actionBorder }}
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: subText }} />
                      <span className="flex-1 text-[12px] font-medium" style={{ color: labelText }}>
                        Private Save
                      </span>
                      <IOSToggle checked={isPrivate} onChange={setIsPrivate} isDark={dm} selectedTheme={selectedTheme} />
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
                  className="flex flex-col flex-1 min-h-0 px-4 pb-5"
                  style={{ height: '100%' }}
                >
                  {/* Header */}
                  <div
                    className="flex items-center pt-3 mb-4 shrink-0"
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
                  </div>

                  <textarea
                    autoFocus
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Write your thoughts here…"
                    className="w-full flex-1 min-h-0 rounded-[12px] p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 resize-none mb-3 overflow-y-auto"
                    style={{
                      backgroundColor: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: inputText,
                    }}
                  />
                  <button
                    onClick={() => { onNote(noteInput); onClose(); }}
                    className="w-full font-semibold active:scale-[0.98] transition-all"
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
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
