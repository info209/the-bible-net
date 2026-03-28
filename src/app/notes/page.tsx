"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, FileText, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/user/saved-items?type=note');
        const data = await res.json();
        if (data.success) {
          setNotes(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch notes:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [session]);

  const handleDelete = async (refId: string) => {
    try {
      const res = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', refId, metadata: {} }) // toggle logic?
      });
      if (res.ok) {
        setNotes(prev => prev.filter(n => n.refId !== refId));
      }
    } catch (err) {
      console.error("Failed to delete note:", err);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">You need to be logged in to view notes.</h1>
        <button 
          onClick={() => router.push('/auth/signin')}
          className="px-6 py-2 bg-[#006a6f] text-white rounded-full font-medium"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 flex items-center px-4 z-50">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="size-6 text-gray-600" />
        </button>
        <h1 className="ml-2 text-lg font-bold text-gray-900">My Notes</h1>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="size-8 border-4 border-[#006a6f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20 px-8">
            <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="size-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No notes yet</h3>
            <p className="text-gray-500">Long press a verse in the Bible reader to add a note.</p>
          </div>
        ) : (
          notes.map((note) => (
            <motion.div 
              key={note.refId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#006a6f] uppercase tracking-wider">
                    {note.metadata?.bookId} {note.metadata?.chapter}:{note.metadata?.verse || note.metadata?.verses?.join(', ')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push(`/bible/${note.metadata?.versionId}/${note.metadata?.bookId}/${note.metadata?.chapter}?verse=${note.metadata?.verse || note.metadata?.verses?.[0]}`)}
                    className="p-2 text-gray-400 hover:text-[#006a6f] transition-colors"
                  >
                    <ExternalLink className="size-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.refId)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap italic">
                "{note.metadata?.content}"
              </p>
            </motion.div>
          ))
        )}
      </main>
    </div>
  );
}
