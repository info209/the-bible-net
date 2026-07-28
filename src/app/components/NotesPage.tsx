'use client';

import { RelativeTimestamp } from '@/components/RelativeTimestamp';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MoreVertical, Tag, MessageSquare, Plus, Check, X, FileText, Trash2, Edit2, Bookmark, BookOpen
} from 'lucide-react';
import LibraryPageHeader from './LibraryPageHeader';
import { toast } from '@/context/ToastContext';

type FilterTab = 'All' | 'Bible' | 'Reading plans';

const TABS: FilterTab[] = ['All', 'Bible', 'Reading plans'];

// Bible Books List for adding verses
const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

interface NotesPageProps {
  onBack?: () => void;
  onClose?: () => void;
}

export default function NotesPage({ onBack, onClose }: NotesPageProps = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Notes state
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  
  // Menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [selectedNoteForMenu, setSelectedNoteForMenu] = useState<any>(null);

  // Edit / Creation screen state
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteLabels, setNoteLabels] = useState<string[]>([]);
  const [noteVerses, setNoteVerses] = useState<any[]>([]);
  const [noteVersion, setNoteVersion] = useState('NKJV');

  // Verse Picker state
  const [versePickerOpen, setVersePickerOpen] = useState(false);
  const [pickerBook, setPickerBook] = useState('John');
  const [pickerChapter, setPickerChapter] = useState(2);
  const [pickerVerse, setPickerVerse] = useState(21);

  // Label Creator state
  const [labelInputOpen, setLabelInputOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

  // Toast state
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch Notes
  const fetchNotes = async () => {
    if (!session?.user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/notes');
      const json = await res.json();
      if (json.success) {
        setNotes(json.data);
      }
    } catch (e) {
      console.error('[NotesPage] fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Clear any data cached from a previous user session
      setNotes([]);
      setIsLoading(false);
      return;
    }
    if (status === 'authenticated' && session?.user?.id) {
      // Clear stale data before re-fetching for this user
      setNotes([]);
      fetchNotes();
    }
  }, [status, session?.user?.id]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const cachedVersion = localStorage.getItem('bible-reader-version-name');
    if (cachedVersion) {
      setNoteVersion(cachedVersion);
    }
  }, []);

  const showToast = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('error') || lower.includes('failed')) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const handleOpenMenu = (e: React.MouseEvent, note: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setSelectedNoteForMenu(note);
    setMenuOpenId(note._id);
  };

  // Notes Page Actions
  const handleOpenNewNote = () => {
    setEditingNoteId(null);
    setNoteText('');
    setNoteLabels([]);
    setNoteVerses([]);
    setNoteVersion('NKJV');
    setIsEditing(true);
  };

  const handleReadNote = (note: any) => {
    setMenuOpenId(null);
    const firstVerse = note.verses?.[0];
    if (!firstVerse) return;

    const book = firstVerse.bookId || 'GEN';
    const ch = firstVerse.chapter || 1;
    const version = note.version || 'NKJV';
    const verses = firstVerse.verses;
    const verseNum = Array.isArray(verses) && verses.length > 0 ? verses[0] : null;

    const query = new URLSearchParams({
      version,
      book,
      chapter: String(ch),
    });
    if (verseNum != null) {
      query.set('verse', String(verseNum));
    }

    router.push(`/bible?${query.toString()}`);
    if (onClose) onClose();
  };

  const handleOpenEditNote = (note: any) => {
    setEditingNoteId(note._id);
    setNoteText(note.noteText || '');
    setNoteLabels(note.labels || []);
    setNoteVerses(note.verses || []);
    setNoteVersion(note.version || 'NKJV');
    setIsEditing(true);
    setMenuOpenId(null);
  };

  const handleDeleteNote = async (id: string) => {
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setNotes(prev => prev.filter(n => n._id !== id));
        showToast('Note deleted successfully');
      } else {
        showToast('Failed to delete note');
      }
    } catch (e) {
      showToast('Error deleting note');
    }
  };

  // Add Verse inside edit screen
  const handleAddVerseToNote = async () => {
    setVersePickerOpen(false);
    const bookId = pickerBook.substring(0, 3).toUpperCase();
    
    const newVerseRef = {
      bookId,
      bookName: pickerBook,
      chapter: Number(pickerChapter),
      verses: [Number(pickerVerse)],
      verseText: 'Loading verse text...'
    };

    setNoteVerses([...noteVerses, newVerseRef]);

    try {
      const res = await fetch(`/api/saved-verses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          bookName: pickerBook,
          chapter: Number(pickerChapter),
          verses: [Number(pickerVerse)],
          version: noteVersion,
          labels: [],
          note: '',
          isPrivate: true
        })
      });
      const json = await res.json();
      
      const textRes = await fetch(`/api/saved-verses?bookId=${bookId}&chapter=${pickerChapter}&version=${noteVersion}`);
      const textJson = await textRes.json();
      if (textJson.success && textJson.data.length > 0) {
        const match = textJson.data.find((v: any) => v.verses.includes(Number(pickerVerse)));
        if (match) {
          setNoteVerses(prev => 
            prev.map(v => 
              v.bookName === pickerBook && v.chapter === pickerChapter && v.verses.includes(pickerVerse)
                ? { ...v, verseText: match.verseText }
                : v
            )
          );
        }
      }
    } catch (e) {
      setNoteVerses(prev => 
        prev.map(v => 
          v.bookName === pickerBook && v.chapter === pickerChapter && v.verses.includes(pickerVerse)
            ? { ...v, verseText: `John 2:21 - For he spake of the temple of his body.` }
            : v
        )
      );
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      showToast('Note text cannot be empty');
      return;
    }

    const payload = {
      noteText,
      labels: noteLabels,
      verses: noteVerses.map(v => ({
        bookId: v.bookId,
        bookName: v.bookName,
        chapter: v.chapter,
        verses: v.verses
      })),
      version: noteVersion
    };

    try {
      if (editingNoteId) {
        const res = await fetch(`/api/notes/${editingNoteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showToast('Note updated');
          fetchNotes();
          setIsEditing(false);
        } else {
          showToast('Failed to update note');
        }
      } else {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.success) {
          showToast('Note created');
          fetchNotes();
          setIsEditing(false);
        } else {
          showToast('Failed to create note');
        }
      }
    } catch (e) {
      showToast('Error saving note');
    }
  };

  const handleCreateLabel = () => {
    const text = newLabelText.trim();
    if (text && !noteLabels.includes(text)) {
      setNoteLabels([...noteLabels, text]);
      setNewLabelText('');
      setLabelInputOpen(false);
    }
  };

  const handleRemoveLabel = (label: string) => {
    setNoteLabels(noteLabels.filter(l => l !== label));
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const created = new Date(dateString).getTime();
      const now = new Date().getTime();
      const diff = now - created;
      
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch (e) {
      return '10m ago';
    }
  };

  const filteredNotes = useMemo(() => {
    if (activeTab === 'Bible') {
      return notes.filter(n => n.verses && n.verses.length > 0);
    }
    // if (activeTab === 'Journals') {
    //   return notes.filter(n => n.labels.includes('journal') || n.labels.includes('Journal'));
    // }
    if (activeTab === 'Reading plans') {
      return notes.filter(n => n.labels.includes('reading') || n.labels.includes('plan'));
    }
    return notes;
  }, [activeTab, notes]);

  /* ── Not Signed In ── */
  if (status === 'unauthenticated' || (status !== 'loading' && !session?.user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#F4F8F8] dark:bg-[#0D0D0D]">
        <div className="w-16 h-16 bg-[#0B7A81]/10 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-[#0B7A81]" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Sign in to see your notes</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">Write and persist notes on Bible verses dynamically.</p>
        <button
          onClick={() => router.push('/auth/signin')}
          className="px-6 py-2.5 bg-[#0B7A81] text-white rounded-full text-sm font-semibold shadow-md active:bg-[#095f64]"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D] pb-10">
      
      <AnimatePresence mode="wait">
        {!isEditing ? (
          /* ── LIST VIEW ── */
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <LibraryPageHeader title="Notes" onBack={() => onBack ? onBack() : router.back()} />

            {/* Filter Tabs */}
            <div className="flex px-4 gap-3 overflow-x-auto scrollbar-none pb-4 bg-[#F4F8F8] dark:bg-[#0D0D0D]">
              {TABS.map(tab => {
                const isSelected = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="h-8 px-4 rounded-[999px] text-[13px] font-[500] whitespace-nowrap shrink-0 transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected ? '#FFFFFF' : '#F1F2F3',
                      border: isSelected ? '1px solid #0B7A81' : 'none',
                      color: isSelected ? '#0B7A81' : '#6D6D6D',
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Notes List */}
            <main className="px-5 mt-3 max-w-2xl mx-auto space-y-5">
              {status === 'loading' || (isLoading && status === 'authenticated') ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(n => (
                    <div
                      key={n}
                      className="h-[180px] w-full rounded-2xl bg-white dark:bg-[#111111] border border-[#D7D7D7] dark:border-white/[0.04] animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#0B7A81]/10 flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-[#0B7A81]" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">No notes yet</h3>
                  <p className="text-xs text-gray-400 max-w-xs mt-1">
                    Long press a verse in the Bible reader to start writing.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {filteredNotes.map((note: any) => {
                    const firstVerse = note.verses?.[0];
                    const refStr = firstVerse 
                      ? `${firstVerse.bookName} ${firstVerse.chapter}:${firstVerse.verses.join(', ')}` 
                      : 'General Note';
                    const cardLabel = note.labels && note.labels.length > 0 ? note.labels.join(', ') : 'Joy';
                    
                    return (
                      <div
                        key={note._id}
                        className="w-full bg-white dark:bg-[#151515] border border-[#D7D7D7] dark:border-white/[0.08] rounded-[16px] p-4 flex flex-col relative transition-shadow hover:shadow-sm"
                      >
                        {/* Top Row Section */}
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[14px] font-[400] text-[#333333] dark:text-gray-300 leading-snug">
                              You have made a note on <span className="font-[700] text-[#111111] dark:text-white">{refStr}</span>
                            </p>
                            {/* Removed parenthesized version/Mongo ID */}
                            
                            {/* Label Row */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <Tag className="w-3.5 h-3.5 text-[#0B7A81]" />
                              <span className="text-[12px] font-[500] text-[#0B7A81]">
                                Label: {cardLabel}
                              </span>
                            </div>
                          </div>

                          {/* Timestamp & Ellipsis */}
                          <div className="flex items-center gap-2 select-none">
                            <div className="w-[8px] h-[8px] bg-[#0B7A81] rounded-full" />
                            <RelativeTimestamp
                              date={note.createdAt}
                              className="text-[10px] text-[#111111] dark:text-gray-400 font-[400]"
                            />
                            <button
                              onClick={(e) => handleOpenMenu(e, note)}
                              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-white/[0.04] transition-colors"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-[18px] h-[18px] text-[#111111] dark:text-white" />
                            </button>
                          </div>
                        </div>

                        {/* Note Content (Verse Text) */}
                        {firstVerse && (
                          <div className="mt-4">
                            <p className="text-[16px] font-[400] leading-[26px] text-[#222222] dark:text-gray-200">
                              {firstVerse.verseText || 'For he spake of the temple of his body.'}
                            </p>
                          </div>
                        )}

                        {/* Verse Reference Title */}
                        <div className="mt-3">
                          <span className="text-[20px] font-[500] text-[#0B7A81]">
                            {refStr}
                          </span>
                        </div>

                        {/* User's Note Preview Container */}
                        <div className="mt-3 bg-[#F5F5F5] dark:bg-[#202020] rounded-[10px] p-[12px]">
                          <p className="text-[12px] text-[#777777] dark:text-gray-400 font-[400]">
                            Encouragement
                          </p>
                          <p className="text-[16px] font-[500] text-[#222222] dark:text-white mt-1">
                            {note.noteText}
                          </p>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </motion.div>
        ) : (
          /* ── EDIT / CREATE SCREEN ── */
          <motion.div
            key="edit-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto px-4"
          >
            {/* Header */}
            <header className="py-4 flex items-center justify-between sticky top-0 bg-[#F4F8F8] dark:bg-[#0D0D0D] z-30">
              <button
                onClick={() => setIsEditing(false)}
                className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-gray-200/50 dark:active:bg-white/[0.06]"
              >
                <ArrowLeft className="w-5 h-5 text-[#111111] dark:text-white" strokeWidth={2} />
              </button>
              <h2 className="text-[18px] font-[600] text-[#111111] dark:text-white">
                {editingNoteId ? 'Edit Note' : 'Notes'}
              </h2>
              <button
                onClick={handleSaveNote}
                className="h-[38px] px-[18px] bg-[#0B7A81] text-white rounded-[999px] text-[14px] font-[500] flex items-center justify-center active:bg-[#086267]"
              >
                Save
              </button>
            </header>

            {/* Label Chips Section (Horizontal Scrollable) */}
            <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-2.5">
              {/* Add Label Chip */}
              <button
                onClick={() => setLabelInputOpen(true)}
                className="h-[36px] px-4 rounded-[999px] border border-[#0B7A81] text-[#0B7A81] bg-white dark:bg-[#151515] text-[13px] font-[500] whitespace-nowrap shrink-0 flex items-center justify-center"
              >
                Label +
              </button>

              {/* Selected Label Chips */}
              {noteLabels.map(label => (
                <button
                  key={label}
                  onClick={() => handleRemoveLabel(label)}
                  className="h-[36px] px-4 rounded-[999px] bg-[#E8EFF0] text-[#222222] text-[13px] font-[500] whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  {label} <span className="text-gray-400">✎</span>
                </button>
              ))}
            </div>

            {/* Dynamic Label Creator Overlay */}
            <AnimatePresence>
              {labelInputOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl w-full max-w-xs p-4 shadow-xl">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-white">Create New Label</h4>
                    <input
                      type="text"
                      placeholder="Label name..."
                      value={newLabelText}
                      onChange={(e) => setNewLabelText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); }}
                      className="w-full h-10 mt-3 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                    />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => setLabelInputOpen(false)}
                        className="flex-1 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateLabel}
                        className="flex-1 h-9 bg-[#0B7A81] text-white rounded-lg text-xs font-semibold"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

            {/* Note Content Area */}
            <div className="mt-4 flex flex-col">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400 font-semibold tracking-wide">Write note</span>
              </div>
              
              {/* Primary Large Editor text area */}
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="New note content..."
                rows={4}
                className="w-full bg-transparent resize-none border-none focus:outline-none focus:ring-0 mt-4 text-[36px] font-[400] leading-[52px] text-[#333333] dark:text-white placeholder-gray-300"
              />
            </div>

            {/* Verse Previews list */}
            {noteVerses.length > 0 && (
              <div className="mt-6 space-y-4 pt-4 border-t border-gray-100 dark:border-white/[0.04]">
                <p className="text-xs font-semibold text-gray-400 tracking-wide">Linked verses</p>
                {noteVerses.map((vRef, idx) => {
                  const r = `${vRef.bookName} ${vRef.chapter}:${vRef.verses.join(', ')}`;
                  return (
                    <div key={idx} className="flex flex-col relative group bg-white dark:bg-[#151515] p-3 rounded-xl border border-gray-100 dark:border-white/[0.08]">
                      <button
                        onClick={() => setNoteVerses(noteVerses.filter((_, i) => i !== idx))}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        title="Remove verse link"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <span className="text-[20px] font-[500] text-[#0B7A81]">{r}</span>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
                        "{vRef.verseText || 'For he spake of the temple of his body.'}"
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Verse Button */}
            <button
              onClick={() => setVersePickerOpen(true)}
              className="mt-6 flex items-center gap-1.5 text-[16px] font-[400] text-[#666666] dark:text-gray-400 hover:text-[#0B7A81]"
            >
              <Plus className="w-5 h-5" /> Add verse
            </button>

            {/* Dynamic Verse Selection dialog */}
            <AnimatePresence>
              {versePickerOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-[#1c1c1c] rounded-2xl w-full max-w-sm p-5 shadow-xl"
                  >
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white">Link Bible Verse</h3>
                    
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-400">Book</label>
                        <select
                          value={pickerBook}
                          onChange={(e) => setPickerBook(e.target.value)}
                          className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-2 text-[16px] md:text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                        >
                          {BIBLE_BOOKS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-400">Chapter</label>
                          <input
                            type="number"
                            min={1}
                            value={pickerChapter}
                            onChange={(e) => setPickerChapter(Number(e.target.value))}
                            className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-400">Verse</label>
                          <input
                            type="number"
                            min={1}
                            value={pickerVerse}
                            onChange={(e) => setPickerVerse(Number(e.target.value))}
                            className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm bg-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2.5 mt-6">
                      <button
                        onClick={() => setVersePickerOpen(false)}
                        className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-500 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddVerseToNote}
                        className="flex-1 h-10 bg-[#0B7A81] text-white rounded-xl text-sm font-medium"
                      >
                        Link
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popover Menu (Edit/Delete) ── */}
      <AnimatePresence>
        {menuOpenId && menuPosition && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)}>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              className="w-[150px] bg-white dark:bg-[#202020] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-white/[0.08] py-1.5 overflow-hidden z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleReadNote(selectedNoteForMenu)}
                disabled={!selectedNoteForMenu?.verses?.length}
                className="w-full h-[44px] px-4 flex items-center justify-between text-[14px] font-[500] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors active:bg-gray-100/50 text-gray-800 dark:text-gray-200 disabled:opacity-40"
              >
                <span>Read</span>
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleOpenEditNote(selectedNoteForMenu)}
                className="w-full h-[44px] px-4 flex items-center justify-between text-[14px] font-[500] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors active:bg-gray-100/50 text-gray-800 dark:text-gray-200"
              >
                <span>Edit</span>
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteNote(selectedNoteForMenu._id)}
                className="w-full h-[44px] px-4 flex items-center justify-between text-[14px] font-[500] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors active:bg-gray-100/50 text-[#FF4D4F]"
              >
                <span>Delete</span>
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



    </div>
  );
}
