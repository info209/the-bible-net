"use client";

import { Play, User, BookOpen, Globe, ArrowLeft, Heart, MessageCircle, Share2, Maximize2, Pause, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { getRelativeTime } from '@/utils/time';
import HomeSkeleton from '@/app/components/HomeSkeleton';
import { DailyDetailModal } from './DailyDetailModal';

export default function HomeView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { latestProgress, allProgress, isLoading: progressLoading } = useReadingProgress();
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Independent slide tracking for each carousel
  const [currentVerseSlide, setCurrentVerseSlide] = useState(0);
  const [currentDevotionSlide, setCurrentDevotionSlide] = useState(0);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeContent, setActiveContent] = useState<{ id: string, type: 'daily-verse' | 'daily-devotion' } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Decoupled daily content states
  const [dailyContents, setDailyContents] = useState<any[]>([]);
  const [dailyVerses, setDailyVerses] = useState<any[]>([]);
  const [dailyDevotions, setDailyDevotions] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [initialModalIndex, setInitialModalIndex] = useState(0);
  const [initialModalSection, setInitialModalSection] = useState<'verse' | 'devotional' | 'prayer' | undefined>();
  const [modalContents, setModalContents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const preferredVersion = (session?.user as any)?.preferredBibleVersion || 'KJV';
        const [dailyRes, prayersRes] = await Promise.all([
          fetch(`/api/daily?days=7&version=${encodeURIComponent(preferredVersion)}`),
          fetch('/api/prayers?limit=3')
        ]);

        if (dailyRes.ok) {
          const data = await dailyRes.json();
          const items = data.data || [];
          setDailyContents(items);
          
          // Separate daily verses and daily devotionals
          const verses = items.filter((item: any) => item.verseBook && item.verseBook !== 'Unknown');
          const devotions = items.filter((item: any) => item.devotionalTitle && item.devotionalContent);
          
          setDailyVerses(verses);
          setDailyDevotions(devotions);
        }
        if (prayersRes.ok) setPrayers(await prayersRes.json());
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [(session?.user as any)?.preferredBibleVersion]);

  const openDetailModal = (index: number, section: 'verse' | 'devotional' | 'prayer') => {
    if (section === 'verse') {
      setModalContents(dailyVerses);
    } else {
      setModalContents(dailyDevotions);
    }
    setInitialModalIndex(index);
    setInitialModalSection(section);
    setIsDetailModalOpen(true);
  };

  const handleLike = async (contentId: string, type: 'daily-verse' | 'daily-devotion') => {
    try {
      const res = await fetch('/api/interactions/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, type })
      });

      const data = await res.json();
      if (res.ok) {
        // Update general contents, verses, and devotions
        const updateCounts = (prev: any[]) => prev.map(content => {
          if (content._id === contentId) {
            return {
              ...content,
              [type === 'daily-verse' ? 'verseLikeCount' : 'devotionLikeCount']: data.likeCount
            };
          }
          return content;
        });

        setDailyContents(updateCounts);
        setDailyVerses(updateCounts);
        setDailyDevotions(updateCounts);
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleCommentClick = (contentId: string, type: 'daily-verse' | 'daily-devotion') => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }
    setActiveContent({ id: contentId, type });
    setShowCommentModal(true);
    fetchComments(contentId, type);
  };

  const fetchComments = async (contentId: string, type: 'daily-verse' | 'daily-devotion') => {
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
        
        const updateCommentCounts = (prev: any[]) => prev.map(content => {
          if (content._id === activeContent.id) {
            const countField = activeContent.type === 'daily-verse' ? 'verseCommentCount' : 'devotionCommentCount';
            return {
              ...content,
              [countField]: (content[countField] || 0) + 1
            };
          }
          return content;
        });

        setDailyContents(updateCommentCounts);
        setDailyVerses(updateCommentCounts);
        setDailyDevotions(updateCommentCounts);
      }
    } catch (error) {
      console.error('Add comment error:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async (content: any, type: 'daily-verse' | 'daily-devotion') => {
    const url = `${window.location.origin}/share/${type.replace('daily-', '')}/${content._id}`;
    const text = type === 'daily-verse'
      ? `Check out this verse: ${content.verseReference} - "${content.verse}"`
      : `Check out this devotional: "${content.devotionalTitle}"`;

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

  const toggleAudio = (url: string) => {
    if (!url) return;

    if (audioPlaying === url && audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setAudioPlaying(null);
      audioRef.current.play();
      setAudioPlaying(url);
    }
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

  const getRelativeLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';

    const contentDate = new Date(dateStr);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today.getTime() - contentDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} Days Ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 pt-0 pb-6 bg-transparent min-h-full px-0 overflow-hidden"
    >
      {/* Greeting - Figma Style */}
      <div className="flex items-center space-x-3 animate-fade-in px-4 mt-0.5">
        <div className="flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 text-black"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M11 2h2v5h5v2h-5v13h-2V9H6V7h5V2z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-baseline space-x-1.5 min-w-0">
            <span className="text-gray-800 text-[19px] font-bold shrink-0">Shalom,</span>
            <span className="truncate block max-w-full text-gray-500 text-[14px] font-medium">
              {(session?.user as any)?.firstName || session?.user?.name || 'Believer'}
            </span>
          </h2>
        </div>
      </div>

      {/*Profile Setup Banner (Preserved)
      {status === 'authenticated' && (session?.user as any).onboardingCompleted === false && (
        <div className="px-4">
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
        </div>
      )}*/}

      {/* Daily Verse Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-8 w-full">
        <div className="overflow-hidden w-full rounded-2xl">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(e, info) => {
              const swipeThreshold = 50;
              const swipeVelocity = 500;
              const offset = info.offset.x;
              const velocity = info.velocity.x;

              if (offset < -swipeThreshold || velocity < -swipeVelocity) {
                if (currentVerseSlide < dailyVerses.length - 1) {
                  setCurrentVerseSlide(prev => prev + 1);
                }
              } else if (offset > swipeThreshold || velocity > swipeVelocity) {
                if (currentVerseSlide > 0) {
                  setCurrentVerseSlide(prev => prev - 1);
                }
              }
            }}
            animate={{ x: `-${currentVerseSlide * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="flex w-full"
          >
            {dailyVerses.map((content, index) => (
              <div key={content._id || index} className="w-full flex-shrink-0 select-none">
                {/* Daily Verse Card - consistent shared banner background */}
                <div
                  className="rounded-none p-6 shadow-xl relative overflow-hidden h-[395px] flex flex-col"
                  style={{ backgroundImage: 'url(/banner_bible.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {/* Consistent dark overlay */}
                  <div className="absolute inset-0 bg-black/55" />

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col h-full justify-between">
                    <div>
                      <p className="text-white/80 text-xs mb-1 uppercase tracking-wider">{getRelativeLabel(content.date)}'s Verse</p>
                      <h3 className="text-white text-xl font-bold truncate">{content.verseReference || 'Reference'}</h3>
                      <p className="text-white/90 text-xs">{content.version || 'KJV'}</p>
                    </div>

                    {/* Verse text - line clamped to prevent vertical growth */}
                    <div className="flex-1 flex items-center justify-center my-4 overflow-hidden">
                      <p className="text-white text-[16px] md:text-[18px] leading-relaxed font-serif italic text-justify line-clamp-5 overflow-hidden text-ellipsis w-full">
                        "{content.verse || 'Verse text available soon...'}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <button
                        onClick={() => handleLike(content._id, 'daily-verse')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <Heart className={`size-4 ${content.verseLikeCount > 0 ? 'fill-white' : ''}`} />
                        </div>
                        <span className="text-xs">{content.verseLikeCount || 'Like'}</span>
                      </button>
                      <button
                        onClick={() => handleCommentClick(content._id, 'daily-verse')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <MessageCircle className="size-4" />
                        </div>
                        <span className="text-xs">{content.verseCommentCount || 'Comment'}</span>
                      </button>
                      <button
                        onClick={() => handleShare(content, 'daily-verse')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <Share2 className="size-4" />
                        </div>
                        <span className="text-xs">Share</span>
                      </button>
                      <button
                        onClick={() => openDetailModal(index, 'verse')}
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
              <div className="w-full flex-shrink-0 select-none">
                <div className="rounded-none p-6 shadow-xl relative overflow-hidden h-[395px] flex items-center justify-center text-white" style={{ backgroundImage: 'url(/banner_bible.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="absolute inset-0 bg-black/55" />
                  <p className="relative z-10">No daily verses available yet.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Slide indicators */}
        {dailyVerses.length > 1 && (
          <div className="flex justify-center space-x-2 mt-3">
            {dailyVerses.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentVerseSlide(index)}
                className={`h-2 rounded-full transition-all ${currentVerseSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Daily Devotional Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-6 w-full">
        <div className="overflow-hidden w-full rounded-2xl">
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={(e, info) => {
              const swipeThreshold = 50;
              const swipeVelocity = 500;
              const offset = info.offset.x;
              const velocity = info.velocity.x;

              if (offset < -swipeThreshold || velocity < -swipeVelocity) {
                if (currentDevotionSlide < dailyDevotions.length - 1) {
                  setCurrentDevotionSlide(prev => prev + 1);
                }
              } else if (offset > swipeThreshold || velocity > swipeVelocity) {
                if (currentDevotionSlide > 0) {
                  setCurrentDevotionSlide(prev => prev - 1);
                }
              }
            }}
            animate={{ x: `-${currentDevotionSlide * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="flex w-full"
          >
            {dailyDevotions.map((content, index) => (
              <div key={content._id || index} className="w-full flex-shrink-0 select-none">
                {/* Daily Devotional Card - consistent shared banner background */}
                <div
                  className="rounded-none p-6 shadow-xl relative overflow-hidden h-[360px] flex flex-col justify-between"
                  style={{ backgroundImage: 'url(/banner_bible.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
                >
                  {/* Consistent dark overlay */}
                  <div className="absolute inset-0 bg-black/55" />

                  <div className="relative z-10 flex-1 flex flex-col h-full justify-between">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs mb-1 uppercase tracking-wider text-white/80">
                          {getRelativeLabel(content.date)}'s Devotional
                        </p>
                        <h3 className="text-xl font-bold truncate text-white">
                          {content.devotionalTitle}
                        </h3>
                        {content.devotionalVerseRef && (
                          <p className="text-xs mt-1 font-bold text-white/90 truncate">
                            {content.devotionalVerseRef}
                          </p>
                        )}
                      </div>
                      {content.audioUrl && (
                        <button
                          onClick={() => toggleAudio(content.audioUrl)}
                          className="p-2 bg-white/20 backdrop-blur-sm rounded-full shadow-md hover:scale-110 transition-transform shrink-0"
                        >
                          {audioPlaying === content.audioUrl ? <Pause className="size-5 text-white" /> : <Play className="size-5 text-white ml-0.5" />}
                        </button>
                      )}
                    </div>

                    {/* Devotional content - clamped to exactly 3 lines to maintain uniform height */}
                    <div className="flex-1 flex items-center my-4 overflow-hidden">
                      <p className="leading-relaxed text-justify line-clamp-3 text-white/90 text-sm md:text-base w-full">
                        {content.devotionalContent}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/20">
                      <button
                        onClick={() => handleLike(content._id, 'daily-devotion')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <Heart className={`size-4 ${content.devotionLikeCount > 0 ? 'fill-white' : ''}`} />
                        </div>
                        <span className="text-xs">{content.devotionLikeCount || 'Like'}</span>
                      </button>
                      <button
                        onClick={() => handleCommentClick(content._id, 'daily-devotion')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <MessageCircle className="size-4" />
                        </div>
                        <span className="text-xs">{content.devotionCommentCount || 'Comment'}</span>
                      </button>
                      <button
                        onClick={() => handleShare(content, 'daily-devotion')}
                        className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform"
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                          <Share2 className="size-4" />
                        </div>
                        <span className="text-xs">Share</span>
                      </button>
                      <button
                        onClick={() => openDetailModal(index, 'devotional')}
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

            {dailyDevotions.length === 0 && (
              <div className="w-full flex-shrink-0 select-none">
                <div className="rounded-none p-6 shadow-xl relative overflow-hidden h-[360px] flex items-center justify-center text-white" style={{ backgroundImage: 'url(/banner_bible.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
                  <div className="absolute inset-0 bg-black/55" />
                  <p className="relative z-10">No daily devotionals available yet.</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Slide indicators */}
        {dailyDevotions.length > 1 && (
          <div className="flex justify-center space-x-2 mt-3">
            {dailyDevotions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentDevotionSlide(index)}
                className={`h-2 rounded-full transition-all ${currentDevotionSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* My Reading Plan - Figma Style (Commented out)
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
                onClick={() => router.push(`/bible?version=${latestProgress.versionId}&book=${latestProgress.bookId}&chapter=${latestProgress.chapter}`)}
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
                  onClick={() => router.push(`/bible?version=${allProgress[1].versionId}&book=${allProgress[1].bookId}&chapter=${allProgress[1].chapter}`)}
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
      */}

      {/* Journals & Prayers Entry Point */}
      <div className="px-4">
        <div
          onClick={() => router.push('/journals')}
          className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-2xl p-6 shadow-md hover:shadow-lg hover:border-[#0B7A81]/30 dark:hover:border-[#0B7A81]/50 transition-all cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center space-x-4">
            <div className="bg-[#0B7A81]/10 dark:bg-[#0B7A81]/20 p-3.5 rounded-xl group-hover:scale-110 transition-transform">
              <span className="text-3xl select-none">✍️</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-[#F5F5F5] group-hover:text-[#0B7A81] transition-colors">
                Journals & Prayers
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Write journals, keep track of personal prayers, checklist notes, and voice recordings.
              </p>
            </div>
          </div>
          <div className="text-[var(--color-primary-teal)] text-xl font-bold transition-transform group-hover:translate-x-1 p-2">
            →
          </div>
        </div>
      </div>

      {/* Community Prayer Wall - Figma Design */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 shadow-xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Community Prayer Requests</h3>
          <div className="space-y-3">
            {prayers.length === 0 ? (
              <div className="bg-white/50 rounded-lg p-8 text-center text-gray-500 italic">
                No public prayer requests yet.
              </div>
            ) : (
              prayers.map((request) => (
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
                        className={`text-xs font-medium mt-2 hover:underline flex items-center gap-1.5 ${request.intercessors?.includes((session?.user as any)?.id)
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
      </div>

      {/* Footer Section - Figma Replica */}
      <footer className="w-full bg-white border-t border-gray-100/80 mt-12 py-10 px-6 flex flex-col items-center select-none">
        {/* Logo Card */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#24a0a4] px-5 py-3 rounded-xl shadow-sm w-fit select-none flex items-center justify-center">
            <img src="/logo.svg" alt="The Bible Net" width={120} height={46} className="object-contain" />
          </div>
        </div>

        {/* Paragraph Text */}
        <p className="text-gray-500 text-sm leading-relaxed text-center max-w-sm mb-8 px-2 font-normal">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. In volutpat enim a odio sagittis pretium ut vitae diam.
        </p>

        {/* Links Grid */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-3.5 text-sm text-gray-400 font-medium mb-10 w-full max-w-[280px]">
          <div className="flex flex-col space-y-3 items-start">
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
          </div>
          <div className="flex flex-col space-y-3 items-end">
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
            <a href="#" className="hover:text-gray-600 transition-colors">Links</a>
          </div>
        </div>

        {/* Social Icons */}
        <div className="flex items-center justify-center gap-8 mb-4">
          {/* Instagram */}
          <a href="#" className="text-gray-900 hover:text-gray-600 hover:scale-110 transition-all duration-200" aria-label="Instagram">
            <svg className="size-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>

          {/* Facebook */}
          <a href="#" className="text-[#1877F2] hover:opacity-90 hover:scale-110 transition-all duration-200" aria-label="Facebook">
            <svg className="size-6 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>

          {/* X (formerly Twitter) */}
          <a href="#" className="text-gray-900 hover:text-gray-600 hover:scale-110 transition-all duration-200" aria-label="X">
            <svg className="size-5.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </footer>

      <DailyDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        contents={modalContents}
        initialIndex={initialModalIndex}
        initialSection={initialModalSection}
      />

      {/* Comment Modal - Restored */}
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
