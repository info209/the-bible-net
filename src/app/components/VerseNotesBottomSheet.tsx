'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import {
  X, ChevronLeft, Plus, Edit2, Trash2, Share2, Copy, FileText, Check, Clock
} from 'lucide-react';
import { RelativeTimestamp } from '@/components/RelativeTimestamp';
import { LabelTag } from '@/components/ui/LabelTag';
import { findCanonicalBookOrder, findCanonicalBookName } from '@/utils/bibleBooks';
import { toast } from '@/context/ToastContext';

const MAX_LABEL_LENGTH = 40;
const SUGGESTED_LABELS = ['Hope', 'Faith', 'Prayer', 'Wisdom', 'Joy', 'Grace', 'Peace', 'Love'];

export interface NoteItem {
  _id?: string;
  refId?: string;
  noteText?: string;
  labels?: string[];
  verses?: Array<{
    bookId?: string;
    bookName?: string;
    chapter?: number;
    verses?: number[];
    verseText?: string;
  }>;
  metadata?: {
    bookId?: string;
    bookName?: string;
    chapter?: number;
    verses?: number[];
    verse?: number;
    versionId?: string;
    versionName?: string;
    content?: string;
    labels?: string[];
  };
  version?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface VerseNotesBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookName: string;
  bookId?: string;
  chapter: number;
  verseNumber: number;
  notes: NoteItem[];
  onSaveNote: (payload: {
    noteId?: string;
    refId?: string;
    verses: number[];
    noteText: string;
    labels: string[];
    bookId?: string;
    bookName?: string;
    chapter?: number;
    version?: string;
  }) => Promise<void> | void;
  onDeleteNote: (noteId: string, refId?: string, verses?: number[]) => Promise<void> | void;
  userLabels?: string[];
  onAddUserLabel?: (label: string) => Promise<void>;
  selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
  isDark?: boolean;
  isLoggedIn?: boolean;
  version?: string;
}

function formatVersesHeader(bookName: string, chapter: number, verses: number[]): string {
  if (!verses || !verses.length) return `${bookName} ${chapter}`;
  const sorted = [...verses].sort((a, b) => a - b);
  if (sorted.length === 1) return `${bookName} ${chapter}:${sorted[0]}`;
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const isContinuous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1);
  if (isContinuous) {
    return `${bookName} ${chapter}:${start}–${end}`;
  }
  return `${bookName} ${chapter}:${sorted.join(', ')}`;
}

