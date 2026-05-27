import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  BookmarkPlus, FileText, Plus, X, ChevronLeft,
  Check, List, Type, PenTool, ArrowRightLeft, Share2, Bookmark
} from 'lucide-react';

// ─── localStorage helpers ───────────────────────────────────────────────────
const LABELS_STORAGE_KEY = 'bible-user-labels';
const MAX_LABEL_LENGTH = 40;

function loadStoredLabels(): string[] {
  try {
    const raw = localStorage.getItem(LABELS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((l): l is string => typeof l === 'string');
  } catch {/* ignore */}
  return [];
}

function storeLabels(labels: string[]): void {
  try {
    localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(labels));
  } catch {/* ignore */}
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface VerseActionMenuProps {
  isOpen: boolean;
  bookName: string;
  chapter: number;
  selectedVerses: number[];
  onClose: () => void;
  onHighlight: (color: string) => void | Promise<void>;
  onSave: (labels: string[]) => void | Promise<void>;
  onNote: (note: string) => void | Promise<void>;
  onCompare?: () => void;
  onShare?: () => void;
  existingHighlightColor?: string | null;
  /** Labels the verse is already saved under (for detecting saved state) */
  existingSaveLabels?: string[] | null;
  isLoggedIn?: boolean;
  isDark?: boolean;
}

// ─── Colour palettes ─────────────────────────────────────────────────────────
const PRIMARY_COLORS = [
  { id: 'yellow', color: '#FFD234', label: 'Yellow' },
  { id: 'green',  color: '#4CD964', label: 'Green' },
  { id: 'blue',   color: '#34AADC', label: 'Blue' },
  { id: 'pink',   color: '#FF6B9D', label: 'Pink' },
  { id: 'purple', color: '#A66CFF', label: 'Purple' },
];

const ALL_COLORS = [
  ...PRIMARY_COLORS,
  { id: 'orange', color: '#FF9500', label: 'Orange' },
  { id: 'red',    color: '#FF3B30', label: 'Red' },
  { id: 'teal',   color: '#5AC8FA', label: 'Teal' },
  { id: 'lime',   color: '#A4D65E', label: 'Lime' },
  { id: 'rose',   color: '#FF2D55', label: 'Rose' },
];

const SUGGESTED_LABELS = ['Joy', 'Love', 'Pride', 'Faith', 'Hope', 'Peace'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function VerseActionMenu({
  isOpen,
  bookName,
  chapter,
  selectedVerses,
  onClose,
  onHighlight,
  onSave,
  onNote,
  onCompare,
  onShare,
  existingHighlightColor = null,
  existingSaveLabels = null,
  isLoggedIn = false,
  isDark = false,
}: VerseActionMenuProps) {
  const [view, setView] = useState<'main' | 'save' | 'note'>('main');
  const [highlightMode, setHighlightMode] = useState(false);
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>('yellow');
  const [noteInput, setNoteInput] = useState('');

  const [labelInput, setLabelInput] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  // User-created labels — persisted in localStorage
  const [userLabels, setUserLabels] = useState<string[]>([]);

  // ── Determine whether this verse is already saved ───────────────────────
  const isSavedVerse = Array.isArray(existingSaveLabels) && existingSaveLabels.length > 0;

  // ── Load persisted labels on mount ─────────────────────────────────────
  useEffect(() => {
    setUserLabels(loadStoredLabels());
  }, []);

  // ── Reset form state whenever the overlay is opened ────────────────────
  useEffect(() => {
    if (existingHighlightColor) {
      setHighlightMode(true);
      setSelectedColor(existingHighlightColor);
    } else {
      setHighlightMode(false);
      setSelectedColor('yellow');
    }
    setPaletteExpanded(false);
    setView('main');
    // Pre-select labels that the verse is already saved under
    setSelectedLabels(existingSaveLabels ?? []);
    setLabelInput('');
  }, [existingHighlightColor, isOpen, existingSaveLabels]);

  if (!isOpen) return null;

  // ── Dark mode colour tokens ─────────────────────────────────────────────
  const dm = isDark;
  const sheetBg     = dm ? '#000000' : '#ffffff';
  const dragBg      = dm ? '#3a3a3c' : '#e5e5e5';
  const labelText   = dm ? '#ebebf5cc' : '#31393a';
  const subLabelTxt = dm ? '#8e8e93' : '#9ca3af';
  const pillBg      = dm ? '#2c2c2e' : '#f9fafb';
  const pillBorder  = dm ? '#3a3a3c' : '#e5e7eb';
  const pillHoverBg = dm ? '#3a3a3c' : '#f3f4f6';
  const inputBg     = dm ? '#2c2c2e' : '#f9fafb';
  const inputBorder = dm ? '#48484a' : '#e5e7eb';
  const inputText   = dm ? '#f5f5f7' : '#374151';
  const headerBorder= dm ? '#3a3a3c' : '#f3f4f6';
  const actionBg    = dm ? '#2c2c2e' : '#f9fafb';
  const actionHover = dm ? '#3a3a3c' : '#f3f4f6';
  const sectionTitle= dm ? '#636366' : '#9ca3af';
  const loginCardBg = dm ? '#2c2c2e' : '#f9fafb';
  const loginBorder = dm ? '#3a3a3c' : '#e5e7eb';
  const iconBg      = dm ? '#1c1c1e' : '#ffffff';

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formattedVerses = () => {
    if (selectedVerses.length === 0) return '';
    const sorted = [...selectedVerses].sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = sorted[0];
    let end = start;
    for (let i = 1; i <= sorted.length; i++) {
      if (i < sorted.length && sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        if (i < sorted.length) { start = sorted[i]; end = start; }
      }
    }
    return `${bookName} ${chapter}:${ranges.join(', ')}`;
  };

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = labelInput.trim();

    // Validation
    if (!trimmed) return;
    if (trimmed.length > MAX_LABEL_LENGTH) return;

    // Deduplicate case-insensitively
    const existsAlready = [...SUGGESTED_LABELS, ...userLabels].some(
      l => l.toLowerCase() === trimmed.toLowerCase()
    );

    const newUserLabels = existsAlready
      ? userLabels
      : [...userLabels, trimmed];

    if (!existsAlready) {
      setUserLabels(newUserLabels);
      storeLabels(newUserLabels); // ← persisted immediately
    }

    // Also select the new label
    if (!selectedLabels.some(l => l.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedLabels(prev => [...prev, trimmed]);
    }
    setLabelInput('');
  };

  const handleCommitSave = () => {
    onSave(selectedLabels);
    setView('main');
  };

  const handleColorTap = (colorId: string, index: number, total: number) => {
    const isLast = index === total - 1;
    if (isLast && !paletteExpanded) { setPaletteExpanded(true); return; }
    setSelectedColor(colorId);
    onHighlight(colorId);
    onClose();
  };

  const handleRemoveHighlight = () => { onHighlight('none'); onClose(); };
  const handleToggleHighlightMode = () => {
    setHighlightMode(prev => { if (prev) setPaletteExpanded(false); return !prev; });
  };

  const displayColors = paletteExpanded ? ALL_COLORS : PRIMARY_COLORS;

  // All labels visible in the "save" view — deduped and sorted
  const allAvailableLabels = useMemo(() => {
    const seen = new Set<string>(SUGGESTED_LABELS.map(l => l.toLowerCase()));
    const extras = userLabels.filter(l => !seen.has(l.toLowerCase()));
    return { suggested: SUGGESTED_LABELS, user: extras };
  }, [userLabels]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 60 }}
      transition={{ type: 'spring', damping: 32, stiffness: 280 }}
      className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[430px] rounded-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.18)] z-[1110]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: sheetBg,
        border: dm ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
      }}
      data-bottom-sheet="true"
    >
      {/* Drag handle */}
      <div className="flex items-center justify-center pt-2.5 pb-0">
        <div className="w-8 h-[3px] rounded-full" style={{ backgroundColor: dragBg }} />
      </div>

      <AnimatePresence mode="wait">
        {/* ═══ MAIN VIEW ═══════════════════════════════════════════════════ */}
        {view === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="px-4 pt-2 pb-3"
          >
            <p className="text-center text-[11px] font-normal mb-2.5 tracking-wide" style={{ color: subLabelTxt }}>
              Selected:{' '}
              <span className="font-medium" style={{ color: labelText }}>{formattedVerses()}</span>
            </p>

            {!isLoggedIn ? (
              <div
                className="rounded-[16px] p-4 border border-dashed"
                style={{ backgroundColor: loginCardBg, borderColor: loginBorder }}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm mb-3"
                    style={{ backgroundColor: iconBg }}
                  >
                    <BookmarkPlus className="w-5 h-5 text-[#31C4BE]" />
                  </div>
                  <h3 className="text-[14px] font-bold mb-1" style={{ color: labelText }}>Login to Save &amp; Highlight</h3>
                  <p className="text-[11px] mb-4 leading-relaxed" style={{ color: subLabelTxt }}>
                    Sign in to your account to highlight, save verses and take personal notes.
                  </p>
                  <div className="flex gap-2 w-full">
                    <Link
                      href="/auth/login"
                      className="flex-1 py-2.5 bg-[#31C4BE] text-white text-[12px] font-bold rounded-xl shadow-[0_2px_8px_rgba(49,196,190,0.25)] active:scale-95 transition-all text-center"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="flex-1 py-2.5 text-[12px] font-bold rounded-xl active:scale-95 transition-all text-center border"
                      style={{ backgroundColor: iconBg, color: labelText, borderColor: pillBorder }}
                    >
                      Register
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <AnimatePresence>
                  {highlightMode && (
                    <motion.div
                      key="palette"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center mb-2.5 px-0.5">
                        <div className="flex items-center gap-2.5 flex-1 flex-wrap py-1">
                          {displayColors.map((c, i) => {
                            const isSelected = selectedColor === c.id;
                            return (
                              <button
                                key={c.id}
                                onClick={() => handleColorTap(c.id, i, displayColors.length)}
                                title={c.label}
                                aria-label={`Select ${c.label} highlight`}
                                className="relative flex items-center justify-center active:scale-90 transition-transform shrink-0"
                                style={{ width: 26, height: 26 }}
                              >
                                {isSelected && (
                                  <span
                                    className="absolute rounded-full"
                                    style={{ inset: -3, border: `2px solid ${c.color}`, borderRadius: '50%' }}
                                  />
                                )}
                                <span className="absolute inset-0 rounded-full" style={{ backgroundColor: c.color }} />
                              </button>
                            );
                          })}
                          {existingHighlightColor && (
                            <button
                              onClick={handleRemoveHighlight}
                              className="w-[26px] h-[26px] rounded-full flex items-center justify-center active:scale-90 transition-transform border"
                              style={{ borderColor: pillBorder, backgroundColor: pillBg, color: subLabelTxt }}
                              title="Remove highlight"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => setPaletteExpanded(prev => !prev)}
                          className="w-7 h-7 ml-1.5 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform border"
                          style={{ backgroundColor: actionBg, borderColor: pillBorder, color: subLabelTxt }}
                          title={paletteExpanded ? 'Fewer colors' : 'More colors'}
                        >
                          <motion.span
                            animate={{ rotate: paletteExpanded ? 45 : 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </motion.span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={handleToggleHighlightMode}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[14px] transition-all active:scale-95"
                    style={{
                      backgroundColor: highlightMode ? 'rgba(49,196,190,0.1)' : actionBg,
                      border: highlightMode ? '1px solid rgba(49,196,190,0.3)' : 'none',
                    }}
                  >
                    <PenTool className="w-[19px] h-[19px] text-[#31C4BE]" strokeWidth={2} />
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: highlightMode ? '#31C4BE' : subLabelTxt }}>
                      Highlight
                    </span>
                  </button>

                  <button
                    onClick={() => setView('save')}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[14px] transition-all active:scale-95"
                    style={{ backgroundColor: isSavedVerse ? 'rgba(49,196,190,0.1)' : actionBg }}
                  >
                    {isSavedVerse
                      ? <Bookmark className="w-[19px] h-[19px] text-[#31C4BE] fill-current" strokeWidth={2} />
                      : <BookmarkPlus className="w-[19px] h-[19px] text-[#31C4BE]" strokeWidth={2} />
                    }
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: isSavedVerse ? '#31C4BE' : subLabelTxt }}>
                      {isSavedVerse ? 'Saved' : 'Save'}
                    </span>
                  </button>

                  <button
                    onClick={() => setView('note')}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[14px] transition-all active:scale-95"
                    style={{ backgroundColor: actionBg }}
                  >
                    <FileText className="w-[19px] h-[19px] text-amber-500" strokeWidth={2} />
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: subLabelTxt }}>Note</span>
                  </button>

                  <button
                    onClick={() => onCompare?.()}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[14px] transition-all active:scale-95"
                    style={{ backgroundColor: actionBg }}
                  >
                    <ArrowRightLeft className="w-[19px] h-[19px]" strokeWidth={2} style={{ color: subLabelTxt }} />
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: subLabelTxt }}>Compare</span>
                  </button>

                  <button
                    onClick={() => onShare?.()}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-[14px] transition-all active:scale-95"
                    style={{ backgroundColor: actionBg }}
                  >
                    <Share2 className="w-[19px] h-[19px]" strokeWidth={2} style={{ color: subLabelTxt }} />
                    <span className="text-[10px] font-medium tracking-wide" style={{ color: subLabelTxt }}>Share</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ═══ SAVE VIEW ═══════════════════════════════════════════════════ */}
        {view === 'save' && (
          <motion.div
            key="save"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col px-4 pb-4 max-h-[75dvh]"
          >
            {/* ── Header (Fix #3: tighter spacing) ────────────────────── */}
            <div className="flex items-center shrink-0 mb-1" style={{ borderBottom: `1px solid ${headerBorder}`, paddingBottom: '8px' }}>
              <button
                onClick={() => setView('main')}
                className="p-2 -ml-2 transition-colors"
                style={{ color: subLabelTxt }}
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex-1 text-center -ml-6">
                {/* Fix #4: Show "Saved Verse" if already saved, "Save Verse" if not */}
                <h4 className="text-[15px] font-bold" style={{ color: labelText }}>
                  {isSavedVerse ? 'Saved Verse' : 'Save Verse'}
                </h4>
                {/* Fix #3: Subtitle is now on same compact block, no extra margin */}
                <p className="text-[11px] mt-0.5" style={{ color: subLabelTxt }}>
                  {isSavedVerse ? 'Saved' : 'Saving'} {formattedVerses()}
                </p>
              </div>
            </div>

            {/* ── Label input ──────────────────────────────────────────── */}
            <form onSubmit={handleAddLabel} className="relative mb-3 mt-3 shrink-0">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                maxLength={MAX_LABEL_LENGTH}
                placeholder="Create new label..."
                className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 pr-12"
                style={{
                  backgroundColor: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: inputText,
                }}
              />
              <button
                type="submit"
                disabled={!labelInput.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#31C4BE] hover:bg-[#31C4BE]/10 rounded-lg transition-colors disabled:opacity-40"
              >
                <Plus className="size-4" />
              </button>
            </form>

            {/* ── Label lists ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
              {/* Selected (active) labels */}
              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedLabels.map(label => (
                    <button
                      key={label}
                      onClick={() => toggleLabel(label)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#31C4BE] text-white flex items-center gap-1"
                    >
                      <Check className="size-3" /> {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Suggested labels */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: sectionTitle }}>
                  Suggested
                </p>
                <div className="flex flex-wrap gap-2">
                  {allAvailableLabels.suggested
                    .filter(l => !selectedLabels.includes(l))
                    .map(label => (
                      <button
                        key={label}
                        onClick={() => toggleLabel(label)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                        style={{
                          backgroundColor: pillBg,
                          borderColor: pillBorder,
                          color: labelText,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                </div>
              </div>

              {/* User-created labels */}
              {allAvailableLabels.user.filter(l => !selectedLabels.includes(l)).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: sectionTitle }}>
                    Your Labels
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {allAvailableLabels.user
                      .filter(l => !selectedLabels.includes(l))
                      .map(label => (
                        <button
                          key={label}
                          onClick={() => toggleLabel(label)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                          style={{
                            backgroundColor: pillBg,
                            borderColor: pillBorder,
                            color: labelText,
                          }}
                        >
                          {label}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Save button ──────────────────────────────────────────── */}
            <div className="pt-3 shrink-0">
              <button
                onClick={handleCommitSave}
                className="w-full py-3 bg-[#31C4BE] text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_rgba(49,196,190,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {isSavedVerse ? 'Update Save' : 'Save Selection'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══ NOTE VIEW ═══════════════════════════════════════════════════ */}
        {view === 'note' && (
          <motion.div
            key="note"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col px-4 pb-4"
          >
            <div className="flex items-center mb-1 shrink-0" style={{ borderBottom: `1px solid ${headerBorder}`, paddingBottom: '8px' }}>
              <button
                onClick={() => setView('main')}
                className="p-2 -ml-2 transition-colors"
                style={{ color: subLabelTxt }}
              >
                <ChevronLeft className="size-5" />
              </button>
              <div className="flex-1 text-center -ml-6">
                <h4 className="text-[15px] font-bold" style={{ color: labelText }}>Add Note</h4>
                <p className="text-[11px] mt-0.5" style={{ color: subLabelTxt }}>For {formattedVerses()}</p>
              </div>
            </div>

            <div
              className="flex rounded-t-xl px-2 py-1.5 gap-1 shrink-0 mt-3 border-x border-t"
              style={{ backgroundColor: inputBg, borderColor: inputBorder }}
            >
              <button className="p-1.5 rounded-lg transition-colors" style={{ color: subLabelTxt }}>
                <Type className="size-4" />
              </button>
              <button className="p-1.5 rounded-lg transition-colors italic font-serif leading-none px-2.5" style={{ color: subLabelTxt }}>I</button>
              <button className="p-1.5 rounded-lg transition-colors" style={{ color: subLabelTxt }}>
                <List className="size-4" />
              </button>
            </div>

            <textarea
              autoFocus
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Write your thoughts..."
              className="w-full min-h-[110px] rounded-b-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#31C4BE]/40 resize-none mb-3 border-x border-b"
              style={{
                backgroundColor: inputBg,
                borderColor: inputBorder,
                color: inputText,
              }}
            />

            <button
              onClick={() => { onNote(noteInput); onClose(); }}
              className="w-full py-3 bg-[#31C4BE] text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_rgba(49,196,190,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              Save Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
