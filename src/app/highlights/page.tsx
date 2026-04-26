"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Highlighter, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFD234', green: '#4CD964', blue: '#34AADC',
  pink: '#FF6B9D', purple: '#A66CFF', orange: '#FF9500',
  red: '#FF3B30', teal: '#5AC8FA', lime: '#A4D65E', rose: '#FF2D55',
};

export default function HighlightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (status === 'loading' || (isLoading && status === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#f4f8f9] flex flex-col">
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-50 shadow-sm">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="size-5 text-gray-600" />
          </button>
          <h1 className="ml-2 text-base font-bold text-gray-900">My Highlights</h1>
        </header>
        <main className="pt-20 px-4 max-w-2xl mx-auto space-y-3 w-full">
          {[1,2,3,4].map(n => <div key={n} className="h-16 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </main>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#f4f8f9] pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-50 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="size-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <Highlighter className="w-4 h-4 text-[#41ADB0]" strokeWidth={2} />
          <h1 className="text-base font-bold text-gray-900">My Highlights</h1>
        </div>
        {highlights.length > 0 && (
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {highlights.length}
          </span>
        )}
      </header>

      <main className="pt-18 px-4 max-w-2xl mx-auto pt-[72px]">
        {highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-[#e8f6f7] rounded-full flex items-center justify-center mb-4">
              <Highlighter className="w-7 h-7 text-[#41ADB0]/50" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No highlights yet</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs leading-relaxed">
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

                return (
                  <motion.div
                    key={h._id ?? h.refId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 group"
                  >
                    {/* Color swatch */}
                    <span
                      className="w-10 h-10 rounded-full flex-shrink-0 border-2 border-white shadow"
                      style={{ backgroundColor: hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{ref || '—'}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{colorId ?? 'highlight'} · {version}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => router.push('/bible')}
                        className="p-2 rounded-full text-gray-300 hover:text-[#41ADB0] hover:bg-[#e8f6f7] transition-all opacity-0 group-hover:opacity-100"
                        title="Open in Bible"
                      >
                        <ExternalLink className="size-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(h._id, h.refId)}
                        className="p-2 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
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
