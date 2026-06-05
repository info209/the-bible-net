"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Highlighter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardKebabMenu from '@/app/components/CardKebabMenu';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFD234', green: '#4CD964', blue: '#34AADC',
  pink: '#FF6B9D', purple: '#A66CFF', orange: '#FF9500',
  red: '#FF3B30', teal: '#5AC8FA', lime: '#A4D65E', rose: '#FF2D55',
};

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'bible',  label: 'Bible' },
  { id: 'journal', label: 'Journals' },
  { id: 'reading_plan', label: 'Reading plans' },
];

interface HighlightsPageProps {
  onBack?: () => void;
}

export default function HighlightsPage({ onBack }: HighlightsPageProps = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { setIsLoading(false); return; }

    fetch('/api/user/saved-items?type=highlight')
      .then(r => r.json())
      .then(d => { if (d.success) setHighlights(d.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const handleDelete = async (id: string, refId: string) => {
    setHighlights(prev => prev.filter(h => h._id !== id));
    try {
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'highlight', refId, metadata: {} })
      });
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  const handleBack = () => onBack ? onBack() : router.back();

  /* ── Loading skeleton ── */
  if (status === 'loading' || (isLoading && status === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#f4f8f9]">
        <header className="sticky top-0 z-40 bg-white shadow-sm pt-2">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <button onClick={handleBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
              <ChevronLeft className="size-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Highlights</h1>
          </div>
        </header>
        <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
          {[1,2,3,4].map(n => <div key={n} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </main>
      </div>
    );
  }

  /* ── Not signed in ── */
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#f4f8f9]">
        <div className="w-16 h-16 bg-[#e8f6f7] rounded-full flex items-center justify-center mb-4">
          <Highlighter className="w-7 h-7 text-[#41ADB0]" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in to see your highlights</h2>
        <p className="text-sm text-gray-400 mb-6">Your highlighted verses will appear here.</p>
        <button onClick={() => router.push('/auth/signin')}
          className="px-6 py-2.5 bg-[#41ADB0] text-white rounded-full text-sm font-semibold shadow-md">
          Sign In
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-[#f4f8f9] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-sm pt-2">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={handleBack} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
            <ChevronLeft className="size-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Highlights</h1>
        </div>

        {/* Pill Tabs */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
          {TABS.map(({ id, label }) => {
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
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {highlights.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-[#f0f9fa] rounded-full flex items-center justify-center mb-5">
              <Highlighter className="w-9 h-9 text-[#41ADB0]/50" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-gray-800">No highlights yet</h3>
            <p className="mt-1.5 text-sm text-gray-400 max-w-xs leading-relaxed">
              Long press any verse in the Bible reader and pick a colour.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {highlights.map((h) => {
                const colorId = h.metadata?.color as string | undefined;
                const hex = colorId ? (HIGHLIGHT_COLOR_MAP[colorId] ?? colorId) : '#FFD234';
                const book = (h.metadata?.bookName ?? h.metadata?.bookId ?? '—') as string;
                const chapter = h.metadata?.chapter;
                const verse = h.metadata?.verse;
                const version = (h.metadata?.versionName ?? h.metadata?.versionId ?? '') as string;
                const ref = [book, chapter != null && verse != null ? `${chapter}:${verse}` : null].filter(Boolean).join(' ');
                const content = (h.metadata as any)?.content as string | undefined;

                const headerText = `You have saved ${ref}${version ? ` (${version})` : ''}`;

                return (
                  <motion.div
                    key={h._id ?? h.refId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4"
                  >
                    {/* Top row: header text + kebab */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Colour swatch */}
                        <span
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white shadow-sm"
                          style={{ backgroundColor: hex }}
                        />
                        <p className="text-xs text-gray-500 leading-snug truncate">{headerText}</p>
                      </div>
                      <CardKebabMenu
                        onRead={() => router.push(`/bible?version=${h.metadata?.versionId || 'NKJV'}&book=${h.metadata?.bookId || 'GEN'}&chapter=${h.metadata?.chapter || 1}`)}
                        onDelete={() => handleDelete(h._id, h.refId)}
                        onShare={() => {
                          if (navigator.share) {
                            navigator.share({ title: ref, text: content ?? ref }).catch(() => {});
                          }
                        }}
                      />
                    </div>

                    {/* Middle: content preview */}
                    {content && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-2">{content}</p>
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
