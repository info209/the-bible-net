import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookmarkPlus, Copy, Share2, Type, FileText, Check, List, BookOpen, PenTool, ChevronLeft, Plus, RotateCcw } from 'lucide-react';

interface VerseActionMenuProps {
    isOpen: boolean;
    bookName: string;
    chapter: number;
    selectedVerses: number[];
    onClose: () => void;
    onHighlight: (color: string) => void | Promise<void>;
    onSave: (labels: string[]) => void | Promise<void>;
    onNote: (note: string) => void | Promise<void>;
    onCompare: () => void;
    onShare: () => void;
}

const HIGHLIGHT_COLORS = [
    { id: 'yellow', color: '#ffde59' },
    { id: 'green', color: '#8cf97a' },
    { id: 'blue', color: '#5ce1e6' },
    { id: 'pink', color: '#ff7eb3' },
    { id: 'purple', color: '#cb6ce6' },
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
    onCompare,
    onShare
}: VerseActionMenuProps) {
    const [view, setView] = useState<'main' | 'save' | 'note'>('main');

    // Save State
    const [labelInput, setLabelInput] = useState('');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [savedLabels, setSavedLabels] = useState<string[]>(['Morning Devotion', 'Favorite']); // Mock for now

    if (!isOpen) return null;

    // Format verse range text: e.g., "1:2, 5-7"
    const formattedVerses = () => {
        if (selectedVerses.length === 0) return '';
        const sorted = [...selectedVerses].sort((a, b) => a - b);
        let ranges = [];
        let start = sorted[0];
        let end = start;

        for (let i = 1; i <= sorted.length; i++) {
            if (i < sorted.length && sorted[i] === end + 1) {
                end = sorted[i];
            } else {
                ranges.push(start === end ? `${start}` : `${start}-${end}`);
                if (i < sorted.length) {
                    start = sorted[i];
                    end = start;
                }
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
            if (!savedLabels.includes(trimmed)) {
                setSavedLabels(prev => [...prev, trimmed]);
            }
        }
        setLabelInput('');
    };

    const handleCommitSave = () => {
        onSave(selectedLabels);
        setView('main');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-lg bg-white rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-200/50 pb-safe z-[1110] overflow-hidden"
        >
            <div className="flex flex-col items-center pt-3 pb-5 px-5 relative">
                <div className="w-10 h-1 bg-gray-200/80 rounded-full mb-4 shrink-0" />

                <AnimatePresence mode="wait">
                    {view === 'main' && (
                        <motion.div
                            key="main"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="w-full flex flex-col items-center"
                        >
                            <p className="text-sm font-semibold text-gray-400 mb-6 uppercase tracking-[0.05em]">Selection <span className="text-slate-900 border-b-2 border-slate-900/10 ml-2">{formattedVerses()}</span></p>

                            <div className="w-full flex items-center justify-between gap-2 px-1">
                                {/* Highlight Controls */}
                                <div className="flex-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all shadow-sm group">
                                    <div className="flex gap-2 mb-2">
                                        {HIGHLIGHT_COLORS.slice(0, 4).map(color => (
                                            <button key={color.id} onClick={() => onHighlight(color.id)} className="w-6 h-6 rounded-full border border-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] transition-transform hover:scale-110 active:scale-90" style={{ backgroundColor: color.color }} title={`Highlight ${color.id}`} />
                                        ))}
                                        <button className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center transition-transform hover:scale-110 active:scale-90" onClick={() => onHighlight('none')} title="Clear highlight">
                                            <RotateCcw className="size-3 text-slate-500" />
                                        </button>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Highlight</span>
                                </div>

                                {/* Actions Group */}
                                <div className="flex gap-2">
                                    {/* Save */}
                                    <button onClick={() => setView('save')} className="flex flex-col items-center justify-center gap-2 w-16 h-16 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm text-slate-700 active:scale-95 group">
                                        <BookmarkPlus className="size-5 text-[var(--color-primary-teal)] group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Save</span>
                                    </button>

                                    {/* Note */}
                                    <button onClick={() => setView('note')} className="flex flex-col items-center justify-center gap-2 w-16 h-16 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 transition-all shadow-sm text-slate-700 active:scale-95 group">
                                        <FileText className="size-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Note</span>
                                    </button>

                                    {/* More Controls (Using ... logic) */}
                                    <div className="flex flex-col gap-1.5 h-16">
                                        <button onClick={onCompare} className="flex-1 flex items-center gap-2 px-3 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 shadow-sm active:scale-95 border-l-4 border-l-[var(--color-primary-teal)]" title="Compare Versions">
                                            <BookOpen className="size-4" />
                                            <span>Compare</span>
                                        </button>
                                        <button onClick={onShare} className="flex-1 flex items-center gap-2 px-3 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 shadow-sm active:scale-95 border-l-4 border-l-slate-800" title="Share">
                                            <Share2 className="size-4" />
                                            <span>Share</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {view === 'save' && (
                        <motion.div
                            key="save"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full flex-1 flex flex-col items-stretch max-h-full"
                        >
                            <div className="flex items-center mb-4 shrink-0">
                                <button onClick={() => setView('main')} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
                                    <ChevronLeft className="size-5" />
                                </button>
                                <h4 className="flex-1 text-center font-bold text-[#31393a] -ml-6">Save Verses</h4>
                            </div>

                            <p className="text-sm text-gray-500 text-center mb-4 shrink-0">Saving {formattedVerses()}</p>

                            <form onSubmit={handleAddLabel} className="relative mb-4 shrink-0">
                                <input
                                    type="text"
                                    value={labelInput}
                                    onChange={(e) => setLabelInput(e.target.value)}
                                    placeholder="Enter label name..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/40 pr-12"
                                />
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal)]/10 rounded-lg transition-colors" disabled={!labelInput.trim()}>
                                    <Plus className="size-5" />
                                </button>
                            </form>

                            <div className="flex-1 overflow-y-auto min-h-0 -mx-2 px-2">
                                <div className="space-y-4">
                                    {/* Selected Labels row */}
                                    {selectedLabels.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedLabels.map(label => (
                                                <button key={label} onClick={() => toggleLabel(label)} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--color-primary-teal)] text-white border border-[var(--color-primary-teal)] shadow-sm flex items-center gap-1">
                                                    <Check className="size-3" /> {label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Suggested Labels */}
                                    <div>
                                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Suggested</h5>
                                        <div className="flex flex-wrap gap-2">
                                            {SUGGESTED_LABELS.filter(l => !selectedLabels.includes(l)).map(label => (
                                                <button key={label} onClick={() => toggleLabel(label)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Saved Labels */}
                                    {savedLabels.filter(l => !selectedLabels.includes(l) && !SUGGESTED_LABELS.includes(l)).length > 0 && (
                                        <div>
                                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Labels</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {savedLabels.filter(l => !selectedLabels.includes(l) && !SUGGESTED_LABELS.includes(l)).map(label => (
                                                    <button key={label} onClick={() => toggleLabel(label)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4 mt-auto shrink-0">
                                <button onClick={handleCommitSave} className="w-full py-3.5 bg-[var(--color-primary-teal)] text-white rounded-xl font-bold shadow-lg shadow-[var(--color-primary-teal)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Save Selection
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {view === 'note' && (
                        <motion.div
                            key="note"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="w-full h-full flex flex-col"
                        >
                            <div className="flex items-center mb-4 shrink-0">
                                <button onClick={() => setView('main')} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 transition-colors">
                                    <ChevronLeft className="size-5" />
                                </button>
                                <h4 className="flex-1 text-center font-bold text-[#31393a] -ml-6">Add Note</h4>
                            </div>

                            <p className="text-sm text-gray-500 text-center mb-4 shrink-0">For {formattedVerses()}</p>

                            <div className="flex bg-gray-50 border border-gray-200 rounded-t-xl px-2 py-1.5 gap-1 shrink-0">
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"><Type className="size-4 font-bold" /></button>
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors italic font-serif leading-none px-2.5">I</button>
                                <button className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"><List className="size-4" /></button>
                            </div>
                            <textarea
                                autoFocus
                                placeholder="Write your thoughts..."
                                className="w-full flex-1 min-h-[120px] bg-gray-50 border-x border-b border-gray-200 rounded-b-xl p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-teal)]/40 resize-none mb-4"
                            />
                            <div className="shrink-0">
                                <button onClick={() => { onNote('Draft note content'); setView('main'); }} className="w-full py-3.5 bg-[var(--color-primary-teal)] text-white rounded-xl font-bold shadow-lg shadow-[var(--color-primary-teal)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    Save Note
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
