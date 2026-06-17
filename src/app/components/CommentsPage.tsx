'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MessageSquare, Trash2, Calendar, Check, BookOpen, Quote
} from 'lucide-react';
import { toast } from '@/context/ToastContext';

type FilterTab = 'All' | 'Verses' | 'Devotionals';
const TABS: FilterTab[] = ['All', 'Verses', 'Devotionals'];

interface CommentItem {
  _id: string;
  contentId: string;
  contentType: 'daily-verse' | 'daily-devotion' | 'verse' | 'devotion';
  commentText: string;
  createdAt: string;
  reference?: string;
  text?: string;
  title?: string;
  verseRef?: string;
  date?: string;
  version?: string;
}

interface CommentsPageProps {
  onBack?: () => void;
}

export default function CommentsPage({ onBack }: CommentsPageProps = {}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/interactions/comment');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setComments(json.data);
        }
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const showToast = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('error') || lower.includes('failed')) {
      toast.error(msg);
    } else {
      toast.success(msg);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      // Optimistic update
      setComments(prev => prev.filter(c => c._id !== commentId));
      showToast('Comment deleted');

      const res = await fetch(`/api/interactions/comment/${commentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        fetchComments();
        showToast('Failed to delete comment. Reverting.');
      }
    } catch (err) {
      fetchComments();
      showToast('Error deleting comment. Reverting.');
    }
  };

  const handleRead = (item: CommentItem) => {
    if (item.contentType === 'daily-verse' || item.contentType === 'verse') {
      if (item.reference) {
        const match = item.reference.match(/^(.+?)\s+(\d+):(\d+)/);
        if (match) {
          const book = match[1].trim();
          const chapter = match[2];
          router.push(`/bible?book=${encodeURIComponent(book)}&chapter=${chapter}`);
          return;
        }
      }
    }
    router.push('/home');
  };

  const getRelativeTime = (dateString: string) => {
    try {
      const created = new Date(dateString).getTime();
      const now = new Date().getTime();
      const diff = now - created;
      
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch (e) {
      return '';
    }
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

  const filteredComments = useMemo(() => {
    if (activeTab === 'Verses') {
      return comments.filter(item => item.contentType === 'daily-verse' || item.contentType === 'verse');
    }
    if (activeTab === 'Devotionals') {
      return comments.filter(item => item.contentType === 'daily-devotion' || item.contentType === 'devotion');
    }
    return comments;
  }, [activeTab, comments]);

  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D] pb-10">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="px-4 pt-4 pb-5 flex items-center bg-[#F4F8F8] dark:bg-[#0D0D0D] sticky top-0 z-30">
        <button
          onClick={() => onBack ? onBack() : router.back()}
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-gray-200/50 dark:active:bg-white/[0.06] transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-[#111111] dark:text-white" strokeWidth={2} />
        </button>
        <h1 className="ml-2 text-[18px] font-[600] leading-[24px] text-[#111111] dark:text-white">
          Comments
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
                className="h-[160px] w-full rounded-2xl bg-white dark:bg-[#111111] border border-[#D7D7D7] dark:border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0B7A81]/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-[#0B7A81]" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">No comments yet</h3>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              Comments you leave on daily verses or devotionals will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {filteredComments.map(item => {
                const isVerse = item.contentType === 'daily-verse' || item.contentType === 'verse';
                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full bg-white dark:bg-[#151515] border border-[#D7D7D7] dark:border-white/[0.08] rounded-[16px] p-5 flex flex-col relative transition-shadow hover:shadow-sm"
                  >
                    {/* Top Row: Type, Date & Relative Time */}
                    <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-3 select-none">
                      <span className="font-semibold text-[#0B7A81] uppercase tracking-wider">
                        {item.contentType === 'daily-verse' && 'Daily Verse'}
                        {item.contentType === 'daily-devotion' && 'Daily Devotion'}
                        {item.contentType === 'verse' && 'Verse'}
                        {item.contentType === 'devotion' && 'Devotional'}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(item.date)}
                          </span>
                        )}
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0B7A81]" />
                        <span>{getRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Referenced Content Section */}
                    <div className="bg-[#f7fafb] dark:bg-[#1a1a1a] rounded-xl p-3.5 border border-gray-100 dark:border-white/[0.03] mb-4">
                      {isVerse ? (
                        <div>
                          <p className="text-[14px] font-[400] leading-[22px] text-gray-600 dark:text-gray-300 italic mb-1 line-clamp-3">
                            "{item.text || 'Loading verse...'}"
                          </p>
                          <span className="text-xs font-semibold text-[#0B7A81]">
                            {item.reference || ''} {item.version ? `(${item.version})` : ''}
                          </span>
                        </div>
                      ) : (
                        <div>
                          {item.title && (
                            <h4 className="text-[14px] font-[700] text-gray-800 dark:text-gray-200 mb-1 leading-tight line-clamp-1">
                              {item.title}
                            </h4>
                          )}
                          <p className="text-[13px] font-[400] leading-[20px] text-gray-500 dark:text-gray-400 line-clamp-2">
                            {item.text}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* User's Comment Text */}
                    <div className="flex-1 flex gap-2 items-start mb-2 pl-1">
                      <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[15px] font-[500] leading-relaxed text-gray-800 dark:text-gray-100 break-words">
                          {item.commentText}
                        </p>
                      </div>
                    </div>

                    {/* Action Footer */}
                    <div className="flex items-center justify-end gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.04]">
                      {isVerse && item.reference && (
                        <button
                          onClick={() => handleRead(item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read Verse</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(item._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
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
