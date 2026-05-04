"use client";

import { Heart, MessageCircle, Share2, Maximize2, Play, Pause, X, User, BookOpen, Globe, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { getRelativeTime } from '@/utils/time';
import HomeSkeleton from '@/app/components/HomeSkeleton';

export default function HomeView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { latestProgress, allProgress, isLoading: progressLoading } = useReadingProgress();
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const [verse, setVerse] = useState<any>(null);
  const [devotion, setDevotion] = useState<any>(null);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeContent, setActiveContent] = useState<{ id: string, type: 'verse' | 'devotion' } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [expandedView, setExpandedView] = useState<{ type: 'verse' | 'devotion', data: any } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [verseRes, devotionRes, prayersRes] = await Promise.all([
          fetch('/api/daily/verse'),
          fetch('/api/daily/devotion'),
          fetch('/api/prayers?limit=3')
        ]);

        if (verseRes.ok) setVerse(await verseRes.json());
        if (devotionRes.ok) setDevotion(await devotionRes.json());
        if (prayersRes.ok) setPrayers(await prayersRes.json());
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleLike = async (contentId: string, type: 'verse' | 'devotion') => {
    try {
      const res = await fetch('/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type })
      });

      const data = await res.json();
      if (res.ok) {
        if (type === 'verse') {
          setVerse({ ...verse, likeCount: data.likeCount });
        } else {
          setDevotion({ ...devotion, likeCount: data.likeCount });
        }
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleCommentClick = (contentId: string, type: 'verse' | 'devotion') => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    setActiveContent({ id: contentId, type });
    setShowCommentModal(true);
    fetchComments(contentId, type);
  };

  const fetchComments = async (contentId: string, type: 'verse' | 'devotion') => {
    try {
      const res = await fetch(`/api/interactions/comment?contentId=${contentId}&type=${type}`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (error) {
      console.error('Fetch comments error:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !activeContent) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/interactions/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: activeContent.id,
          type: activeContent.type,
          comment: newComment
        })
      });

      if (res.ok) {
        setNewComment('');
        fetchComments(activeContent.id, activeContent.type);
        if (activeContent.type === 'verse') {
          setVerse({ ...verse, commentCount: (verse.commentCount || 0) + 1 });
        } else {
          setDevotion({ ...devotion, commentCount: (devotion.commentCount || 0) + 1 });
        }
      }
    } catch (error) {
      console.error('Add comment error:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async (content: any, type: 'verse' | 'devotion') => {
    const url = `${window.location.origin}/share/${type}/${content._id}`;
    const text = type === 'verse'
      ? `Check out today's verse: ${content.reference} - "${content.text}"`
      : `Check out today's devotional: "${content.title}"`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'The Bible Net', text, url });
      } catch (error) {
        console.log('Share failed', error);
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const handleExpand = (verse: any) => {
    setExpandedView({ type: 'verse', data: verse });
  };

  const handleRouteToChapter = (verse: any) => {
    const match = verse.reference.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      const book = match[1].toLowerCase().replace(/\s+/g, '-');
      const chapter = match[2];
      const startVerse = match[3];
      router.push(`/bible/${book}/${chapter}?verse=${startVerse}`);
    } else {
      router.push('/bible');
    }
  };

  const handleReadMore = (devotionId: string) => {
    router.push(`/devotion/${devotionId}`);
  };

  const toggleAudio = () => {
    if (!devotion?.audioUrl) {
      alert('Audio not available for this devotional.');
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(devotion.audioUrl);
      audioRef.current.onended = () => setAudioPlaying(false);
    }

    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setAudioPlaying(!audioPlaying);
  };

  const handleIntercede = async (prayerId: string) => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    try {
      const res = await fetch(`/api/prayers/${prayerId}/intercede`, {
        method: 'POST'
      });
      if (res.ok) {
        const updatedPrayer = await res.json();
        setPrayers(prayers.map(p => p._id === prayerId ? updatedPrayer : p));
      }
    } catch (error) {
      console.error('Intercession error:', error);
    }
  };

  if (loading || progressLoading) {
    return <HomeSkeleton />;
  }

  const dailyVerses = verse ? [verse] : [];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 pt-10 pb-6 bg-transparent min-h-full px-4"
    >
      {/* Greeting - Figma Style */}
      <div className="flex items-center space-x-3 animate-fade-in">
        <div className="size-10 rounded-full bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] flex items-center justify-center text-white font-bold text-lg uppercase shadow-sm">
          {(session?.user as any)?.firstName?.[0] || session?.user?.name?.[0] || 'G'}
        </div>
        <div>
          <p className="text-gray-600 text-sm">{getGreeting()},</p>
          <h2 className="text-xl font-bold text-gray-800">
            {(session?.user as any)?.firstName || session?.user?.name || 'Guest'}
          </h2>
        </div>
      </div>

      {/* Profile Setup Banner (Preserved) */}
      {status === 'authenticated' && (session?.user as any).onboardingCompleted === false && (
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between shadow-sm animate-fade-in gap-4 sm:gap-2">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-full shadow-sm border border-teal-100 flex-shrink-0">
              <User className="size-5 text-[var(--color-primary-teal)]" />
            </div>
            <p className="text-sm text-gray-800 font-medium leading-tight">
              Complete your profile to personalize your Bible reading experience.
            </p>
          </div>
          <button
            onClick={() => router.push('/auth/profile-setup')}
            className="flex-shrink-0 px-4 py-2 bg-[var(--color-primary-teal)] hover:bg-[#328e91] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors whitespace-nowrap w-full sm:w-auto text-center"
          >
            Complete Profile
          </button>
        </div>
      )}

      {/* Daily Verse Card - Figma Design */}
      <div className="relative overflow-hidden">
        <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
          {dailyVerses.map((verse, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <div className={`bg-gradient-to-br ${verse.bgColor || 'from-cyan-400 to-teal-500'} rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex flex-col`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

                {/* Content */}
                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Daily Verse</p>
                      <h3 className="text-white text-xl font-bold">{verse.reference}</h3>
                      <p className="text-white/90 text-sm">{verse.version}</p>
                    </div>
                  </div>

                  {/* Verse text */}
                  <div className="flex-1 flex items-center my-6">
                    <p className="text-white text-lg leading-relaxed font-serif italic text-justify">
                      "{verse.text}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/20">
                    <button
                      onClick={() => handleLike(verse._id, 'verse')}
                      className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                    >
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Heart className={`size-4 ${verse.likeCount > 0 ? 'fill-white' : ''}`} />
                      </div>
                      <span className="text-xs">{verse.likeCount ? (verse.likeCount >= 1000 ? (verse.likeCount/1000).toFixed(1) + 'k' : verse.likeCount) : 0}</span>
                    </button>
                    <button
                      onClick={() => handleCommentClick(verse._id, 'verse')}
                      className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                    >
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <MessageCircle className="size-4" />
                      </div>
                      <span className="text-xs">{verse.commentCount ? (verse.commentCount >= 1000 ? (verse.commentCount/1000).toFixed(1) + 'k' : verse.commentCount) : 0}</span>
                    </button>
                    <button
                      onClick={() => handleShare(verse, 'verse')}
                      className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                    >
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Share2 className="size-4" />
                      </div>
                      <span className="text-xs">Share</span>
                    </button>
                    <button
                      onClick={() => handleExpand(verse)}
                      className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                    >
                      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                        <Maximize2 className="size-4" />
                      </div>
                      <span className="text-xs">Expand</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {dailyVerses.length === 0 && (
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex items-center justify-center text-white">
                <p>No verse for today yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Slide indicators */}
        {dailyVerses.length > 1 && (
          <div className="flex justify-center space-x-2 mt-4">
            {dailyVerses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all ${currentSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Daily Devotional Card - Figma Design */}
      {devotion ? (
        <div className="bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[320px]">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-rose-200/50 rounded-full -ml-16 -mt-16" />
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-300/50 rounded-full -mr-12 -mb-12" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">Daily Devotional</p>
                <h3 className="text-gray-800 text-xl font-bold">{devotion.title}</h3>
                <p className="text-gray-600 text-sm">{devotion.reference}</p>
              </div>
              <button
                onClick={toggleAudio}
                className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
              >
                {audioPlaying ? <Pause className="size-5 text-[var(--color-accent-rose)]" /> : <Play className="size-5 text-[var(--color-accent-rose)] ml-0.5" />}
              </button>
            </div>

            <div className="space-y-4 my-6">
              <p className="text-gray-700 leading-relaxed text-justify line-clamp-3">
                {devotion.summary || devotion.text}
              </p>
              {devotion.highlightQuote && (
                <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg border-l-4 border-[var(--color-accent-rose)]">
                  <p className="text-gray-700 italic text-sm">
                    "{devotion.highlightQuote}"
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-rose-200">
              <button
                onClick={() => handleLike(devotion._id, 'devotion')}
                className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <Heart className={`size-4 ${devotion.likeCount > 0 ? 'fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)]' : ''}`} />
                </div>
                <span className="text-xs">{devotion.likeCount || 0}</span>
              </button>
              <button
                onClick={() => handleCommentClick(devotion._id, 'devotion')}
                className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <MessageCircle className="size-4" />
                </div>
                <span className="text-xs">{devotion.commentCount || 0}</span>
              </button>
              <button
                onClick={() => handleShare(devotion, 'devotion')}
                className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <Share2 className="size-4" />
                </div>
                <span className="text-xs">Share</span>
              </button>
              <button
                onClick={() => setExpandedView({ type: 'devotion', data: devotion })}
                className="flex flex-col items-center space-y-1 text-gray-600 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <div className="bg-white p-2 rounded-full shadow-sm">
                  <Maximize2 className="size-4" />
                </div>
                <span className="text-xs">Expand</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-xl min-h-[320px] flex items-center justify-center text-gray-500">
          <p>Devotion loading or not available today.</p>
        </div>
      )}

      {/* My Reading Plan - Figma Style */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">My Reading Plan</h3>
          <button 
            onClick={() => router.push('/bible')}
            className="text-[var(--color-primary-teal)] text-sm font-medium hover:underline"
          >
            {latestProgress ? 'View All' : 'Start Reading →'}
          </button>
        </div>

        {latestProgress ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {/* Latest Progress Card */}
             <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100 flex flex-col justify-between">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 mb-1">Continue Reading</h4>
                    <p className="text-sm text-gray-700 font-medium">
                      {latestProgress.bookName || latestProgress.bookId} {latestProgress.chapter} ({latestProgress.versionName || latestProgress.versionId})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last read: {getRelativeTime(latestProgress.lastReadAt)}
                    </p>
                  </div>
                  <div className="size-12 rounded-full bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] flex items-center justify-center text-white font-bold text-sm">
                    {latestProgress.completed ? '100%' : (latestProgress.progressPercent ? `${Math.round(latestProgress.progressPercent)}%` : '---')}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] h-2 rounded-full transition-all"
                      style={{ width: `${latestProgress.completed ? 100 : (latestProgress.progressPercent || 0)}%` }}
                    />
                </div>
                <button 
                  onClick={() => router.push(`/bible/${latestProgress.versionId}/${latestProgress.bookId}/${latestProgress.chapter}`)}
                  className="w-full py-2 bg-[#e6f0f1] text-[var(--color-primary-teal)] rounded-lg text-sm font-medium hover:bg-[#d0e5e7] transition-colors mt-2"
                >
                  Continue
                </button>
             </div>
             
             {allProgress.length > 1 && (
                <div className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow border border-gray-100 flex flex-col justify-between hidden sm:flex">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 mb-1">Previous Chapter</h4>
                    <p className="text-sm text-gray-700 font-medium">
                      {allProgress[1].bookName || allProgress[1].bookId} {allProgress[1].chapter} ({allProgress[1].versionName || allProgress[1].versionId})
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => router.push(`/bible/${allProgress[1].versionId}/${allProgress[1].bookId}/${allProgress[1].chapter}`)}
                  className="w-full py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors mt-2"
                >
                  Read Again
                </button>
             </div>
             )}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 text-center space-y-4">
             <div className="bg-teal-50 size-16 rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="size-8 text-[var(--color-primary-teal)]" />
             </div>
             <p className="text-gray-600">You haven't started any reading plan yet.</p>
             <button 
                onClick={() => router.push('/bible')}
                className="px-8 py-2 bg-[var(--color-primary-teal)] text-white rounded-lg font-medium shadow-md hover:shadow-lg hover:bg-[#328e91] transition-all"
             >
                Start Reading →
             </button>
          </div>
        )}
      </div>

      {/* Community Prayer Wall - Figma Design */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Community Prayer Requests</h3>
        <div className="space-y-3">
          {prayers.length === 0 ? (
            <div className="bg-white/50 rounded-lg p-8 text-center text-gray-500 italic">
              No public prayer requests yet.
            </div>
          ) : (
            prayers.map((request, i) => (
              <div key={request._id} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 hover:bg-white transition-colors">
                <div className="flex items-start space-x-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold uppercase">
                    {(request.anonymous ? 'A' : (request.userId?.firstName?.[0] || 'U'))}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800">
                        {request.anonymous ? 'Anonymous' : `${request.userId?.firstName} ${request.userId?.lastName?.[0]}.`}
                      </p>
                      <span className="text-xs text-gray-500">{getRelativeTime(request.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{request.text}</p>
                    <button 
                      onClick={() => handleIntercede(request._id)}
                      className={`text-xs font-medium mt-2 hover:underline flex items-center gap-1.5 ${
                        request.intercessors?.includes((session?.user as any)?.id) 
                        ? 'text-orange-600' 
                        : 'text-[var(--color-primary-teal)]'
                      }`}
                    >
                      <span>🙏</span> {request.intercessionCount > 0 ? `${request.intercessionCount} praying` : 'Pray for this'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <button 
          onClick={() => router.push('/community/prayers')}
          className="w-full mt-4 py-3 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          View All Prayers
        </button>
      </div>

      {/* Expanded View Overlay */}
      <AnimatePresence>
        {expandedView && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-0 z-[100] flex flex-col bg-gradient-to-br ${
              expandedView.type === 'verse'
                ? (expandedView.data.bgColor || 'from-cyan-400 to-teal-500')
                : 'from-pink-100 via-rose-100 to-pink-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center p-4">
              <button
                onClick={() => setExpandedView(null)}
                className={`p-2 rounded-full shadow-sm transition-colors ${
                  expandedView.type === 'verse'
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-white/50 hover:bg-white/80 text-gray-800'
                }`}
              >
                <ArrowLeft className="size-6" />
              </button>
              <div className="flex-1" />
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 pb-6">
              <div className="max-w-2xl mx-auto flex flex-col min-h-full">
                {expandedView.type === 'verse' ? (
                  <div className="flex flex-col flex-1 py-8">
                    <p className="text-white/80 text-sm mb-1 uppercase tracking-wider font-semibold">Daily Verse</p>
                    <h3 className="text-white text-3xl font-bold mb-2">{expandedView.data.reference}</h3>
                    <p className="text-white/90 text-sm mb-12">{expandedView.data.version}</p>
                    
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-white text-2xl sm:text-3xl leading-relaxed font-serif italic text-justify">
                        "{expandedView.data.text}"
                      </p>
                    </div>

                    <button
                      onClick={() => handleRouteToChapter(expandedView.data)}
                      className="mt-12 w-full py-4 bg-white text-[var(--color-primary-teal)] rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg"
                    >
                      Read Chapter
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col flex-1 py-8">
                    <p className="text-gray-500 text-sm mb-1 uppercase tracking-wider font-semibold">Daily Devotional</p>
                    <h3 className="text-gray-900 text-3xl font-bold mb-2">{expandedView.data.title}</h3>
                    <p className="text-gray-600 text-sm mb-8">{expandedView.data.reference}</p>
                    
                    {expandedView.data.highlightQuote && (
                      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border-l-4 border-[var(--color-accent-rose)] mb-8 shadow-sm">
                        <p className="text-gray-800 text-lg italic font-serif">
                          "{expandedView.data.highlightQuote}"
                        </p>
                      </div>
                    )}
                    
                    <p className="text-gray-800 text-lg leading-loose text-justify whitespace-pre-wrap">
                      {expandedView.data.text}
                    </p>

                    <button
                      onClick={() => handleReadMore(expandedView.data._id)}
                      className="mt-12 w-full py-4 bg-[var(--color-primary-teal)] text-white rounded-xl font-bold text-lg hover:bg-[var(--color-primary-teal-dark)] transition-colors shadow-lg"
                    >
                      Read Full Devotional
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment Modal - Preserved */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-t-[32px] sm:rounded-2xl glass-ios border-none shadow-2xl [&>[data-slot=dialog-close]]:hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-white/10 backdrop-blur-sm space-y-0">
            <div className="flex flex-col">
              <DialogTitle className="font-bold text-slate-900">Comments</DialogTitle>
              <DialogDescription className="sr-only">View and add comments for this content</DialogDescription>
            </div>
            <button
              onClick={() => setShowCommentModal(false)}
              className="p-2 hover:bg-gray-200/50 rounded-full transition-colors"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-[300px]">
            <div className="p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <MessageCircle className="size-12 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment, i) => (
                  <div key={i} className="flex space-x-3 group">
                    <div className="size-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs uppercase shrink-0 shadow-sm">
                      {comment.userId?.firstName?.[0] || 'U'}
                    </div>
                    <div className="flex-1 bg-gray-100/80 rounded-2xl rounded-tl-none p-3 transition-colors group-hover:bg-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-extrabold text-xs text-slate-900">
                          {comment.userId?.firstName} {comment.userId?.lastName}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">{comment.commentText}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white/10 backdrop-blur-md">
            <div className="flex items-end space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-gray-100/80 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/40 resize-none transition-all placeholder:text-gray-400"
                rows={2}
              />
              <button
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
                className="bg-[var(--color-primary-teal)] text-white p-3 rounded-2xl disabled:opacity-50 hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
              >
                {submittingComment ? (
                  <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Play className="size-5 fill-current ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
