'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark,
  BookOpen,
  BookText,
  CalendarDays,
  ChevronRight,
  Trash2,
  BookMarked,
  ArrowLeft,
  Highlighter,
  FileText,
} from 'lucide-react';
import { useSavedItems, SavedItemClient } from '@/lib/useSavedItems';
import type { SavedItemType } from '@/models/SavedItem';

type Tab = 'all' | SavedItemType;

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Bookmark },
  { id: 'bible', label: 'Bible', icon: BookOpen },
  { id: 'journal', label: 'Journals', icon: BookText },
  { id: 'reading_plan', label: 'Reading Plans', icon: CalendarDays },
  { id: 'highlight', label: 'Highlights', icon: Highlighter },
  { id: 'note', label: 'Notes', icon: FileText },
];

function BibleCard({
  item,
  onUnsave,
  onNavigate,
}: {
  item: SavedItemClient;
  onUnsave: () => void;
  onNavigate: () => void;
}) {
  const { bookName, chapter, versionName, versionId, bookId } = item.metadata;
  const versionLabel = versionName ?? versionId ?? '';
  const chapterLabel = chapter != null ? `Chapter ${chapter}` : '';
  const displayTitle = [bookName, chapterLabel].filter(Boolean).join(' · ');
  const displaySub = versionLabel ? `(${versionLabel})` : '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3.5 group"
    >
      {/* Icon */}
      <div className="w-11 h-11 rounded-full bg-[#e8f6f7] flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-5 h-5 text-[#41ADB0]" strokeWidth={1.8} />
      </div>

      {/* Text */}
      <button
        onClick={onNavigate}
        className="flex-1 text-left overflow-hidden"
      >
        <p className="text-sm font-semibold text-gray-900 truncate">{displayTitle}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{displaySub}</p>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={onNavigate}
          className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all text-gray-400 hover:text-[#41ADB0]"
          title="Open"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onUnsave}
          className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all text-gray-400 hover:text-red-500"
          title="Remove"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

function GenericCard({
  item,
  icon: Icon,
  onUnsave,
}: {
  item: SavedItemClient;
  icon: React.ElementType;
  onUnsave: () => void;
}) {
  const title = item.metadata?.title ?? item.refId;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3.5 group"
    >
      <div className="w-11 h-11 rounded-full bg-[#fde8ec] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#d23952]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 capitalize">{item.type.replace('_', ' ')}</p>
      </div>
      <button
        onClick={onUnsave}
        className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all text-gray-400 hover:text-red-500"
        title="Remove"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { icon: React.ElementType; heading: string; sub: string }> = {
    all: { icon: Bookmark, heading: 'No saved items yet', sub: 'Save Bible chapters, journals, or reading plans to find them here.' },
    bible: { icon: BookOpen, heading: 'No Bible chapters saved', sub: 'Open the Bible reader, tap ⋮ and choose "Save Chapter".' },
    journal: { icon: BookText, heading: 'No journals saved', sub: 'Bookmark a journal entry to see it here.' },
    reading_plan: { icon: CalendarDays, heading: 'No reading plans saved', sub: 'Save a reading plan to access it quickly.' },
    highlight: { icon: Highlighter, heading: 'No highlights saved', sub: 'Long press a verse to highlight it.' },
    note: { icon: FileText, heading: 'No notes saved', sub: 'Long press a verse to add a note.' },
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
      const { versionId, bookId, chapter } = item.metadata;
      if (versionId && bookId && chapter != null) {
        router.push(`/bible/${versionId}/${bookId}/${chapter}`);
      } else {
        router.push('/bible');
      }
    } else if (item.type === 'journal') {
      router.push(`/journals/${item.refId}`);
    } else if (item.type === 'reading_plan') {
      router.push(`/plans/${item.refId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f8f8]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-[#41ADB0]" strokeWidth={1.8} />
            <h1 className="text-lg font-bold text-gray-900">Saved</h1>
          </div>
          {!isLoading && (
            <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
              {savedItems.length} item{savedItems.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-4 pb-0 overflow-x-auto scrollbar-none">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            const count = id === 'all' ? savedItems.length : savedItems.filter((i) => i.type === id).length;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex-shrink-0 ${isActive
                    ? 'border-[#41ADB0] text-[#41ADB0]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
                {count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 ${isActive ? 'bg-[#e8f6f7] text-[#41ADB0]' : 'bg-gray-100 text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse"
              />
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
                {filteredItems.map((item) => {
                  if (item.type === 'bible') {
                    return (
                      <BibleCard
                        key={item._id}
                        item={item}
                        onUnsave={() => unsaveItem(item._id)}
                        onNavigate={() => handleNavigate(item)}
                      />
                    );
                  }
                  let icon = CalendarDays;
                  if (item.type === 'journal') icon = BookText;
                  if (item.type === 'highlight') icon = Highlighter;
                  if (item.type === 'note') icon = FileText;

                  return (
                    <GenericCard
                      key={item._id}
                      item={item}
                      icon={icon}
                      onUnsave={() => unsaveItem(item._id)}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
