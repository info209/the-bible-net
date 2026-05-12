import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookmarkPlus, FileText, Plus, X, ChevronLeft,
    Check, List, Type, Trash2, PenTool
} from 'lucide-react';

interface VerseActionMenuProps {
    isOpen: boolean;
    bookName: string;
    chapter: number;
    selectedVerses: number[];
    onClose: () => void;
    onHighlight: (color: string) => void | Promise<void>;
    onSave: (labels: string[]) => void | Promise<void>;
    onNote: (note: string) => void | Promise<void>;
    onShare: () => void;
    /** Currently applied highlight color id for the selected verses (if any) */
    existingHighlightColor?: string | null;
}

// Primary 5 colors shown initially
const PRIMARY_COLORS = [
    { id: 'yellow', color: '#FFD234', label: 'Yellow' },
    { id: 'green',  color: '#4CD964', label: 'Green'  },
    { id: 'blue',   color: '#34AADC', label: 'Blue'   },
    { id: 'pink',   color: '#FF6B9D', label: 'Pink'   },
    { id: 'purple', color: '#A66CFF', label: 'Purple' },
];

// All colors shown when expanded
const ALL_COLORS = [
    { id: 'yellow',  color: '#FFD234', label: 'Yellow'  },
    { id: 'green',   color: '#4CD964', label: 'Green'   },
    { id: 'blue',    color: '#34AADC', label: 'Blue'    },
    { id: 'pink',    color: '#FF6B9D', label: 'Pink'    },
    { id: 'purple',  color: '#A66CFF', label: 'Purple'  },
    { id: 'orange',  color: '#FF9500', label: 'Orange'  },
    { id: 'red',     color: '#FF3B30', label: 'Red'     },
    { id: 'teal',    color: '#5AC8FA', label: 'Teal'    },
    { id: 'lime',    color: '#A4D65E', label: 'Lime'    },
    { id: 'rose',    color: '#FF2D55', label: 'Rose'    },
];

const SUGGESTED_LABELS = ['Joy', 'Love', 'Pride', 'Faith', 'Hope', 'Peace'];

