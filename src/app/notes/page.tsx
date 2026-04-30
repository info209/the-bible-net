"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CardKebabMenu from '@/app/components/CardKebabMenu';

const TABS = [
  { id: 'all',    label: 'All' },
  { id: 'bible',  label: 'Bible' },
  { id: 'journal', label: 'Journals' },
  { id: 'reading_plan', label: 'Reading plans' },
];

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) { setIsLoading(false); return; }

    fetch('/api/user/saved-items?type=note')
      .then(r => r.json())
      .then(d => { if (d.success) setNotes(d.data); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [session, status]);

  const handleDelete = async (id: string, refId: string) => {
    setNotes(prev => prev.filter(n => n._id !== id));
    try {
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', refId, metadata: {} })
      });
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  /* ── Loading skeleton ── */
  if (status === 'loading' || (isLoading && status === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#f4f8f9]">
        <header className="sticky top-0 bg-white shadow-sm z-50">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
              <ChevronLeft className="size-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">Notes</h1>
          </div>
        </header>
        <main className="px-4 py-4 max-w-2xl mx-auto space-y-3">
          {[1,2,3].map(n => <div key={n} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </main>
      </div>
    );
  }

  /* ── Not signed in ── */
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#f4f8f9]">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-7 h-7 text-amber-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in to see your notes</h2>
        <p className="text-sm text-gray-400 mb-6">Notes you write on verses will appear here.</p>
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
      <header className="sticky top-0 bg-white shadow-sm z-50">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100">
            <ChevronLeft className="size-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Notes</h1>
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
        {notes.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-5">
              <FileText className="w-9 h-9 text-amber-300" strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-gray-800">No notes yet</h3>
            <p className="mt-1.5 text-sm text-gray-400 max-w-xs leading-relaxed">
              Long press a verse in the Bible reader and tap Note to write your thoughts.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-3">
              {notes.map((note) => {
                const book = (note.metadata?.bookName ?? note.metadata?.bookId ?? '—') as string;
                const chapter = note.metadata?.chapter;
                const verse = note.metadata?.verse ?? note.metadata?.verses?.[0];
                const verses = note.metadata?.verses as number[] | undefined;
                const verseStr = verses?.length ? verses.join(', ') : (verse ?? '');
                const version = (note.metadata?.versionName ?? note.metadata?.versionId ?? '') as string;
                const ref = [book, chapter != null ? `${chapter}${verseStr ? ':' + verseStr : ''}` : null].filter(Boolean).join(' ');
                const content = note.metadata?.content as string | undefined;
                const tag = note.metadata?.tag as string | undefined;

                const headerText = `You have made a note on ${ref}${version ? ` (${version})` : ''}`;

                return (
                  <motion.div
                    key={note._id ?? note.refId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4"
                  >
                    {/* Top row: header text + kebab */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-xs text-gray-500 leading-snug flex-1">{headerText}</p>
                      <CardKebabMenu
                        onRead={() => router.push('/bible')}
                        onDelete={() => handleDelete(note._id, note.refId)}
                        onShare={() => {
                          if (navigator.share) {
                            navigator.share({ title: ref, text: content ?? ref }).catch(() => {});
                          }
                        }}
                      />
                    </div>

                    {/* Tag badge */}
                    {tag && (
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-[#41ADB0] bg-[#e0f4f4] rounded-full px-2.5 py-0.5 mb-2">
                        {tag}
                      </span>
                    )}

                    {/* Middle: note content */}
                    {content && (
                      <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-3 mb-2">"{content}"</p>
                    )}

                    {/* Bottom: verse reference */}
                    <p className="text-sm font-semibold text-[#41ADB0]">{ref}</p>
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
