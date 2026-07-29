'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Heart, Share2, BookOpen, Calendar, AlertCircle, Quote
} from 'lucide-react';
import { toast } from '@/context/ToastContext';
import { useLikeContext } from '@/context/LikeContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline';
import { RelativeTimestamp } from '@/components/RelativeTimestamp';

type FilterTab = 'All' | 'Verses' | 'Devotionals';
const TABS: FilterTab[] = ['All', 'Verses', 'Devotionals'];

interface LikedItem {
  _id: string;
  contentId: string;
  contentType: 'daily-verse' | 'daily-devotion' | 'verse' | 'devotion';
  createdAt: string;
  reference?: string;
  text?: string;
  title?: string;
  verseRef?: string;
  date?: string;
  version?: string;
  backgroundImage?: string;
  devotionalBackgroundImage?: string;
}

interface LikesPageProps {
  onBack?: () => void;
}

export default function LikesPage({ onBack }: LikesPageProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setLikedStateDirectly } = useLikeContext();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [unlikingIds, setUnlikingIds] = useState<Set<string>>(new Set());

  const { data: likes = [], isLoading } = useQuery<LikedItem[]>({
    queryKey: ['likes'],
    queryFn: () =>
      fetchWithOfflineCache('user_likes', async () => {
        const res = await fetch('/api/interactions/like');
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch likes');
        return json.data;
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const showToast = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('error') || lower.includes('failed')) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const handleUnlike = async (contentId: string, contentType: string) => {
    const key = `${contentId}_${contentType}`;

    // Prevent double-tap
    if (unlikingIds.has(key)) return;
    setUnlikingIds(prev => new Set(prev).add(key));

    // Snapshot for rollback
    const snapshot = queryClient.getQueryData<LikedItem[]>(['likes']);

    // Optimistic remove
    queryClient.setQueryData<LikedItem[]>(['likes'], prev => (prev || []).filter(
      item => !(item.contentId === contentId && item.contentType === contentType)
    ));

    try {
      const res = await fetch('/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type: contentType }),
      });

      if (!res.ok) throw new Error('API error');

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'API returned failure');

      // Confirmed — API toggled to unliked
      if (data.action === 'liked') {
        // Edge case: server toggled back to liked (rapid tap race); re-fetch to sync
        queryClient.invalidateQueries({ queryKey: ['likes'] });
        return;
      }

      // Sync global LikeContext
      setLikedStateDirectly(contentId, contentType, false, data.likeCount);

      showToast('Removed from Likes');
    } catch (err) {
      console.error('Unlike failed, reverting:', err);
      // Rollback optimistic update
      if (snapshot) {
        queryClient.setQueryData(['likes'], snapshot);
      }
      showToast('Error removing like. Please try again.');
    } finally {
      queryClient.invalidateQueries({ queryKey: ['likes'] });
      queryClient.invalidateQueries({ queryKey: ['daily-content-list'] });
      setUnlikingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleShare = async (item: LikedItem) => {
    let shareText = '';
    if (item.contentType === 'daily-verse' || item.contentType === 'verse') {
      shareText = `"${item.text || ''}" - ${item.reference || ''} ${item.version ? `(${item.version})` : ''}`;
    } else {
      shareText = `Daily Devotional: "${item.title || ''}"\n${item.text || ''} ${item.verseRef ? `\nVerse: ${item.verseRef}` : ''}`;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared from The Bible Net',
          text: shareText,
        });
      } catch (err) {
        navigator.clipboard.writeText(shareText);
        showToast('Copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('Copied to clipboard!');
    }
  };

  const handleRead = (item: LikedItem) => {
    // If it's a verse, try to navigate to it
    if (item.contentType === 'daily-verse' || item.contentType === 'verse') {
      if (item.reference) {
        // Parse "Book Chapter:Verse"
        const match = item.reference.match(/^(.+?)\s+(\d+):(\d+)/);
        if (match) {
          const book = match[1].trim();
          const chapter = match[2];
          router.push(`/bible?book=${encodeURIComponent(book)}&chapter=${chapter}`);
          return;
        }
      }
    }
    // Fallback to home page or devotion section
    router.push('/home');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateStr).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateStr;
    }
  };

  const filteredLikes = useMemo(() => {
    if (activeTab === 'Verses') {
      return likes.filter(item => item.contentType === 'daily-verse' || item.contentType === 'verse');
    }
    if (activeTab === 'Devotionals') {
      return likes.filter(item => item.contentType === 'daily-devotion' || item.contentType === 'devotion');
    }
    return likes;
  }, [activeTab, likes]);

  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D] pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-4 pt-4 pb-5 flex items-center bg-[#F4F8F8] dark:bg-[#0D0D0D] sticky top-0 z-30">
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onBack ? onBack() : router.back()}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-gray-200/50 dark:active:bg-white/[0.06] transition-colors cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[#111111] dark:text-white" strokeWidth={2} />
        </button>
        <h1 className="ml-2 text-[18px] font-[600] leading-[24px] text-[#111111] dark:text-white">
          Likes
        </h1>
      </header>

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex px-4 gap-3 overflow-x-auto scrollbar-none pb-4 bg-[#F4F8F8] dark:bg-[#0D0D0D]">
        {TABS.map(tab => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="h-8 px-4 rounded-[999px] text-[13px] font-[500] whitespace-nowrap shrink-0 transition-all flex items-center justify-center"
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : '#F1F2F3',
                border: isSelected ? '1px solid #0B7A81' : 'none',
                color: isSelected ? '#0B7A81' : '#6D6D6D',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Main List ─────────────────────────────────────────── */}
      <main className="px-5 mt-3 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="h-[140px] w-full rounded-2xl bg-white dark:bg-[#111111] border border-[#D7D7D7] dark:border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : filteredLikes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0B7A81]/10 flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-[#0B7A81]" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">No liked items</h3>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Items you like from the daily verse or devotional will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredLikes.map(item => {
                const isVerse = item.contentType === 'daily-verse' || item.contentType === 'verse';
                const hasBgImage = !isVerse && (item.devotionalBackgroundImage || item.backgroundImage);
                const bgImage = !isVerse ? (item.devotionalBackgroundImage || item.backgroundImage) : undefined;
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full bg-white dark:bg-[#151515] border border-[#D7D7D7] dark:border-white/[0.08] rounded-[16px] p-5 flex flex-col relative transition-shadow hover:shadow-sm overflow-hidden"
                    style={hasBgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {hasBgImage && (
                      <div className="absolute inset-0 bg-black/60 z-0" />
                    )}

                    {/* Top Row: Type & Date */}
                    <div className={`flex items-center justify-between text-xs mb-3 z-10 ${hasBgImage ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                      <span className={`font-semibold tracking-wider ${hasBgImage ? 'text-teal-300' : 'text-[#0B7A81]'}`}>
                        {item.contentType === 'daily-verse' && 'Daily verse'}
                        {item.contentType === 'daily-devotion' && 'Daily devotion'}
                        {item.contentType === 'verse' && 'Verse'}
                        {item.contentType === 'devotion' && 'Devotional'}
                      </span>
                      {(item.date || item.createdAt) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <RelativeTimestamp date={item.date || item.createdAt} />
                        </span>
                      )}
                    </div>

                    {/* Content Section */}
                    {isVerse ? (
                      <div className="flex-1 z-10">
                        <p className="text-[16px] font-[400] leading-[26px] text-[#222222] dark:text-gray-200 italic pl-3 border-l-2 border-[#0B7A81]/40 mb-3">
                          {item.text || 'Loading verse...'}
                        </p>
                        <span className="text-[15px] font-[600] text-[#0B7A81]">
                          {item.reference || ''} {item.version ? `(${item.version})` : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 z-10">
                        {item.title && (
                          <h4 className={`text-[16px] font-[700] mb-2 leading-snug ${hasBgImage ? 'text-white' : 'text-[#111111] dark:text-white'}`}>
                            {item.title}
                          </h4>
                        )}
                        <p className={`text-[14px] font-[400] leading-[22px] mb-3 line-clamp-4 ${hasBgImage ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                          {item.text || 'Loading devotional...'}
                        </p>
                        {item.verseRef && (
                          <div className={`flex items-center gap-1.5 text-xs font-semibold ${hasBgImage ? 'text-teal-300' : 'text-[#0B7A81]'}`}>
                            <Quote className="w-3 h-3" />
                            <span>Scripture: {item.verseRef}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Footer */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.04] z-10">
                      {isVerse && item.reference && (
                        <button
                          onClick={() => handleRead(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleShare(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          hasBgImage ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={() => handleUnlike(item.contentId, item.contentType)}
                        disabled={unlikingIds.has(`${item.contentId}_${item.contentType}`)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                          hasBgImage 
                            ? 'text-red-200 bg-red-950/40 hover:bg-red-950/60' 
                            : 'text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30'
                        }`}
                      >
                        {unlikingIds.has(`${item.contentId}_${item.contentType}`) ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent animate-spin rounded-full" />
                        ) : (
                          <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                        )}
                        <span>Unlike</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>


    </div>
  );
}
