"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  if (status === 'loading' || (isLoading && status === 'authenticated')) {
    return (
      <div className="min-h-screen bg-[#f4f8f9]">
        <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-50 shadow-sm">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ChevronLeft className="size-5 text-gray-600" />
          </button>
          <h1 className="ml-2 text-base font-bold text-gray-900">My Notes</h1>
        </header>
        <main className="pt-[72px] px-4 max-w-2xl mx-auto space-y-3">
          {[1,2,3].map(n => <div key={n} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </main>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#f4f8f9] pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 flex items-center px-4 z-50 shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="size-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 ml-1">
          <FileText className="w-4 h-4 text-amber-500" strokeWidth={2} />
          <h1 className="text-base font-bold text-gray-900">My Notes</h1>
        </div>
        {notes.length > 0 && (
          <span className="ml-auto text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {notes.length}
          </span>
        )}
      </header>

      <main className="pt-[72px] px-4 max-w-2xl mx-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-amber-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-gray-700">No notes yet</p>
            <p className="mt-1 text-xs text-gray-400 max-w-xs leading-relaxed">
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
                const date = note.createdAt ? new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

                return (
                  <motion.div
                    key={note._id ?? note.refId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs font-bold text-[#41ADB0] uppercase tracking-wide">{ref || '—'}</p>
                        {date && <p className="text-[10px] text-gray-400 mt-0.5">{date} · {version}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => router.push('/bible')}
                          className="p-1.5 rounded-full text-gray-300 hover:text-[#41ADB0] hover:bg-[#e8f6f7] transition-all opacity-0 group-hover:opacity-100"
                          title="Open in Bible"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(note._id, note.refId)}
                          className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {content && (
                      <p className="text-sm text-gray-600 leading-relaxed italic line-clamp-3">"{content}"</p>
                    )}
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