export default function VerseNotesBottomSheet({
  isOpen,
  onClose,
  bookName,
  bookId,
  chapter,
  verseNumber,
  notes = [],
  onSaveNote,
  onDeleteNote,
  userLabels = [],
  onAddUserLabel,
  selectedTheme,
  isDark = false,
  isLoggedIn = true,
  version = 'NKJV',
}: VerseNotesBottomSheetProps) {
  const dragControls = useDragControls();
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);

  // Editor states
  const [editorText, setEditorText] = useState('');
  const [editorLabels, setEditorLabels] = useState<string[]>([]);
  const [editorVerses, setEditorVerses] = useState<number[]>([verseNumber]);
  const [labelInput, setLabelInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const labelInputRef = useRef<HTMLInputElement>(null);

  // Theme tokens matching VerseActionMenu
  const theme = selectedTheme || (isDark ? 'dark' : 'light');
  const dm = theme === 'dark';

  const sheetBg = {
    light: '#FFFFFF',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#1c1c1e',
  }[theme];

  const dragBg = {
    light: 'rgba(0,0,0,0.14)',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: 'rgba(255,255,255,0.18)',
  }[theme];

  const labelText = {
    light: '#1C1C1E',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#F5F5F7',
  }[theme];

  const subText = {
    light: '#8E8E93',
    sepia: '#7d6855',
    cream: '#6e5f46',
    dark: '#8E8E93',
  }[theme];

  const cardBg = {
    light: '#F9FAFB',
    sepia: 'rgba(237, 227, 225, 0.6)',
    cream: 'rgba(245, 232, 213, 0.6)',
    dark: '#2C2C2E',
  }[theme];

  const cardBorder = {
    light: '1px solid #E5E7EB',
    sepia: '1px solid rgba(92, 74, 58, 0.15)',
    cream: '1px solid rgba(74, 63, 42, 0.15)',
    dark: '1px solid rgba(255, 255, 255, 0.08)',
  }[theme];

  const inputBg = {
    light: '#F9FAFB',
    sepia: '#F7EFED',
    cream: '#FEF6EB',
    dark: '#111111',
  }[theme];

  const inputBorder = {
    light: '#E5E7EB',
    sepia: 'rgba(92, 74, 58, 0.15)',
    cream: 'rgba(74, 63, 42, 0.15)',
    dark: '#2C2C2E',
  }[theme];

  const inputText = {
    light: '#1C1C1E',
    sepia: '#5c4a3a',
    cream: '#4a3f2a',
    dark: '#F5F5F7',
  }[theme];

  const headerBorder = {
    light: '1px solid rgba(0,0,0,0.06)',
    sepia: '1px solid rgba(92, 74, 58, 0.12)',
    cream: '1px solid rgba(74, 63, 42, 0.12)',
    dark: '1px solid rgba(255,255,255,0.08)',
  }[theme];

  const chipBg = {
    light: '#F3F4F6',
    sepia: '#EDE3E1',
    cream: '#F5E8D5',
    dark: '#111111',
  }[theme];

  const chipBorder = {
    light: '1px solid #E5E7EB',
    sepia: '1px solid rgba(92, 74, 58, 0.15)',
    cream: '1px solid rgba(74, 63, 42, 0.15)',
    dark: '1px solid rgba(255,255,255,0.18)',
  }[theme];

  const sectionTxt = {
    light: '#9CA3AF',
    sepia: '#927d6c',
    cream: '#83745c',
    dark: '#636366',
  }[theme];

  // Resolve matching notes for this specific verse using canonical book matching
  const currentCanonicalOrder = useMemo(() => {
    return findCanonicalBookOrder(bookName || bookId);
  }, [bookName, bookId]);

  const verseMatchingNotes = useMemo(() => {
    if (!notes || !notes.length) return [];

    return notes.filter((n) => {
      // 1. Resolve note's book order
      const noteBookIdent =
        n.metadata?.bookId ||
        n.metadata?.bookName ||
        n.verses?.[0]?.bookId ||
        n.verses?.[0]?.bookName ||
        (n as any).bookId ||
        (n as any).bookName;

      const noteBookOrder = findCanonicalBookOrder(noteBookIdent);
      if (currentCanonicalOrder !== null && noteBookOrder !== null) {
        if (currentCanonicalOrder !== noteBookOrder) return false;
      }

      // 2. Check chapter
      const noteChapter =
        n.metadata?.chapter ??
        n.verses?.[0]?.chapter ??
        (n as any).chapter;

      if (typeof noteChapter === 'number' && noteChapter !== chapter) {
        return false;
      }

      // 3. Check verse / verses range
      const vList: number[] =
        n.metadata?.verses ??
        n.verses?.[0]?.verses ??
        (typeof n.metadata?.verse === 'number' ? [n.metadata.verse] : []);

      return vList.includes(verseNumber);
    });
  }, [notes, currentCanonicalOrder, chapter, verseNumber]);

  // Reset sheet mode on open or verse change
  useEffect(() => {
    if (isOpen) {
      setMode('list');
      setEditingNote(null);
      setEditorText('');
      setEditorLabels([]);
      setEditorVerses([verseNumber]);
      setLabelInput('');
      setIsSaving(false);
      setDeletingId(null);
    }
  }, [isOpen, verseNumber]);

  // If list is empty and user opened the sheet, default to editor mode smoothly
  useEffect(() => {
    if (isOpen && verseMatchingNotes.length === 0 && mode === 'list') {
      handleOpenCreate();
    }
  }, [isOpen, verseMatchingNotes.length]);

  // Handle opening editor for an existing note
  const handleOpenEdit = (note: NoteItem) => {
    setEditingNote(note);
    const text = note.noteText || note.metadata?.content || '';
    const labels = note.labels || note.metadata?.labels || [];
    const vList =
      note.metadata?.verses ||
      note.verses?.[0]?.verses ||
      (typeof note.metadata?.verse === 'number' ? [note.metadata.verse] : [verseNumber]);

    setEditorText(text);
    setEditorLabels(labels);
    setEditorVerses(vList);
    setMode('edit');
  };

  // Handle opening editor to create a new note
  const handleOpenCreate = () => {
    setEditingNote(null);
    setEditorText('');
    setEditorLabels([]);
    setEditorVerses([verseNumber]);
    setMode('edit');
  };

  // Handle Label management in editor
  const allUserLabels = userLabels.filter(
    (l) => !SUGGESTED_LABELS.some((s) => s.toLowerCase() === l.toLowerCase())
  );

  const toggleLabel = useCallback((label: string) => {
    setEditorLabels((prev) =>
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
    if (!editorLabels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setEditorLabels((prev) => [...prev, trimmed]);
    }
    setLabelInput('');
  };

  // Handle Save Note
  const handleCommitSave = async () => {
    if (!editorText.trim()) {
      toast.error('Note text cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveNote({
        noteId: editingNote?._id,
        refId: editingNote?.refId,
        verses: editorVerses,
        noteText: editorText.trim(),
        labels: editorLabels,
        bookId,
        bookName,
        chapter,
        version: editingNote?.version || version,
      });

      toast.success(editingNote ? 'Note updated' : 'Note saved');
      setMode('list');
      setEditingNote(null);
    } catch (err: any) {
      console.error('[VerseNotesBottomSheet] save error:', err);
      toast.error(err?.message || 'Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Note
  const handleCommitDelete = async (note: NoteItem) => {
    const id = note._id;
    if (!id) return;

    setDeletingId(id);
    try {
      const vList =
        note.metadata?.verses ||
        note.verses?.[0]?.verses ||
        (typeof note.metadata?.verse === 'number' ? [note.metadata.verse] : [verseNumber]);

      await onDeleteNote(id, note.refId, vList);
      toast.success('Note deleted');

      // If no notes remain after deletion, close or switch to list
      if (verseMatchingNotes.length <= 1) {
        onClose();
      }
    } catch (err: any) {
      console.error('[VerseNotesBottomSheet] delete error:', err);
      toast.error('Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Share Note
  const handleShareNote = async (note: NoteItem) => {
    const text = note.noteText || note.metadata?.content || '';
    const vList =
      note.metadata?.verses ||
      note.verses?.[0]?.verses ||
      (typeof note.metadata?.verse === 'number' ? [note.metadata.verse] : [verseNumber]);
    const refStr = formatVersesHeader(bookName, chapter, vList);

    const shareContent = `${refStr}\n\n"${text}"\n\n— The Bible App`;
    if (navigator.share) {
      try {
        await navigator.share({ title: refStr, text: shareContent });
      } catch (_) {}
    } else {
      try {
        await navigator.clipboard.writeText(shareContent);
        toast.success('Note copied to clipboard');
      } catch (_) {
        toast.error('Could not copy to clipboard');
      }
    }
  };

  // Handle Copy Note text
  const handleCopyNote = async (note: NoteItem) => {
    const text = note.noteText || note.metadata?.content || '';
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Note copied');
    } catch (_) {
      toast.error('Failed to copy');
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80 && info.velocity.y > 0) onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[1115]"
            style={{
              backgroundColor: dm ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(3px)',
            }}
          />

          {/* Bottom Sheet */}
          <motion.div
            key="notes-sheet"
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
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] z-[1120] overflow-hidden flex flex-col"
            style={{
              backgroundColor: sheetBg,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.22)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
              maxHeight: '85vh',
            }}
            data-bottom-sheet="true"
          >
            {/* Drag Handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              style={{ touchAction: 'none' }}
              className="flex items-center justify-center pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing shrink-0"
            >
              <div className="w-9 h-1 rounded-full" style={{ backgroundColor: dragBg }} />
            </div>

            {/* ═══ LIST VIEW ════════════════════════════════════════════ */}
            {mode === 'list' && (
              <motion.div
                key="list-mode"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0"
                  style={{ borderBottom: headerBorder }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="size-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: dm ? '#0B7A8130' : '#E6F4F5' }}
                    >
                      <FileText className="size-4 text-[#0B7A81] dark:text-[#14B8A6]" />
                    </div>
                    <div>
                      <h3
                        className="font-bold text-base leading-tight"
                        style={{ color: labelText }}
                      >
                        {formatVersesHeader(bookName, chapter, [verseNumber])}
                      </h3>
                      <p className="text-[11px] font-medium mt-0.5" style={{ color: subText }}>
                        {verseMatchingNotes.length}{' '}
                        {verseMatchingNotes.length === 1 ? 'Personal Note' : 'Personal Notes'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleOpenCreate}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-all"
                      style={{
                        backgroundColor: '#31C4BE',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(49,196,190,0.25)',
                      }}
                      aria-label="Add new note"
                    >
                      <Plus className="size-3.5" strokeWidth={2.5} />
                      <span>Add</span>
                    </button>

                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-xl active:scale-95 transition-colors ml-1"
                      style={{ color: subText }}
                      aria-label="Close"
                    >
                      <X className="size-5" />
                    </button>
                  </div>
                </div>

                {/* Notes List Content */}
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 space-y-3">
                  {verseMatchingNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                      <div
                        className="size-12 rounded-2xl flex items-center justify-center mb-3"
                        style={{ backgroundColor: cardBg }}
                      >
                        <FileText className="size-6 text-[#31C4BE]" />
                      </div>
                      <h4 className="text-sm font-semibold mb-1" style={{ color: labelText }}>
                        No notes yet for this verse
                      </h4>
                      <p className="text-xs max-w-xs mb-4" style={{ color: subText }}>
                        Capture reflections, study insights, or prayers attached to this Scripture.
                      </p>
                      <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#31C4BE] active:scale-95 transition-all shadow-md"
                      >
                        Create Note
                      </button>
                    </div>
                  ) : (
                    verseMatchingNotes.map((note, index) => {
                      const text = note.noteText || note.metadata?.content || '';
                      const labels = note.labels || note.metadata?.labels || [];
                      const vList =
                        note.metadata?.verses ||
                        note.verses?.[0]?.verses ||
                        (typeof note.metadata?.verse === 'number' ? [note.metadata.verse] : [verseNumber]);
                      const noteVer = note.version || note.metadata?.versionName || version;
                      const date = note.updatedAt || note.createdAt;
                      const isRange = vList.length > 1;

                      return (
                        <div
                          key={note._id || index}
                          className="rounded-2xl p-4 transition-all"
                          style={{
                            backgroundColor: cardBg,
                            border: cardBorder,
                          }}
                        >
                          {/* Note Header / Meta */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="text-xs font-bold"
                                style={{ color: labelText }}
                              >
                                {formatVersesHeader(bookName, chapter, vList)}
                              </span>
                              {isRange && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: dm ? 'rgba(49,196,190,0.2)' : '#E6F4F5',
                                    color: '#0B7A81',
                                  }}
                                >
                                  Range
                                </span>
                              )}
                              {noteVer && (
                                <span
                                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                                  style={{
                                    backgroundColor: dm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                                    color: subText,
                                  }}
                                >
                                  {noteVer}
                                </span>
                              )}
                            </div>

                            {date && (
                              <div className="flex items-center gap-1 text-[11px] shrink-0" style={{ color: subText }}>
                                <Clock className="size-3" />
                                <RelativeTimestamp date={date} />
                              </div>
                            )}
                          </div>

                          {/* Note Text Content */}
                          <div
                            className="text-[13px] leading-relaxed whitespace-pre-wrap break-words mb-3"
                            style={{ color: inputText }}
                          >
                            {text}
                          </div>

                          {/* Labels Chips */}
                          {labels.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3 pt-1">
                              {labels.map((lbl: string) => (
                                <LabelTag key={lbl} label={lbl} size="sm" />
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div
                            className="flex items-center justify-end gap-1 pt-2.5"
                            style={{ borderTop: headerBorder }}
                          >
                            <button
                              onClick={() => handleCopyNote(note)}
                              className="p-1.5 rounded-lg active:scale-95 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: subText }}
                              title="Copy note text"
                              aria-label="Copy note"
                            >
                              <Copy className="size-4" />
                            </button>

                            <button
                              onClick={() => handleShareNote(note)}
                              className="p-1.5 rounded-lg active:scale-95 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: subText }}
                              title="Share note"
                              aria-label="Share note"
                            >
                              <Share2 className="size-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(note)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold active:scale-95 transition-colors hover:bg-black/5 dark:hover:bg-white/5 text-[#31C4BE]"
                              aria-label="Edit note"
                            >
                              <Edit2 className="size-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleCommitDelete(note)}
                              disabled={deletingId === note._id}
                              className="p-1.5 rounded-lg active:scale-95 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 disabled:opacity-50"
                              title="Delete note"
                              aria-label="Delete note"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* ═══ EDIT / CREATE VIEW ════════════════════════════════════ */}
            {mode === 'edit' && (
              <motion.div
                key="edit-mode"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col flex-1 min-h-0"
              >
                {/* Header */}
                <div
                  className="flex items-center px-4 pt-1 pb-3 shrink-0"
                  style={{ borderBottom: headerBorder }}
                >
                  <button
                    onClick={() => setMode('list')}
                    className="p-1.5 -ml-1 rounded-xl active:scale-95 transition-colors"
                    style={{ color: subText }}
                    aria-label="Back to notes list"
                  >
                    <ChevronLeft className="size-5" />
                  </button>

                  <div className="flex-1 text-center -ml-4">
                    <h4
                      className="font-semibold text-base"
                      style={{ color: labelText }}
                    >
                      {editingNote ? 'Edit Note' : 'New Note'}
                    </h4>
                    <p className="text-[11px] font-medium" style={{ color: subText }}>
                      {formatVersesHeader(bookName, chapter, editorVerses)}
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-xl active:scale-95 transition-colors"
                    style={{ color: subText }}
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Scrollable Editor Body */}
                <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
                  {/* Note Text Input */}
                  <textarea
                    autoFocus
                    value={editorText}
                    onChange={(e) => setEditorText(e.target.value)}
                    placeholder="Write your thoughts, reflections, or study insights here…"
                    className="w-full rounded-2xl p-3.5 text-[14px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/50 resize-none transition-all mb-4"
                    style={{
                      height: 140,
                      backgroundColor: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: inputText,
                    }}
                  />

                  {/* Label Input Form */}
                  <form onSubmit={handleAddLabel} className="flex gap-2 mb-3 shrink-0">
                    <input
                      ref={labelInputRef}
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      maxLength={MAX_LABEL_LENGTH}
                      placeholder="Add tag / label..."
                      aria-label="New label name"
                      className="flex-1 focus:outline-none focus:ring-2 focus:ring-[#31C4BE]/40 rounded-xl px-3 text-xs transition-all"
                      style={{
                        height: 36,
                        backgroundColor: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: inputText,
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!labelInput.trim()}
                      aria-label="Add label"
                      className="flex items-center justify-center shrink-0 active:scale-95 transition-all disabled:opacity-40 size-9 rounded-xl text-white bg-[#31C4BE] shadow-sm"
                    >
                      <Plus className="size-4" strokeWidth={2.5} />
                    </button>
                  </form>

                  {/* Selected Labels */}
                  {editorLabels.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: sectionTxt }}>
                        Selected Tags
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {editorLabels.map((label) => (
                          <LabelTag
                            key={label}
                            label={label}
                            size="sm"
                            onRemove={() => toggleLabel(label)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User's Saved Labels */}
                  {allUserLabels.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: sectionTxt }}>
                        My Labels
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {allUserLabels.map((label) => {
                          const isSelected = editorLabels.includes(label);
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => toggleLabel(label)}
                              className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                              style={{
                                backgroundColor: isSelected ? (dm ? 'rgba(11,122,129,0.3)' : '#E6F4F5') : chipBg,
                                border: isSelected ? '1px solid #31C4BE' : chipBorder,
                                color: isSelected ? (dm ? '#14B8A6' : '#0B7A81') : labelText,
                              }}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Labels */}
                  <div className="mb-2">
                    <p className="text-[10px] font-semibold tracking-wider uppercase mb-1.5" style={{ color: sectionTxt }}>
                      Suggestions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_LABELS.map((label) => {
                        const isSelected = editorLabels.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleLabel(label)}
                            className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all active:scale-95"
                            style={{
                              backgroundColor: isSelected ? (dm ? 'rgba(11,122,129,0.3)' : '#E6F4F5') : chipBg,
                              border: isSelected ? '1px solid #31C4BE' : chipBorder,
                              color: isSelected ? (dm ? '#14B8A6' : '#0B7A81') : labelText,
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div
                  className="px-4 pt-3 pb-2 shrink-0 flex items-center gap-2"
                  style={{ borderTop: headerBorder }}
                >
                  <button
                    type="button"
                    onClick={() => setMode('list')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98"
                    style={{
                      backgroundColor: chipBg,
                      color: labelText,
                      border: chipBorder,
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitSave}
                    disabled={isSaving || !editorText.trim()}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#31C4BE] shadow-md active:scale-98 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <span>Saving…</span>
                    ) : (
                      <>
                        <Check className="size-3.5" strokeWidth={2.5} />
                        <span>{editingNote ? 'Update Note' : 'Save Note'}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
