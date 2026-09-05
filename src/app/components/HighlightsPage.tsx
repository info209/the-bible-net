"use client";

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Highlighter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardKebabMenu from '@/app/components/CardKebabMenu';
import LibraryPageHeader from './LibraryPageHeader';
import { shareVerse } from '@/utils/verseFormatter';
import { useSavedItems } from '@/lib/useSavedItems';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFD234', green: '#4CD964', blue: '#34AADC',
  pink: '#FF6B9D', purple: '#A66CFF', orange: '#FF9500',
  red: '#FF3B30', teal: '#5AC8FA', lime: '#A4D65E', rose: '#FF2D55',
};

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'bible',  label: 'Bible' },
  // { id: 'journal', label: 'Journals' },
  { id: 'reading_plan', label: 'Reading plans' },
];

interface HighlightsPageProps {
  onBack?: () => void;
  onClose?: () => void;
}

function formatVersesList(verses: number[]): string {
  if (!verses || verses.length === 0) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = start;
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
  return ranges.join(', ');
}

function groupHighlights(items: any[]): any[] {
  const tempGroups: {
    key: string;
    items: any[];
  }[] = [];

  for (const item of items) {
    if (item.type !== 'highlight') {
      tempGroups.push({ key: 'other', items: [item] });
      continue;
    }

    const { bookId, chapter, versionId, color } = item.metadata || {};
    const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : Date.now();

    let foundGroup = false;
    for (const g of tempGroups) {
      if (g.key === 'other') continue;
      const firstInGroup = g.items[0];
      const gMeta = firstInGroup.metadata || {};
      
      if (
        gMeta.bookId === bookId &&
        gMeta.chapter === chapter &&
        gMeta.versionId === versionId &&
        gMeta.color === color
      ) {
        const isCloseTime = g.items.some(gi => {
          const giTime = gi.createdAt ? new Date(gi.createdAt).getTime() : Date.now();
          return Math.abs(giTime - itemTime) <= 5000;
        });

        if (isCloseTime) {
          g.items.push(item);
          foundGroup = true;
          break;
        }
      }
    }

    if (!foundGroup) {
      tempGroups.push({
        key: `${bookId}_${chapter}_${versionId}_${color}`,
        items: [item],
      });
    }
  }

  return tempGroups.map(g => {
    if (g.key === 'other') {
      return g.items[0];
    }

    if (g.items.length === 1) {
      const item = g.items[0];
      return {
        ...item,
        ids: [item._id],
        refIds: [item.refId],
      };
    }

    const sortedGroupItems = [...g.items].sort((a, b) => {
      const vA = a.metadata?.verse || 0;
      const vB = b.metadata?.verse || 0;
      return vA - vB;
    });

    const first = sortedGroupItems[0];
    const verses = sortedGroupItems.map(i => i.metadata?.verse).filter(v => v != null);
    const ids = sortedGroupItems.map(i => i._id);
    const refIds = sortedGroupItems.map(i => i.refId);

    const combinedContent = sortedGroupItems
      .map(i => i.metadata?.content)
      .filter(Boolean)
      .join(' ');

    return {
      _id: first._id,
      ids,
      refIds,
      type: 'highlight',
      createdAt: first.createdAt,
      metadata: {
        ...first.metadata,
        verses,
        content: combinedContent,
      }
    };
  });
}

