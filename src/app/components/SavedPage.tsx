'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, BookOpen, Highlighter, FileText, Lock,
  ArrowLeft, Trash2, Tag, Search, BookText, CalendarDays,
} from 'lucide-react';
import { useSavedVerses, SavedVerseClient } from '@/lib/useSavedVerses';
import { useSavedItems, SavedItemClient } from '@/lib/useSavedItems';
import type { SavedItemType } from '@/models/SavedItem';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'verses' | 'highlights' | 'notes' | 'all';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'verses',     label: 'Verses',     icon: Bookmark },
  { id: 'highlights', label: 'Highlights', icon: Highlighter },
  { id: 'notes',      label: 'Notes',      icon: FileText },
];

// ─── Verse Card ───────────────────────────────────────────────────────────────
function VerseCard({
  item,
  onDelete,
  onNavigate,
}: {
  item: SavedVerseClient;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className="rounded-[24px] overflow-hidden bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.04] shadow-sm"
    >
      {/* Top section */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#31C4BE]/15 flex items-center justify-center shrink-0">
              <Bookmark className="w-3.5 h-3.5 text-[#31C4BE] fill-current" />
            </div>
            <span className="text-[12px] font-semibold text-[#31C4BE]">
              {item.verseRangeText || `${item.bookName} ${item.chapter}:${item.verses.join(', ')}`}
            </span>
            {item.isPrivate && (
              <Lock className="w-3 h-3 text-gray-400 shrink-0" />
            )}
          </div>
          <button
            onClick={() => setConfirmDelete((p) => !p)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Labels */}
        {item.labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {item.labels.map((label) => (
              <span
                key={label}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  backgroundColor: 'rgba(49,196,190,0.10)',
                  color: '#31C4BE',
                  border: '1px solid rgba(49,196,190,0.20)',
                }}
              >
                <Tag className="w-2.5 h-2.5" />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Note preview */}
        {item.note && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-2">
            {item.note}
          </p>
        )}

        {/* Date */}
        <p className="text-[11px] text-gray-400">
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>

      {/* Read button */}
      <button
        onClick={onNavigate}
        className="w-full py-3 border-t border-gray-100 dark:border-white/[0.04] text-[13px] font-semibold text-[#31C4BE] active:bg-gray-50 dark:active:bg-white/[0.04] transition-colors"
      >
        Read in Bible
      </button>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-white/[0.04] px-4 pb-4 pt-3 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 text-[13px] font-medium rounded-[14px] border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 text-[13px] font-semibold rounded-[14px] bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Generic Item Card (highlights / notes) ───────────────────────────────────
function SavedItemCard({
  item,
  onDelete,
  onNavigate,
}: {
  item: SavedItemClient;
  onDelete: () => void;
  onNavigate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { bookName, bookId, chapter, verse, color } = item.metadata ?? {};

  const displayBook = (bookName ?? bookId ?? '—') as string;
  const ref = `${displayBook} ${chapter}${verse != null ? ':' + verse : ''}`;
  const isHighlight = item.type === 'highlight';

  const colorMap: Record<string, string> = {
    yellow: '#FFD234', green: '#4CD964', blue: '#34AADC', pink: '#FF6B9D',
    purple: '#A66CFF', orange: '#FF9500', red: '#FF3B30', teal: '#5AC8FA',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className="rounded-[24px] overflow-hidden bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.04] shadow-sm"
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            {isHighlight && color && colorMap[color as string] ? (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: colorMap[color as string] + '33' }}
              >
                <Highlighter className="w-3.5 h-3.5" style={{ color: colorMap[color as string] }} />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
              </div>
            )}
            <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{ref}</span>
          </div>
          <button
            onClick={() => setConfirmDelete((p) => !p)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-gray-400 hover:text-red-500"
            aria-label="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {(item.metadata as any)?.content && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3 mb-2">
            {(item.metadata as any).content}
          </p>
        )}
        <p className="text-[11px] text-gray-400">
          {new Date(item.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
          })}
        </p>
      </div>
      <button
        onClick={onNavigate}
        className="w-full py-3 border-t border-gray-100 dark:border-white/[0.04] text-[13px] font-semibold text-[#31C4BE] active:bg-gray-50 dark:active:bg-white/[0.04] transition-colors"
      >
        Read in Bible
      </button>
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100 dark:border-white/[0.04] px-4 pb-4 pt-3 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 text-[13px] font-medium rounded-[14px] border border-gray-200 dark:border-white/[0.06] text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                className="flex-1 py-2.5 text-[13px] font-semibold rounded-[14px] bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { icon: React.ElementType; heading: string; sub: string }> = {
    verses:     { icon: Bookmark,    heading: 'No saved verses yet',  sub: 'Tap and hold a verse in the Bible reader, then tap Save.' },
    highlights: { icon: Highlighter, heading: 'No highlights yet',    sub: 'Long press a verse and tap Highlight to mark it.' },
    notes:      { icon: FileText,    heading: 'No notes yet',         sub: 'Long press a verse and tap Note to add your thoughts.' },
    all:        { icon: Bookmark,    heading: 'Nothing saved yet',    sub: 'Start reading and save verses, highlights, and notes.' },
  };
  const { icon: Icon, heading, sub } = map[tab];
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#31C4BE]/10 flex items-center justify-center mb-5">
        <Icon className="w-9 h-9 text-[#31C4BE]/60" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-semibold text-gray-800 dark:text-gray-100">{heading}</h3>
      <p className="mt-1.5 text-[13px] text-gray-400 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SavedPage() {
  const router = useRouter();
  const { savedVerses, isLoading: versesLoading, deleteSavedVerse } = useSavedVerses();
  const { savedItems, isLoading: itemsLoading, unsaveItem } = useSavedItems();
  const [activeTab, setActiveTab] = useState<Tab>('verses');
  const [searchQuery, setSearchQuery] = useState('');

  const highlights = useMemo(
    () => savedItems.filter((i) => i.type === 'highlight'),
    [savedItems]
  );
  const notes = useMemo(
    () => savedItems.filter((i) => i.type === 'note'),
    [savedItems]
  );

  const isLoading = versesLoading || itemsLoading;

  const filteredVerses = useMemo(() => {
    if (!searchQuery.trim()) return savedVerses;
    const q = searchQuery.toLowerCase();
    return savedVerses.filter(
      (v) =>
        v.bookName.toLowerCase().includes(q) ||
        v.labels.some((l) => l.toLowerCase().includes(q)) ||
        v.verseRangeText.toLowerCase().includes(q) ||
        v.note?.toLowerCase().includes(q)
    );
  }, [savedVerses, searchQuery]);

  const filteredHighlights = useMemo(() => {
    if (!searchQuery.trim()) return highlights;
    const q = searchQuery.toLowerCase();
    return highlights.filter((h) =>
      ((h.metadata?.bookName ?? h.metadata?.bookId) as string | undefined)
        ?.toLowerCase()
        .includes(q)
    );
  }, [highlights, searchQuery]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        ((n.metadata?.content ?? '') as string).toLowerCase().includes(q) ||
        ((n.metadata?.bookName ?? n.metadata?.bookId) as string | undefined)
          ?.toLowerCase()
          .includes(q)
    );
  }, [notes, searchQuery]);

  const handleNavigateToVerse = (v: SavedVerseClient) => {
    router.push('/bible');
  };

  const handleNavigateToItem = (item: SavedItemClient) => {
    router.push('/bible');
  };

  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D]">
      {/* ── Sticky Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white dark:bg-[#0D0D0D] border-b border-gray-100 dark:border-white/[0.04]">
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>
          <h1 className="text-[18px] font-bold text-gray-900 dark:text-white flex-1">Saved</h1>
          <span className="text-[13px] font-medium text-[#31C4BE]">
            {activeTab === 'verses' ? filteredVerses.length :
             activeTab === 'highlights' ? filteredHighlights.length :
             filteredNotes.length}
          </span>
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2.5 h-[38px] rounded-[14px] px-3 bg-gray-100 dark:bg-white/[0.06]">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved…"
              className="flex-1 text-[13px] bg-transparent focus:outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
              aria-label="Search saved items"
            />
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────── */}
        <div className="flex px-4 pb-3 gap-2 overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`saved-tab-${id}`}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all"
                style={{
                  backgroundColor: isActive ? '#31C4BE' : undefined,
                  color: isActive ? '#ffffff' : '#9CA3AF',
                }}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="px-4 py-4 max-w-2xl mx-auto pb-28">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 rounded-[24px] bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {/* Verses Tab */}
            {activeTab === 'verses' && (
              <motion.div
                key="verses"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredVerses.length === 0 ? (
                  <EmptyState tab="verses" />
                ) : (
                  filteredVerses.map((v) => (
                    <VerseCard
                      key={v._id}
                      item={v}
                      onDelete={() => deleteSavedVerse(v._id)}
                      onNavigate={() => handleNavigateToVerse(v)}
                    />
                  ))
                )}
              </motion.div>
            )}

            {/* Highlights Tab */}
            {activeTab === 'highlights' && (
              <motion.div
                key="highlights"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredHighlights.length === 0 ? (
                  <EmptyState tab="highlights" />
                ) : (
                  filteredHighlights.map((item) => (
                    <SavedItemCard
                      key={item._id}
                      item={item}
                      onDelete={() => unsaveItem(item._id)}
                      onNavigate={() => handleNavigateToItem(item)}
                    />
                  ))
                )}
              </motion.div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredNotes.length === 0 ? (
                  <EmptyState tab="notes" />
                ) : (
                  filteredNotes.map((item) => (
                    <SavedItemCard
                      key={item._id}
                      item={item}
                      onDelete={() => unsaveItem(item._id)}
                      onNavigate={() => handleNavigateToItem(item)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
