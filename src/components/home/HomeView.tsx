"use client";

import { Play, User, BookOpen, Globe, ArrowLeft, Heart, MessageCircle, Share2, Maximize2, Pause, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
  
  const [currentVerseSlide, setCurrentVerseSlide] = useState(0);
  const verseCarouselRef = useRef<HTMLDivElement>(null);
  
  const [currentDevotionSlide, setCurrentDevotionSlide] = useState(0);
  const devotionCarouselRef = useRef<HTMLDivElement>(null);

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeContent, setActiveContent] = useState<{ id: string, type: 'daily-verse' | 'daily-devotion' } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [dailyContents, setDailyContents] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [initialModalIndex, setInitialModalIndex] = useState(0);
  const [initialModalSection, setInitialModalSection] = useState<'verse' | 'devotional' | 'prayer' | undefined>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Pass the user's preferred Bible version so verse text resolves correctly
        const preferredVersion = (session?.user as any)?.preferredBibleVersion || 'KJV';
        const [dailyRes, prayersRes] = await Promise.all([
          fetch(`/api/daily?days=7&version=${encodeURIComponent(preferredVersion)}`),
          fetch('/api/prayers?limit=3')
        ]);

        if (dailyRes.ok) {
            const data = await dailyRes.json();
            setDailyContents(data.data || []);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    return "Good evening";
  };



  const openDetailModal = (index: number, section: 'verse' | 'devotional' | 'prayer') => {
    setInitialModalIndex(index);
    setInitialModalSection(section);
    setIsDetailModalOpen(true);
  };

  const handleVerseScroll = () => {
    if (verseCarouselRef.current) {
      const scrollLeft = verseCarouselRef.current.scrollLeft;
      const width = verseCarouselRef.current.clientWidth;
      setCurrentVerseSlide(Math.round(scrollLeft / width));
    }
  };

  const handleDevotionScroll = () => {
    if (devotionCarouselRef.current) {
      const scrollLeft = devotionCarouselRef.current.scrollLeft;
      const width = devotionCarouselRef.current.clientWidth;
      setCurrentDevotionSlide(Math.round(scrollLeft / width));
    }
  };

  const scrollToVerseSlide = (index: number) => {
    if (verseCarouselRef.current) {
      const width = verseCarouselRef.current.clientWidth;
      verseCarouselRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    }
  };

  const scrollToDevotionSlide = (index: number) => {
    if (devotionCarouselRef.current) {
      const width = devotionCarouselRef.current.clientWidth;
      devotionCarouselRef.current.scrollTo({ left: width * index, behavior: 'smooth' });
    }
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
        setDailyContents(prev => prev.map(content => {
          if (content._id === contentId) {
             return {
                ...content,
                [type === 'daily-verse' ? 'verseLikeCount' : 'devotionLikeCount']: data.likeCount
             };
          }
          return content;
        }));
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
        setDailyContents(prev => prev.map(content => {
          if (content._id === activeContent.id) {
             const countField = activeContent.type === 'daily-verse' ? 'verseCommentCount' : 'devotionCommentCount';
             return {
                ...content,
                [countField]: (content[countField] || 0) + 1
             };
          }
          return content;
        }));
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

  const handleRouteToChapter = (reference: string) => {
    const match = reference.match(/^(.+?)\s+(\d+):(\d+)/);
    if (match) {
      const book = match[1].toLowerCase().replace(/\s+/g, '-');
      const chapter = match[2];
      const startVerse = match[3];
      router.push(`/bible/${book}/${chapter}?verse=${startVerse}`);
    } else {
      router.push('/bible');
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

      {/* Daily Verse Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-8">
        <div 
          ref={verseCarouselRef}
          onScroll={handleVerseScroll}
          className="flex overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        >
          {dailyContents.map((content, index) => (
            <div key={content._id || index} className="w-full flex-shrink-0 snap-center px-2">
                {/* Daily Verse Card - Figma Design */}
                <div 
                  className={`bg-gradient-to-br ${content.bgColor || 'from-cyan-400 to-teal-500'} rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex flex-col`}
                  style={content.backgroundImage ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  {/* Fallback Overlay if bg image exists */}
                  {content.backgroundImage && <div className="absolute inset-0 bg-black/40" />}
                  
                  {/* Decorative elements */}
                  {!content.backgroundImage && (
                    <>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                    </>
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-white/80 text-sm mb-1">{getRelativeLabel(content.date)}'s Verse</p>
                        <h3 className="text-white text-xl font-bold">{content.verseReference || 'Reference'}</h3>
                        <p className="text-white/90 text-sm">{content.version || 'BBE'}</p>
                      </div>
                    </div>

                    {/* Verse text */}
                    <div className="flex-1 flex items-center my-6">
                      <p className="text-white text-lg leading-relaxed font-serif italic text-justify">
                        "{content.verse || 'Verse text available soon...'}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/20">
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
          
          {dailyContents.length === 0 && (
            <div className="w-full flex-shrink-0 px-2">
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex items-center justify-center text-white">
                <p>No content available yet.</p>
              </div>
            </div>
          )}
        </div>

        {/* Slide indicators */}
        {dailyContents.length > 1 && (
          <div className="flex justify-center space-x-2 mt-2">
            {dailyContents.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToVerseSlide(index)}
                className={`h-2 rounded-full transition-all ${currentVerseSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Daily Devotional Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-6">
        <div 
          ref={devotionCarouselRef}
          onScroll={handleDevotionScroll}
          className="flex overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
        >
          {dailyContents.map((content, index) => (
            <div key={content._id || index} className="w-full flex-shrink-0 snap-center px-2">
                {/* Daily Devotional Card - Figma Design */}
                {content.devotionalTitle ? (
                  <div 
                    className="bg-gradient-to-br from-pink-100 via-rose-100 to-pink-200 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[320px] flex flex-col"
                    style={content.devotionalBackgroundImage ? { backgroundImage: `url(${content.devotionalBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  >
                    {/* Fallback Overlay if bg image exists */}
                    {content.devotionalBackgroundImage ? (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                    ) : (
                      <>
                        <div className="absolute top-0 left-0 w-32 h-32 bg-rose-200/50 rounded-full -ml-16 -mt-16" />
                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-pink-300/50 rounded-full -mr-12 -mb-12" />
                      </>
                    )}

                    <div className="relative z-10 flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className={`text-sm mb-1 ${content.devotionalBackgroundImage ? 'text-white/80' : 'text-gray-600'}`}>{getRelativeLabel(content.date)}'s Devotional</p>
                          <h3 className={`text-xl font-bold ${content.devotionalBackgroundImage ? 'text-white' : 'text-gray-800'}`}>{content.devotionalTitle}</h3>
                          {content.devotionalVerseRef && (
                            <p className={`text-sm mt-1 font-medium ${content.devotionalBackgroundImage ? 'text-white/90' : 'text-rose-600'}`}>{content.devotionalVerseRef}</p>
                          )}
                        </div>
                        {content.audioUrl && (
                          <button
                            onClick={() => toggleAudio(content.audioUrl)}
                            className="p-2 bg-white rounded-full shadow-md hover:scale-110 transition-transform"
                          >
                            {audioPlaying === content.audioUrl ? <Pause className="size-5 text-[var(--color-accent-rose)]" /> : <Play className="size-5 text-[var(--color-accent-rose)] ml-0.5" />}
                          </button>
                        )}
                      </div>

                      <div className="space-y-4 my-6 flex-1">
                        <p className={`leading-relaxed text-justify line-clamp-3 ${content.devotionalBackgroundImage ? 'text-white/90' : 'text-gray-700'}`}>
                          {content.devotionalContent}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className={`flex items-center justify-between pt-4 border-t ${content.devotionalBackgroundImage ? 'border-white/20' : 'border-rose-200'}`}>
                        <button
                          onClick={() => handleLike(content._id, 'daily-devotion')}
                          className={`flex flex-col items-center space-y-1 hover:scale-110 transition-transform ${content.devotionalBackgroundImage ? 'text-white' : 'text-gray-600 hover:text-[var(--color-accent-rose)]'}`}
                        >
                          <div className={`p-2 rounded-full shadow-sm ${content.devotionalBackgroundImage ? 'bg-white/20 backdrop-blur-sm' : 'bg-white'}`}>
                            <Heart className={`size-4 ${content.devotionLikeCount > 0 ? (content.devotionalBackgroundImage ? 'fill-white' : 'fill-[var(--color-accent-rose)] text-[var(--color-accent-rose)]') : ''}`} />
                          </div>
                          <span className="text-xs">{content.devotionLikeCount || 'Like'}</span>
                        </button>
                        <button
                          onClick={() => handleCommentClick(content._id, 'daily-devotion')}
                          className={`flex flex-col items-center space-y-1 hover:scale-110 transition-transform ${content.devotionalBackgroundImage ? 'text-white' : 'text-gray-600 hover:text-[var(--color-accent-rose)]'}`}
                        >
                          <div className={`p-2 rounded-full shadow-sm ${content.devotionalBackgroundImage ? 'bg-white/20 backdrop-blur-sm' : 'bg-white'}`}>
                            <MessageCircle className="size-4" />
                          </div>
                          <span className="text-xs">{content.devotionCommentCount || 'Comment'}</span>
                        </button>
                        <button
                          onClick={() => handleShare(content, 'daily-devotion')}
                          className={`flex flex-col items-center space-y-1 hover:scale-110 transition-transform ${content.devotionalBackgroundImage ? 'text-white' : 'text-gray-600 hover:text-[var(--color-accent-rose)]'}`}
                        >
                          <div className={`p-2 rounded-full shadow-sm ${content.devotionalBackgroundImage ? 'bg-white/20 backdrop-blur-sm' : 'bg-white'}`}>
                            <Share2 className="size-4" />
                          </div>
                          <span className="text-xs">Share</span>
                        </button>
                        <button
                          onClick={() => openDetailModal(index, 'devotional')}
                          className={`flex flex-col items-center space-y-1 hover:scale-110 transition-transform ${content.devotionalBackgroundImage ? 'text-white' : 'text-gray-600 hover:text-[var(--color-accent-rose)]'}`}
                        >
                          <div className={`p-2 rounded-full shadow-sm ${content.devotionalBackgroundImage ? 'bg-white/20 backdrop-blur-sm' : 'bg-white'}`}>
                            <Maximize2 className="size-4" />
                          </div>
                          <span className="text-xs">Expand</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-xl min-h-[320px] flex items-center justify-center text-gray-500">
                    <p>Devotion not available.</p>
                  </div>
                )}
            </div>
          ))}
        </div>

        {/* Slide indicators */}
        {dailyContents.length > 1 && (
          <div className="flex justify-center space-x-2 mt-2">
            {dailyContents.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToDevotionSlide(index)}
                className={`h-2 rounded-full transition-all ${currentDevotionSlide === index ? 'w-8 bg-[var(--color-primary-teal)]' : 'w-2 bg-gray-300'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

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

      <DailyDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        contents={dailyContents}
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