export default function HighlightsPage({ onBack, onClose }: HighlightsPageProps = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { savedItems, isLoading, unsaveItem } = useSavedItems();
  const [activeTab, setActiveTab] = useState('all');

  const highlights = useMemo(() => {
    return savedItems.filter(i => i.type === 'highlight');
  }, [savedItems]);

  const filteredHighlights = useMemo(() => {
    if (activeTab === 'all') return highlights;
    if (activeTab === 'bible') return highlights.filter(h => !h.metadata?.planId);
    if (activeTab === 'reading_plan') return highlights.filter(h => !!h.metadata?.planId);
    return highlights;
  }, [highlights, activeTab]);

  const handleDelete = async (ids: string[], refIds: string[]) => {
    try {
      await Promise.all(ids.map(id => unsaveItem(id)));
    } catch (err) {
      console.error("Failed to delete highlights:", err);
    }
  };

  const handleBack = () => onBack ? onBack() : router.back();

  /* ── Not signed in ── */
  if (status === 'unauthenticated' || (status !== 'loading' && !session?.user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#F4F8F8] dark:bg-[#0D0D0D]">
        <div className="w-16 h-16 bg-[#0B7A81]/10 rounded-full flex items-center justify-center mb-4">
          <Highlighter className="w-7 h-7 text-[#0B7A81]" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-[#111111] dark:text-white mb-1">Sign in to see your highlights</h2>
        <p className="text-sm text-gray-400 mb-6">Your highlighted verses will appear here.</p>
        <button onClick={() => router.push('/auth/login')}
          className="px-6 py-2.5 bg-[#0B7A81] text-white rounded-full text-sm font-semibold shadow-md active:bg-[#095f64]">
          Sign In
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D] pb-10">
      {/* Header */}
      <LibraryPageHeader title="Highlights" onBack={handleBack} />

      {/* Pill Tabs */}
      <div className="flex px-4 gap-3 overflow-x-auto scrollbar-none pb-4 bg-[#F4F8F8] dark:bg-[#0D0D0D]">
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="h-8 px-4 rounded-[999px] text-[13px] font-[500] whitespace-nowrap shrink-0 transition-all flex items-center justify-center"
              style={{
                backgroundColor: isActive ? '#FFFFFF' : '#F1F2F3',
                border: isActive ? '1px solid #0B7A81' : 'none',
                color: isActive ? '#0B7A81' : '#6D6D6D',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {status === 'loading' || (isLoading && status === 'authenticated') ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="h-[180px] w-full rounded-2xl bg-white dark:bg-[#111111] border border-[#D7D7D7] dark:border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : filteredHighlights.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0B7A81]/10 flex items-center justify-center mb-4">
              <Highlighter className="w-8 h-8 text-[#0B7A81]" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">No highlights yet</h3>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Long press any verse in the Bible reader and pick a colour.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {groupHighlights(filteredHighlights).map((h) => {
                const colorId = h.metadata?.color as string | undefined;
                const hex = colorId ? (HIGHLIGHT_COLOR_MAP[colorId] ?? colorId) : '#FFD234';
                const book = (h.metadata?.bookName ?? h.metadata?.bookId ?? '—') as string;
                const chapter = h.metadata?.chapter;
                
                const versesArr = Array.isArray(h.metadata?.verses)
                  ? h.metadata.verses
                  : h.metadata?.verse != null
                    ? [h.metadata.verse]
                    : [];
                
                const formattedVerses = versesArr.length > 0 ? formatVersesList(versesArr) : '';
                const ref = [book, chapter != null && formattedVerses ? `${chapter}:${formattedVerses}` : null].filter(Boolean).join(' ');
                
                const version = (h.metadata?.versionName ?? h.metadata?.versionId ?? '') as string;
                const content = (h.metadata as any)?.content as string | undefined;

                const headerText = `You have highlighted ${ref}${version ? ` (${version})` : ''}`;

                return (
                  <motion.div
                    key={h._id ?? h.refId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white dark:bg-[#151515] border border-[#D7D7D7] dark:border-white/[0.08] rounded-[16px] p-4 flex flex-col relative transition-shadow hover:shadow-sm"
                  >
                    {/* Top row: header text + kebab */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Colour swatch */}
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white shadow-sm"
                          style={{ backgroundColor: hex }}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug truncate">{headerText}</p>
                      </div>
                      <CardKebabMenu
                        onRead={() => {
                          const query = new URLSearchParams({
                            version: h.metadata?.versionId || 'NKJV',
                            book: h.metadata?.bookId || 'GEN',
                            chapter: String(h.metadata?.chapter || 1),
                          });
                          if (versesArr.length > 0) {
                            query.set('verse', String(versesArr[0]));
                          }
                          router.push(`/bible?${query.toString()}`);
                          if (onClose) onClose();
                        }}
                        onDelete={() => handleDelete(h.ids || [h._id], h.refIds || [h.refId])}
                        onShare={() => {
                          shareVerse({
                            verseText: content,
                            reference: ref,
                            version,
                            book: h.metadata?.bookId || book,
                            chapter,
                            verses: versesArr,
                          });
                        }}
                      />
                    </div>

                    {/* Middle: content preview */}
                    {content && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-3 mb-2">{content}</p>
                    )}

                    {/* Bottom: verse reference in highlight colour */}
                    <p className="text-sm font-semibold" style={{ color: hex }}>{ref}</p>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
