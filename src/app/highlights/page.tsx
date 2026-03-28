"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Highlighter, Trash2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HighlightsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [highlights, setHighlights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    const fetchHighlights = async () => {
      try {
        const res = await fetch('/api/user/saved-items?type=highlight');
        const data = await res.json();
        if (data.success) {
          setHighlights(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch highlights:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHighlights();
  }, [session]);

  const handleDelete = async (refId: string) => {
    try {
      const res = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'highlight', refId, metadata: {} })
      });
      if (res.ok) {
        setHighlights(prev => prev.filter(h => h.refId !== refId));
      }
    } catch (err) {
      console.error("Failed to delete highlight:", err);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">You need to be logged in to view highlights.</h1>
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
        <h1 className="ml-2 text-lg font-bold text-gray-900">My Highlights</h1>
      </header>

      <main className="pt-20 px-4 max-w-2xl mx-auto space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="size-8 border-4 border-[#006a6f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : highlights.length === 0 ? (
          <div className="text-center py-20 px-8">
            <div className="size-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Highlighter className="size-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No highlights yet</h3>
            <p className="text-gray-500">Long press a verse in the Bible reader to highlight it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {highlights.map((h) => (
              <motion.div 
                key={h.refId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="size-8 rounded-full border border-gray-100" 
                    style={{ backgroundColor: h.metadata?.color || '#f3f4f6' }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-900">
                      {h.metadata?.bookId} {h.metadata?.chapter}:{h.metadata?.verse}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {h.metadata?.versionId}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => router.push(`/bible/${h.metadata?.versionId}/${h.metadata?.bookId}/${h.metadata?.chapter}?verse=${h.metadata?.verse}`)}
                    className="p-2 text-gray-400 hover:text-[#006a6f] transition-colors"
                  >
                    <ExternalLink className="size-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(h.refId)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