export default function VerseActionMenu({
    isOpen,
    bookName,
    chapter,
    selectedVerses,
    onClose,
    onHighlight,
    onSave,
    onNote,
    onShare,
    existingHighlightColor = null,
}: VerseActionMenuProps) {
    const [view, setView] = useState<'main' | 'save' | 'note'>('main');
    const [highlightMode, setHighlightMode] = useState(false);
    const [paletteExpanded, setPaletteExpanded] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>('yellow');
    const [noteInput, setNoteInput] = useState('');

    // Save State
    const [labelInput, setLabelInput] = useState('');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [savedLabels, setSavedLabels] = useState<string[]>(['Morning Devotion', 'Favorite']);

    // Auto-open highlight mode if verse already has a highlight
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
    }, [existingHighlightColor, isOpen]);

    if (!isOpen) return null;

    // Format verse range: "Genesis 1:2–5"
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
                ranges.push(start === end ? `${start}` : `${start}–${end}`);
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
        if (trimmed && !selectedLabels.includes(trimmed)) {
            setSelectedLabels(prev => [...prev, trimmed]);
            if (!savedLabels.includes(trimmed)) setSavedLabels(prev => [...prev, trimmed]);
        }
        setLabelInput('');
    };

    const handleCommitSave = () => {
        onSave(selectedLabels);
        setView('main');
    };

    const handleColorSelect = (colorId: string) => {
        setSelectedColor(colorId);
    };

    // Tap the last visible color → expand palette
    const handleColorTap = (colorId: string, index: number, total: number) => {
        const isLast = index === total - 1;
        if (isLast && !paletteExpanded) {
            setPaletteExpanded(true);
        } else {
            handleColorSelect(colorId);
        }
    };

    const handleApplyHighlight = () => {
        onHighlight(selectedColor);
        onClose();
    };

    const handleRemoveHighlight = () => {
        onHighlight('none');
        onClose();
    };

    const handleToggleHighlightMode = () => {
        setHighlightMode(prev => {
            if (prev) {
                setPaletteExpanded(false);
            }
            return !prev;
        });
    };

    const displayColors = paletteExpanded ? ALL_COLORS : PRIMARY_COLORS;

    return (
        <>
            {/* ── Backdrop — tap outside to close ── */}
            <div
                className="fixed inset-0 z-[1109]"
                onClick={onClose}
                aria-label="Close verse menu"
            />

            {/* ── Bottom Sheet ── */}
            <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ type: 'spring', damping: 32, stiffness: 280 }}
                className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-[calc(100%-20px)] max-w-[430px] bg-white rounded-[18px] shadow-[0_4px_24px_rgba(0,0,0,0.10)] z-[1110]"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Drag Handle ── */}
                <div className="flex items-center justify-center pt-2.5 pb-0">
                    <div className="w-8 h-[3px] bg-gray-200 rounded-full" />
                </div>

                <AnimatePresence mode="wait">
                    {/* ── MAIN VIEW ── */}
                    {view === 'main' && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="px-4 pt-2 pb-3"
                        >
                            {/* Verse Reference */}
                            <p className="text-center text-[11px] text-gray-400 font-normal mb-2.5 tracking-wide">
                                Selected:{' '}
                                <span className="text-gray-600 font-medium">{formattedVerses()}</span>
                            </p>

                            {/* ── Inline Color Palette (visible when highlight mode is on) ── */}
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
                                            {/* Trash — only when editing existing highlight */}
                                            {existingHighlightColor && (
                                                <button
                                                    onClick={handleRemoveHighlight}
                                                    className="w-7 h-7 mr-2 rounded-full flex items-center justify-center bg-red-50 border border-red-200 shrink-0 active:scale-90 transition-transform"
                                                    title="Remove highlight"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            )}

                                            {/* Color dots row */}
                                            <div className="flex items-center gap-2.5 flex-1 flex-wrap py-1">
                                                {displayColors.map((c, i) => {
                                                    const isSelected = selectedColor === c.id;
                                                    const isLastVisible = i === displayColors.length - 1;
                                                    return (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => handleColorTap(c.id, i, displayColors.length)}
                                                            title={c.label}
                                                            aria-label={`Select ${c.label} highlight`}
                                                            className="relative flex items-center justify-center active:scale-90 transition-transform shrink-0"
                                                            style={{ width: 26, height: 26 }}
                                                        >
                                                            {/* Selection ring */}
                                                            {isSelected && (
                                                                <span
                                                                    className="absolute rounded-full"
                                                                    style={{
                                                                        inset: -3,
                                                                        border: `2px solid ${c.color}`,
                                                                        borderRadius: '50%',
                                                                    }}
                                                                />
                                                            )}
                                                            {/* Color fill */}
                                                            <span
                                                                className="absolute inset-0 rounded-full"
                                                                style={{ backgroundColor: c.color }}
                                                            />
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Expand / Collapse toggle */}
                                            <button
                                                onClick={() => setPaletteExpanded(prev => !prev)}
                                                className="w-7 h-7 ml-1.5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 active:scale-90 transition-transform border border-gray-200"
                                                title={paletteExpanded ? 'Fewer colors' : 'More colors'}
                                            >
                                                <motion.span
                                                    animate={{ rotate: paletteExpanded ? 45 : 0 }}
                                                    transition={{ duration: 0.18 }}
                                                    className="flex items-center justify-center"
                                                >
                                                    <Plus className="w-3 h-3 text-gray-500" />
                                                </motion.span>
                                            </button>
                                        </div>

                                        {/* Apply button — compact */}
                                        <button
                                            onClick={handleApplyHighlight}
                                            className="w-full mb-2 py-2 rounded-xl bg-[#31C4BE] text-white text-[12.5px] font-semibold shadow-[0_2px_8px_rgba(49,196,190,0.30)] active:scale-[0.98] transition-all"
                                        >
                                            Apply Highlight
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── 4 Action Buttons in one row ── */}
                            <div className="flex items-center justify-between gap-2">
                                {/* Highlight */}
                                <button
                                    onClick={handleToggleHighlightMode}
                                    className={`flex flex-col items-center justify-center gap-1 py-2.5 flex-1 rounded-[14px] transition-all active:scale-95 ${
                                        highlightMode
                                            ? 'bg-[#31C4BE]/10 border border-[#31C4BE]/30'
                                            : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                                >
                                    <PenTool
                                        className="w-[19px] h-[19px]"
                                        style={{ color: highlightMode ? '#31C4BE' : '#31C4BE' }}
                                        strokeWidth={2}
                                    />
                                    <span className={`text-[10px] font-medium tracking-wide ${
                                        highlightMode ? 'text-[#31C4BE]' : 'text-gray-500'
                                    }`}>
                                        Highlight
                                    </span>
                                </button>

                                {/* Save */}
                                <button
                                    onClick={() => setView('save')}
                                    className="flex flex-col items-center justify-center gap-1 py-2.5 flex-1 rounded-[14px] bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    <BookmarkPlus className="w-[19px] h-[19px] text-[#31C4BE]" strokeWidth={2} />
                                    <span className="text-[10px] font-medium text-gray-500 tracking-wide">Save</span>
                                </button>

                                {/* Note */}
                                <button
                                    onClick={() => setView('note')}
                                    className="flex flex-col items-center justify-center gap-1 py-2.5 flex-1 rounded-[14px] bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    <FileText className="w-[19px] h-[19px] text-amber-500" strokeWidth={2} />
                                    <span className="text-[10px] font-medium text-gray-500 tracking-wide">Note</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── SAVE VIEW ── */}
                    {view === 'save' && (
                        <motion.div
                            key="save"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col px-4 pb-4 max-h-[75dvh]"
                        >
                            {/* Header */}
                            <div className="flex items-center mb-3 shrink-0">
                                <button onClick={() => setView('main')} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 transition-colors">
                                    <ChevronLeft className="size-5" />
                                </button>
                                <h4 className="flex-1 text-center text-[15px] font-bold text-gray-800 -ml-6">Save Verses</h4>
                            </div>
                            <p className="text-[12px] text-gray-400 text-center mb-3 shrink-0">Saving {formattedVerses()}</p>

                            {/* Label input */}
                            <form onSubmit={handleAddLabel} className="relative mb-3 shrink-0">
                                <input
                                    type="text"
                                    value={labelInput}
                                    onChange={(e) => setLabelInput(e.target.value)}
                                    placeholder="Enter label name..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 pr-12"
                                />
                                <button
                                    type="submit"
                                    disabled={!labelInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#31C4BE] hover:bg-[#31C4BE]/10 rounded-lg transition-colors disabled:opacity-40"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </form>

                            <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
                                {selectedLabels.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {selectedLabels.map(label => (
                                            <button key={label} onClick={() => toggleLabel(label)}
                                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#31C4BE] text-white flex items-center gap-1">
                                                <Check className="size-3" /> {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Suggested</p>
                                    <div className="flex flex-wrap gap-2">
                                        {SUGGESTED_LABELS.filter(l => !selectedLabels.includes(l)).map(label => (
                                            <button key={label} onClick={() => toggleLabel(label)}
                                                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {savedLabels.filter(l => !selectedLabels.includes(l) && !SUGGESTED_LABELS.includes(l)).length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Your Labels</p>
                                        <div className="flex flex-wrap gap-2">
                                            {savedLabels.filter(l => !selectedLabels.includes(l) && !SUGGESTED_LABELS.includes(l)).map(label => (
                                                <button key={label} onClick={() => toggleLabel(label)}
                                                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 shrink-0">
                                <button onClick={handleCommitSave}
                                    className="w-full py-3 bg-[#31C4BE] text-white rounded-xl text-sm font-bold shadow-[0_4px_14px_rgba(49,196,190,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Save Selection
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── NOTE VIEW ── */}
                    {view === 'note' && (
                        <motion.div
                            key="note"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.18 }}
                            className="flex flex-col px-4 pb-4"
                        >
                            {/* Header */}
                            <div className="flex items-center mb-3 shrink-0">
                                <button onClick={() => setView('main')} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 transition-colors">
                                    <ChevronLeft className="size-5" />
                                </button>
                                <h4 className="flex-1 text-center text-[15px] font-bold text-gray-800 -ml-6">Add Note</h4>
                            </div>
                            <p className="text-[12px] text-gray-400 text-center mb-3 shrink-0">For {formattedVerses()}</p>

                            {/* Toolbar */}
                            <div className="flex bg-gray-50 border border-gray-200 rounded-t-xl px-2 py-1.5 gap-1 shrink-0">
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"><Type className="size-4" /></button>
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors italic font-serif leading-none px-2.5">I</button>
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"><List className="size-4" /></button>
                            </div>
                            <textarea
                                autoFocus
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value)}
                                placeholder="Write your thoughts..."
                                className="w-full min-h-[110px] bg-gray-50 border-x border-b border-gray-200 rounded-b-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#31C4BE]/40 resize-none mb-3"
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
        </>
    );
}
