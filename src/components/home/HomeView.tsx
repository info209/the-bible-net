"use client";

import { Play, User, BookOpen, Globe, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { getRelativeTime } from '@/utils/time';
import HomeSkeleton from '@/app/components/HomeSkeleton';
import { DailyDetailModal } from './DailyDetailModal';

export default function HomeView() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { latestProgress, allProgress, isLoading: progressLoading } = useReadingProgress();
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

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
        const [dailyRes, prayersRes] = await Promise.all([
          fetch('/api/daily?days=7'),
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
  }, []);

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

      {/* Daily Content Carousel (7-Day History) */}
      <div className="relative overflow-hidden mb-6">
        <div className="flex overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide space-x-4">
          {dailyContents.map((content, index) => (
            <div key={content._id} className="w-[85vw] sm:w-[400px] flex-shrink-0 snap-center">
              <div 
                className="rounded-2xl shadow-xl relative overflow-hidden min-h-[420px] flex flex-col bg-cover bg-center cursor-pointer group"
                style={content.backgroundImage ? { backgroundImage: `url(${content.backgroundImage})` } : {}}
                onClick={() => openDetailModal(index, 'verse')}
              >
                {/* Fallback / Overlay */}
                <div className={`absolute inset-0 ${content.backgroundImage ? 'bg-black/40 group-hover:bg-black/30' : 'bg-gradient-to-br from-cyan-600 to-teal-800'} transition-all`} />

                {/* Decorative elements if no background */}
                {!content.backgroundImage && (
                  <>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
                  </>
                )}

                <div className="relative z-10 flex-1 flex flex-col p-6">
                  {/* Top Label */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
                      <p className="text-white text-xs font-bold uppercase tracking-wider">{getRelativeLabel(content.date)}</p>
                    </div>
                  </div>

                  {/* Verse Snippet */}
                  {content.verse ? (
                    <div className="flex-1 flex flex-col justify-center my-2">
                        <p className="text-white/80 text-xs mb-1 font-semibold uppercase tracking-widest">Verse</p>
                        <h3 className="text-white text-lg font-bold mb-2">{content.verseReference}</h3>
                        <p className="text-white text-lg leading-relaxed font-serif italic line-clamp-4">
                        "{content.verse}"
                        </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center my-2">
                        <p className="text-white/60 italic text-sm">Verse available soon...</p>
                    </div>
                  )}

                  {/* Devotional / Prayer Snippet */}
                  <div className="pt-4 border-t border-white/20">
                     {content.devotionalTitle ? (
                         <div className="mb-2">
                             <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider mb-1">Devotional</p>
                             <p className="text-white font-medium line-clamp-1">{content.devotionalTitle}</p>
                         </div>
                     ) : null}
                     {content.prayerTitle && (
                         <div>
                             <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider mb-1">Prayer</p>
                             <p className="text-white/90 text-sm italic line-clamp-1">{content.prayerTitle}</p>
                         </div>
                     )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {dailyContents.length === 0 && (
            <div className="w-full flex-shrink-0">
              <div className="bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[360px] flex items-center justify-center text-white">
                <p>No content available yet.</p>
              </div>
            </div>
          )}
        </div>
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
    </motion.div>
  );
}
