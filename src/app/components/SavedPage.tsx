'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  BookOpen,
  BookText,
  CalendarDays,
  Trash2,
  ArrowLeft,
  Highlighter,
  FileText,
} from 'lucide-react';
import { useSavedItems, SavedItemClient } from '@/lib/useSavedItems';
import type { SavedItemType } from '@/models/SavedItem';
import CardKebabMenu from './CardKebabMenu';

type Tab = 'all' | SavedItemType;

const tabs: { id: Tab; label: string }[] = [
  { id: 'all',          label: 'All' },
  { id: 'bible',        label: 'Bible' },
  { id: 'journal',      label: 'Journals' },
  { id: 'reading_plan', label: 'Reading plans' },
];

/* ── Card for every saved item ──────────────────────────────────── */
function SavedCard({
  item,
  onUnsave,
  onNavigate,
}: {
  item: SavedItemClient;
  onUnsave: () => void;
  onNavigate: () => void;
}) {
  const { bookName, bookId, chapter, verse, verses, versionName, versionId } = item.metadata ?? {};
  const displayBook = (bookName ?? bookId ?? '—') as string;
  const versionLabel = (versionName ?? versionId ?? '') as string;

  // Build a clean verse string
  const verseArr = verses as number[] | undefined;
  const verseStr = verseArr?.length
    ? verseArr.join(', ')
    : verse != null
    ? String(verse)
    : '';

  const refShort = [displayBook, chapter != null ? `${chapter}${verseStr ? ':' + verseStr : ''}` : null]
    .filter(Boolean)
    .join(' ');

  const headerText = `You have saved ${refShort}${versionLabel ? ` (${versionLabel})` : ''}`;

  const content = (item.metadata as any)?.content as string | undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4"
    >
      {/* Top row: header + kebab */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs text-gray-500 leading-snug flex-1">{headerText}</p>
        <CardKebabMenu
          onRead={onNavigate}
          onDelete={onUnsave}
          onShare={() => {
            if (navigator.share) {
              navigator.share({ title: refShort, text: content ?? refShort }).catch(() => {});
            }
          }}
        />
      </div>

      {/* Middle: content preview */}
      {content && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-2">{content}</p>
      )}

      {/* Bottom: verse reference */}
      <p className="text-sm font-semibold text-[#41ADB0]">{refShort}</p>
    </motion.div>
  );
}

/* ── Empty state ──────────────────────────────────────────────── */
function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { icon: React.ElementType; heading: string; sub: string }> = {
    all:          { icon: Bookmark,      heading: 'No saved items yet',         sub: 'Save Bible chapters, journals, or reading plans to find them here.' },
    bible:        { icon: BookOpen,      heading: 'No Bible chapters saved',    sub: 'Open the Bible reader, tap ⋮ and choose "Save Chapter".' },
    journal:      { icon: BookText,      heading: 'No journals saved',          sub: 'Bookmark a journal entry to see it here.' },
    reading_plan: { icon: CalendarDays,  heading: 'No reading plans saved',     sub: 'Save a reading plan to access it quickly.' },
    highlight:    { icon: Highlighter,   heading: 'No highlights saved',        sub: 'Long press a verse to highlight it.' },
    note:         { icon: FileText,      heading: 'No notes saved',             sub: 'Long press a verse to add a note.' },
  };
  const { icon: Icon, heading, sub } = messages[tab];
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#f0f9fa] flex items-center justify-center mb-5">
        <Icon className="w-9 h-9 text-[#41ADB0]/60" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-gray-800">{heading}</h3>
      <p className="mt-1.5 text-sm text-gray-400 max-w-xs leading-relaxed">{sub}</p>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function SavedPage() {
  const router = useRouter();
  const { savedItems, isLoading, unsaveItem } = useSavedItems();
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const filteredItems = useMemo(() => {
    if (activeTab === 'all') return savedItems;
    return savedItems.filter((i) => i.type === activeTab);
  }, [savedItems, activeTab]);

  const handleNavigate = (item: SavedItemClient) => {
    if (item.type === 'bible') {
      router.push('/bible');
    } else if (item.type === 'journal') {
      router.push(`/journals/${item.refId}`);
    } else if (item.type === 'reading_plan') {
      router.push(`/plans/${item.refId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8f8]">
      {/* ── Header ── */}
      <div className="sticky top-16 z-40 bg-white shadow-sm pt-2">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Saved</h1>
        </div>

        {/* ── Pill Tabs ── */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#e0f4f4] text-[#41ADB0]'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 py-4 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <EmptyState tab={activeTab} />
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredItems.map((item) => (
                  <SavedCard
                    key={item._id}
                    item={item}
                    onUnsave={() => unsaveItem(item._id)}
                    onNavigate={() => handleNavigate(item)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
