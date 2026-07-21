"use client";

import { Play, MessageCircle, Forward, Pause, X, Send, MoreVertical, Check, Bookmark, BookOpen, Copy } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { useSavedVerses, buildVerseRangeText } from '@/lib/useSavedVerses';
import { getRelativeTime } from '@/utils/time';
import HomeSkeleton from '@/app/components/HomeSkeleton';
import { CarouselCardSkeleton, PrayerSkeleton } from '@/app/components/HomeSkeleton';
import { DailyDetailModal } from './DailyDetailModal';
import { PremiumCarousel } from './PremiumCarousel';
import { LikeButton } from './LikeButton';
import { Avatar, AvatarImage, AvatarFallback } from '@/app/components/ui/avatar';
import verseTexture from '../../../assets/textures/verse-texture.svg';
import devotionalTexture from '../../../assets/textures/devotional-texture.svg';

const getGreetingByHour = (hour: number): string => {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeView() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isLoading: progressLoading } = useReadingProgress();
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Independent slide tracking for each carousel
  const [currentVerseSlide, setCurrentVerseSlide] = useState(0);
  // Tracks which verse card's kebab menu is open (by carousel index)
  const [openVerseKebabIndex, setOpenVerseKebabIndex] = useState<number | null>(null);
  const [openDevotionKebabIndex, setOpenDevotionKebabIndex] = useState<number | null>(null);
  const [currentDevotionSlide, setCurrentDevotionSlide] = useState(0);

  // Saved verses hook
  const { saveVerse, isSaved } = useSavedVerses();

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [activeContent, setActiveContent] = useState<{ id: string, type: 'daily-verse' | 'daily-devotion' } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [sharingStates, setSharingStates] = useState<Set<string>>(new Set());

  const [greeting, setGreeting] = useState('Shalom');

  const userName = useMemo(() => {
    return (session?.user as any)?.firstName || session?.user?.name || 'Believer';
  }, [session]);

  const initials = useMemo(() => {
    if (!session?.user) return 'G';
    const u = session.user as any;
    
    // First, try firstName/lastName
    const first = u.firstName || '';
    const last = u.lastName || '';
    if (first || last) {
      const fChar = first.trim()?.[0] || '';
      const lChar = last.trim()?.[0] || '';
      return `${fChar}${lChar}`.toUpperCase();
    }
    
    // Fallback to name
    const name = u.name || '';
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    
    // Fallback to email
    const email = u.email || '';
    if (email) return email[0].toUpperCase();
    
    return 'G';
  }, [session]);

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreetingByHour(new Date().getHours()));
    };
    updateGreeting();
    // Update every minute to catch timezone/hour changes dynamically
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const queryClient = useQueryClient();
  const preferredVersion = (session?.user as any)?.preferredBibleVersion || 'KJV';
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Query 1: Today only (fast — renders the carousel immediately) ──────────
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['daily-content-today', preferredVersion, todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/daily?days=1&version=${encodeURIComponent(preferredVersion)}`);
      if (!res.ok) throw new Error('Failed to fetch today content');
      const data = await res.json();
      const items = data.data || [];
      items.forEach((item: any) => {
        queryClient.setQueryData(['daily-verse', item.date, preferredVersion], item);
        queryClient.setQueryData(['daily-devotion', item.date, preferredVersion], item);
      });
      return items;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Query 2: Full 7-day history (background — fires after today resolves) ───
  const { data: historyData } = useQuery({
    queryKey: ['daily-content-list', preferredVersion, todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/daily?days=7&version=${encodeURIComponent(preferredVersion)}`);
      if (!res.ok) throw new Error('Failed to fetch daily content');
      const data = await res.json();
      const items = data.data || [];
      items.forEach((item: any) => {
        queryClient.setQueryData(['daily-verse', item.date, preferredVersion], item);
        queryClient.setQueryData(['daily-devotion', item.date, preferredVersion], item);
      });
      return items;
    },
    // Don't start until today's fast query has resolved
    enabled: !todayLoading && !!todayData,
    staleTime: 5 * 60 * 1000,
  });

  // Merge: show today immediately, replace with full history once available
  const dailyContentData = historyData ?? todayData;
  const dailyLoading = todayLoading;

  const dailyVerses = useMemo(() => {
    return (dailyContentData || []).filter((item: any) => item.verseBook && item.verseBook !== 'Unknown');
  }, [dailyContentData]);

  const dailyDevotions = useMemo(() => {
    return (dailyContentData || []).filter((item: any) => item.devotionalTitle && item.devotionalContent);
  }, [dailyContentData]);

  const { data: prayers = [], isLoading: prayersLoading } = useQuery({
    queryKey: ['prayers', 'home'],
    queryFn: async () => {
      const res = await fetch('/api/prayers?limit=3');
      if (!res.ok) throw new Error('Failed to fetch prayers');
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [initialModalIndex, setInitialModalIndex] = useState(0);
  const [initialModalSection, setInitialModalSection] = useState<'verse' | 'devotional' | 'prayer' | undefined>();
  const [modalContents, setModalContents] = useState<any[]>([]);

  // Local cache of devotional progress by date — updated optimistically when modal fires onProgressChange
  const [devotionalProgressCache, setDevotionalProgressCache] = useState<Record<string, 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETED'>>({});

  // Seed cache from API data whenever content refreshes
  useEffect(() => {
    if (!dailyContentData) return;
    const seed: Record<string, 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETED'> = {};
    for (const item of dailyContentData) {
      if (item.devotionalProgress?.status) {
        seed[item.date] = item.devotionalProgress.status;
      }
    }
    setDevotionalProgressCache(prev => ({ ...seed, ...prev }));
  }, [dailyContentData]);

  // Called by DailyDetailModal when user completes a devotional — updates Home carousel badge immediately
  const handleProgressChange = (date: string, status: 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETED') => {
    setDevotionalProgressCache(prev => ({ ...prev, [date]: status }));
  };

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
        
        queryClient.setQueryData(['daily-content-list', preferredVersion, todayStr], (prev: any[] | undefined) => {
          if (!prev) return prev;
          return prev.map(content => {
            if (content._id === activeContent.id) {
              const countField = activeContent.type === 'daily-verse' ? 'verseCommentCount' : 'devotionCommentCount';
              const updatedItem = {
                ...content,
                [countField]: (content[countField] || 0) + 1
              };
              queryClient.setQueryData(['daily-verse', content.date, preferredVersion], updatedItem);
              queryClient.setQueryData(['daily-devotion', content.date, preferredVersion], updatedItem);
              return updatedItem;
            }
            return content;
          });
        });
      }
    } catch (error) {
      console.error('Add comment error:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async (content: any, type: 'daily-verse' | 'daily-devotion') => {
    const shareKey = `${content._id}-${type}`;
    if (sharingStates.has(shareKey)) return;

    const url = `${window.location.origin}/share/${type.replace('daily-', '')}/${content._id}`;
    const text = type === 'daily-verse'
      ? `Check out this verse: ${content.verseReference} - "${content.verse}"`
      : `Check out this devotional: "${content.devotionalTitle}"`;

    let sharedSuccessfully = false;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'The Bible Net', text, url });
        sharedSuccessfully = true;
      } catch (error) {
        console.log('Share failed', error);
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success('Link copied to clipboard!');
      sharedSuccessfully = true;
    }

    if (sharedSuccessfully) {
      try {
        setSharingStates(prev => new Set(prev).add(shareKey));
        const res = await fetch('/api/interactions/share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: content.date, type })
        });

        if (res.ok) {
          const data = await res.json();
          queryClient.setQueryData(['daily-content-list', preferredVersion, todayStr], (prev: any[] | undefined) => {
            if (!prev) return prev;
            return prev.map(c => {
              if (c._id === content._id) {
                const countField = type === 'daily-verse' ? 'verseShareCount' : 'devotionShareCount';
                const updatedItem = {
                  ...c,
                  [countField]: data.shareCount
                };
                queryClient.setQueryData(['daily-verse', c.date, preferredVersion], updatedItem);
                queryClient.setQueryData(['daily-devotion', c.date, preferredVersion], updatedItem);
                return updatedItem;
              }
              return c;
            });
          });
        }
      } catch (error) {
        console.error('Error tracking share:', error);
      } finally {
        setSharingStates(prev => {
          const next = new Set(prev);
          next.delete(shareKey);
          return next;
        });
      }
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
        queryClient.setQueryData(['prayers', 'home'], (prev: any[] | undefined) => {
          if (!prev) return prev;
          return prev.map(p => p._id === prayerId ? updatedPrayer : p);
        });
      }
    } catch (error) {
      console.error('Intercession error:', error);
    }
  };

  // No full-page gate — each section renders its own skeleton independently

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

  // Ordinal date label for the verse banner (feature #2)
  const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const formatVerseLabel = (dateStr: string): string => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === yesterdayStr) return 'Yesterday';

    const d = new Date(dateStr);
    const dayOfWeek = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month}`;
  };

  // Navigate to Bible reader at the exact verse context (feature #7)
  const handleReadFullChapter = (content: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenVerseKebabIndex(null);
    const version = encodeURIComponent(content.version || preferredVersion);
    const book    = encodeURIComponent(content.verseBook || '');
    const chapter = encodeURIComponent(content.verseChapter || '');
    const verse   = encodeURIComponent(content.verseNumber || '');
    router.push(`/bible?version=${version}&book=${book}&chapter=${chapter}&verse=${verse}`);
  };

  // Save daily verse to saved page
  const handleSaveVerse = async (content: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenVerseKebabIndex(null);
    setOpenDevotionKebabIndex(null);

    if (!session) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
      return;
    }

    try {
      const bookId   = content.verseBook || '';
      const bookName = content.verseBook || '';
      const chapter  = Number(content.verseChapter) || 1;
      const verseNum = Number(content.verseNumber) || 1;
      const verses   = [verseNum];
      const verseRangeText = buildVerseRangeText(bookName, chapter, verses);
      const version  = content.version || preferredVersion;

      await saveVerse({ bookId, bookName, chapter, verses, verseRangeText, version });
      toast.success('Verse saved! View in your Saved page.');
    } catch (err) {
      toast.error('Failed to save verse.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 pt-0 pb-6 bg-transparent min-h-full px-0 overflow-hidden"
    >
      {/* Greeting - Figma Style */}
      <div className="flex items-center gap-3.5 animate-fade-in px-4 mt-0.5">
        <Avatar className="w-12 h-12 shrink-0">
          {session?.user?.image && (
            <AvatarImage
              src={session.user.image}
              alt={userName}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-[#53b1b9] text-white font-bold text-lg select-none">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <span className="text-gray-500 text-[15px] font-normal leading-tight">{greeting},</span>
          <span className="truncate block max-w-full text-gray-900 text-[21px] font-bold leading-tight">
            {userName}
          </span>
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
        {dailyLoading && dailyVerses.length === 0 ? (
          <CarouselCardSkeleton />
        ) : dailyVerses.length > 0 ? (
          <PremiumCarousel
            activeIndex={currentVerseSlide}
            onChange={setCurrentVerseSlide}
            ariaLabel="Daily Verse Carousel"
          >
            {dailyVerses.map((content: any, index: number) => (
              <div key={content._id || index} className="w-full flex-shrink-0 select-none">
                {/* Daily Verse Card — tap anywhere to expand, consistent banner height */}
                <div
                  className="rounded-none p-6 shadow-xl relative overflow-hidden h-[355px] flex flex-col cursor-pointer"
                  style={content.backgroundImage
                    ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { backgroundImage: `url(${verseTexture.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  }
                  onClick={() => openDetailModal(index, 'verse')}
                >
                  {/* Consistent light overlay - only for default linear gradients */}
                  {!content.backgroundImage && (
                    <div className="absolute inset-0" />
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col h-full justify-between">
                    {/* Header row: label */}
                    <div className="w-full">
                      <div className="text-center w-full">
                        <p className="text-black/90 text-[15px] font-semibold mb-2.5">
                          {formatVerseLabel(content.date)}
                        </p>
                        
                        {/* Slide indicators inside the card */}
                        {dailyVerses.length > 1 && (
                          <div className="flex justify-center space-x-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
                            {dailyVerses.map((_: any, displayPos: number) => {
                              const dataIndex = dailyVerses.length - 1 - displayPos;
                              return (
                                  <button
                                    key={displayPos}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentVerseSlide(dataIndex);
                                    }}
                                    className={`h-1.5 rounded-full transition-all ${index === dataIndex ? 'w-6 bg-black' : 'w-1.5 bg-black/40 hover:bg-black/60'}`}
                                    aria-label={`Go to slide ${dataIndex + 1}`}
                                  />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <h4 className="text-black/80 text-xs tracking-wider mb-0.5">Daily verse</h4>
                        <h3 className="text-black text-lg font-bold tracking-tight truncate">
                          {content.verseReference || 'Reference'} {content.version || 'KJV'}
                        </h3>
                      </div>
                    </div>

                    {/* Verse text — clamped to 4 lines; card height stays constant */}
                    <div className="flex-1 flex flex-col justify-start mt-4 overflow-hidden">
                      <p className="text-black text-[16px] md:text-[18px] leading-relaxed text-left pl-1 line-clamp-4 overflow-hidden text-ellipsis w-full">
                        {(() => {
                          const verseNumber = content.verseNumber || content.verseReference?.split(':')?.[1]?.trim();
                          return verseNumber ? (
                            <span className="text-[var(--color-accent-rose)] font-sans font-bold not-italic mr-1.5 text-[16px] md:text-[18px] align-middle">
                              {verseNumber}
                            </span>
                          ) : null;
                        })()}
                        &quot;{content.verse || 'Verse text available soon...'}&quot;
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center justify-between pt-3 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LikeButton
                        contentId={content._id}
                        contentType="daily-verse"
                        initialLiked={content.isVerseLiked}
                        initialCount={content.verseLikeCount}
                        variant="carousel"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(content._id, 'daily-verse'); }}
                        className="flex flex-col items-center space-y-1 text-black md:hover:scale-110 active:scale-95 transition-all"
                      >
                        <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                          <MessageCircle className="size-4 text-black" />
                        </div>
                        <span className="text-xs">{content.verseCommentCount || 'Comment'}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(content, 'daily-verse'); }}
                        className={`flex flex-col items-center space-y-1 text-black transition-all ${sharingStates.has(`${content._id}-daily-verse`) ? 'opacity-50 cursor-not-allowed' : 'md:hover:scale-110 active:scale-95'}`}
                        disabled={sharingStates.has(`${content._id}-daily-verse`)}
                      >
                        <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                          <Forward className="size-4 text-black" />
                        </div>
                        <span className="text-xs">{content.verseShareCount > 0 ? content.verseShareCount : 'Share'}</span>
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenVerseKebabIndex(openVerseKebabIndex === index ? null : index);
                          }}
                          className="flex flex-col items-center space-y-1 text-black md:hover:scale-110 active:scale-95 transition-all"
                        >
                          <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                            <MoreVertical className="size-4 text-black" />
                          </div>
                          <span className="text-xs">More</span>
                        </button>
                        {openVerseKebabIndex === index && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={(e) => { e.stopPropagation(); setOpenVerseKebabIndex(null); }}
                            />
                            <div className="absolute right-0 bottom-full mb-2 z-20 w-48 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                              <button
                                onClick={(e) => handleReadFullChapter(content, e)}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                                Read chapter
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenVerseKebabIndex(null);
                                  if (content.verse) {
                                    navigator.clipboard.writeText(content.verse)
                                      .then(() => toast.success('Verse text copied to clipboard!'))
                                      .catch((err) => {
                                        console.error('Failed to copy text:', err);
                                        toast.error('Failed to copy text.');
                                      });
                                  }
                                }}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100 flex items-center gap-2"
                              >
                                <Copy className="w-3.5 h-3.5 text-gray-500" />
                                Copy verse
                              </button>
                              <button
                                onClick={(e) => handleSaveVerse(content, e)}
                                className="w-full text-left px-4 py-3 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-[#0B7A81]" />
                                <span className="text-gray-800">
                                  {isSaved(content.verseBook || '', Number(content.verseChapter) || 1, [Number(content.verseNumber) || 1]) ? 'Saved' : 'Save verse'}
                                </span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </PremiumCarousel>
        ) : (
          <div className="w-full rounded-2xl overflow-hidden shadow-xl relative h-[395px] flex items-center justify-center text-black" style={{ backgroundImage: `url(${verseTexture.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0" />
            <p className="relative z-10 font-medium">No daily verses available yet.</p>
          </div>
        )}
      </div>

      {/* Daily Devotional Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-6 w-full">
        {dailyLoading && dailyDevotions.length === 0 ? (
          <CarouselCardSkeleton />
        ) : dailyDevotions.length > 0 ? (
          <PremiumCarousel
            activeIndex={currentDevotionSlide}
            onChange={setCurrentDevotionSlide}
            ariaLabel="Daily Devotional Carousel"
          >
            {dailyDevotions.map((content: any, index: number) => (
              <div key={content._id || index} className="w-full flex-shrink-0 select-none">
                {/* Daily Devotional Card — tap anywhere to expand, consistent banner height */}
                <div
                  className="rounded-none p-6 shadow-xl relative overflow-hidden h-[355px] flex flex-col cursor-pointer"
                  style={content.devotionalBackgroundImage
                    ? { backgroundImage: `url(${content.devotionalBackgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : content.backgroundImage
                      ? { backgroundImage: `url(${content.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { backgroundImage: `url(${devotionalTexture.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  }
                  onClick={() => openDetailModal(index, 'devotional')}
                >
                  {/* Consistent light overlay - only for default linear gradients */}
                  {!(content.devotionalBackgroundImage || content.backgroundImage) && (
                    <div className="absolute inset-0" />
                  )}

                  {/* Content */}
                  <div className="relative z-10 flex-1 flex flex-col h-full justify-between">
                    {/* Header row: label + indicators */}
                    <div className="w-full">
                      <div className="text-center w-full">
                        <p className="text-black/90 text-[15px] font-semibold mb-2.5">
                          {formatVerseLabel(content.date)}
                        </p>

                        {/* Slide indicators inside the card */}
                        {dailyDevotions.length > 1 && (
                          <div className="flex justify-center space-x-1.5 mb-2" onClick={(e) => e.stopPropagation()}>
                            {dailyDevotions.map((_: any, displayPos: number) => {
                              const dataIndex = dailyDevotions.length - 1 - displayPos;
                              return (
                                  <button
                                    key={displayPos}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentDevotionSlide(dataIndex);
                                    }}
                                    className={`h-1.5 rounded-full transition-all ${index === dataIndex ? 'w-6 bg-black' : 'w-1.5 bg-black/40 hover:bg-black/60'}`}
                                    aria-label={`Go to slide ${dataIndex + 1}`}
                                  />
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        <h4 className="text-black/80 text-xs tracking-wider mb-0.5">Daily devotional</h4>
                        <h3 className="text-black text-lg font-bold tracking-tight truncate">
                          {content.devotionalTitle}
                        </h3>
                        {content.devotionalVerseRef && (
                          <p className="text-xs mt-0.5 font-semibold text-black/80 truncate">
                            {content.devotionalVerseRef}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Devotional content preview — clamped to 4 lines; card height stays constant */}
                    <div className="flex-1 flex flex-col justify-start mt-4 overflow-hidden">
                      <p className="text-black text-[16px] md:text-[18px] leading-relaxed pl-1 text-left line-clamp-4 overflow-hidden text-ellipsis w-full">
                        {content.devotionalContent}
                      </p>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center justify-between pt-3 relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LikeButton
                        contentId={content._id}
                        contentType="daily-devotion"
                        initialLiked={content.isDevotionLiked}
                        initialCount={content.devotionLikeCount}
                        variant="carousel"
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCommentClick(content._id, 'daily-devotion'); }}
                        className="flex flex-col items-center space-y-1 text-black md:hover:scale-110 active:scale-95 transition-all"
                      >
                        <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                          <MessageCircle className="size-4 text-black" />
                        </div>
                        <span className="text-xs">{content.devotionCommentCount || 'Comment'}</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShare(content, 'daily-devotion'); }}
                        className={`flex flex-col items-center space-y-1 text-black transition-all ${sharingStates.has(`${content._id}-daily-devotion`) ? 'opacity-50 cursor-not-allowed' : 'md:hover:scale-110 active:scale-95'}`}
                        disabled={sharingStates.has(`${content._id}-daily-devotion`)}
                      >
                        <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                          <Forward className="size-4 text-black" />
                        </div>
                        <span className="text-xs">{content.devotionShareCount > 0 ? content.devotionShareCount : 'Share'}</span>
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDevotionKebabIndex(openDevotionKebabIndex === index ? null : index);
                          }}
                          className="flex flex-col items-center space-y-1 text-black md:hover:scale-110 active:scale-95 transition-all"
                        >
                          <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                            <MoreVertical className="size-4 text-black" />
                          </div>
                          <span className="text-xs">More</span>
                        </button>
                        {openDevotionKebabIndex === index && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={(e) => { e.stopPropagation(); setOpenDevotionKebabIndex(null); }}
                            />
                            <div className="absolute right-0 bottom-full mb-2 z-20 w-48 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                              <button
                                onClick={() => openDetailModal(index, 'devotional')}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
                              >
                                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                                Read devotional
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                      {content.audioUrl && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAudio(content.audioUrl); }}
                          className="flex flex-col items-center space-y-1 text-black md:hover:scale-110 active:scale-95 transition-all"
                        >
                          <div className="bg-black/15 backdrop-blur-sm p-2 rounded-full">
                            {audioPlaying === content.audioUrl ? <Pause className="size-4 text-black" /> : <Play className="size-4 ml-0.5 text-black" />}
                          </div>
                          <span className="text-xs">Listen</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </PremiumCarousel>
        ) : (
          <div className="w-full rounded-2xl overflow-hidden shadow-xl relative h-[395px] flex items-center justify-center text-black" style={{ backgroundImage: `url(${devotionalTexture.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0" />
            <p className="relative z-10 font-medium">No daily devotionals available yet.</p>
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
      <div
        onClick={() => router.push('/journals')}
        className="relative overflow-hidden p-6 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-between group min-h-[120px] w-full"
        style={{ borderRadius: 'var(--radius-md)', backgroundImage: 'url(/banner_journal_and_prayers.svg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* Consistent dark overlay to ensure readability */}
        <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/30" />

        <div className="relative z-10 flex items-center space-x-4">
          <div className="bg-white/20 backdrop-blur-md p-3.5 rounded-xl group-hover:scale-110 transition-transform">
            <span className="text-3xl select-none">✍️</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-teal-200 transition-colors">
              Journals & Prayers
            </h3>
            <p className="text-xs text-white/95 mt-1 max-w-[240px] sm:max-w-md">
              Write journals, keep track of personal prayers, checklist notes, and voice recordings.
            </p>
          </div>
        </div>
        <div className="relative z-10 text-white text-xl font-bold transition-transform group-hover:translate-x-1 p-2 bg-white/20 rounded-full backdrop-blur-sm size-10 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </div>

      {/* Community Prayer Wall - Figma Design */}
      <div className="relative overflow-hidden w-full" style={{ borderRadius: 'var(--radius-md)' }}>
        {prayersLoading ? (
          <PrayerSkeleton />
        ) : (
          <div className="bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Community Prayer Requests</h3>
            <div className="space-y-3">
              {prayers.length === 0 ? (
                <div className="bg-white/50 rounded-lg p-8 text-center text-gray-500 italic">
                  No public prayer requests yet.
                </div>
              ) : (
                prayers.map((request: any) => (
                  <div key={request._id} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 hover:bg-white transition-colors">
                    <div className="flex items-start space-x-3">
                      {!request.anonymous && request.userId?.image ? (
                        <img
                          src={request.userId.image}
                          alt={request.userId.firstName || 'User'}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold uppercase text-xs">
                          {request.anonymous 
                            ? 'A' 
                            : request.userId 
                              ? `${request.userId.firstName?.[0] || ''}${request.userId.lastName?.[0] || ''}`.toUpperCase() || 'U'
                              : 'U'
                          }
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-800">
                            {request.anonymous 
                              ? 'Anonymous' 
                              : `${request.userId?.firstName || 'User'}${request.userId?.lastName?.[0] ? ' ' + request.userId.lastName[0] + '.' : ''}`
                            }
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
        )}
      </div>


      {/* Footer Section - Figma Replica */}
      <footer className="w-full bg-white border-t border-gray-100/80 mt-12 py-10 px-6 flex flex-col items-center select-none">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo.svg" alt="The Bible Net" width={140} height={54} className="object-contain select-none" />
        </div>

        {/* Paragraph Text */}
        <p className="text-gray-500 text-sm leading-relaxed text-center max-w-sm mb-8 px-2 font-normal">
          Helping you discover God's truth and deepen your faith daily.
        </p>

        {/* Links Grid */}
        {/* <div className="grid grid-cols-2 gap-x-12 gap-y-3.5 text-sm text-gray-400 font-medium mb-10 w-full max-w-[280px]">
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
        </div> */}

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
        onClose={(finalIndex) => {
          setIsDetailModalOpen(false);
          if (finalIndex !== undefined) {
            if (initialModalSection === 'verse') {
              setCurrentVerseSlide(finalIndex);
            } else if (initialModalSection === 'devotional') {
              setCurrentDevotionSlide(finalIndex);
            }
          }
        }}
        contents={modalContents}
        initialIndex={initialModalIndex}
        initialSection={initialModalSection}
        onCommentClick={handleCommentClick}
        onShareClick={handleShare}
        onReadFullChapter={(content) => handleReadFullChapter(content, { stopPropagation: () => {} } as any)}
        onProgressChange={handleProgressChange}
      />

      {/* Comment Modal - Restored */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-t-[32px] sm:rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl [&>[data-slot=dialog-close]]:hidden flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-white dark:bg-zinc-950 border-slate-100 dark:border-zinc-800 space-y-0">
            <div className="flex flex-col">
              <DialogTitle className="font-bold text-slate-900 dark:text-slate-100">Comments</DialogTitle>
              <DialogDescription className="sr-only">View and add comments for this content</DialogDescription>
            </div>
            <button
              onClick={() => setShowCommentModal(false)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            >
              <X className="size-5 text-gray-500" />
            </button>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-[300px] bg-slate-50/50 dark:bg-zinc-900/50">
            <div className="p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <MessageCircle className="size-12 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No comments yet. Be the first!</p>
                </div>
              ) : (
                comments.map((comment, i) => (
                  <div key={i} className="flex space-x-3 group">
                    <div className="size-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                      {comment.userId?.image ? (
                        <img src={comment.userId.image} alt={comment.userId?.firstName || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="size-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs uppercase">
                          {comment.userId?.firstName?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-xl rounded-tl-none p-3 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-zinc-800/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-extrabold text-xs text-slate-900 dark:text-slate-200">
                          {comment.userId?.firstName} {comment.userId?.lastName}
                        </p>
                        <span className="text-[10px] font-bold text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-350 leading-relaxed">{comment.commentText}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white dark:bg-zinc-950 border-slate-100 dark:border-zinc-800">
            <div className="flex items-end space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl p-3 text-[16px] md:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/40 resize-none transition-all placeholder:text-gray-400 dark:text-slate-100"
                rows={2}
              />
              <button
                onClick={handleAddComment}
                disabled={submittingComment || !newComment.trim()}
                className="bg-[var(--color-primary-teal)] text-white p-3 rounded-xl disabled:opacity-50 hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center shrink-0"
              >
                {submittingComment ? (
                  <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <Send className="size-5" />
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
