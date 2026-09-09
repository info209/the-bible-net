'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Share2,
  Type,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { usePlanDetails, usePlanScripture, useCompleteItem } from '@/hooks/usePlanQueries';
import FontsSettingsModal from '@/app/components/FontsSettingsModal';
import { toast } from 'sonner';
import { shareVerse } from '@/utils/verseFormatter';

export default function ReadingExperiencePage() {
  const params = useParams();
  const router = useRouter();

  const planId = params.planId as string;
  const dayNumber = parseInt(params.dayNumber as string, 10);
  const itemId = params.itemId as string;

  const { data: planData, isLoading } = usePlanDetails(planId);
  const completeItemMutation = useCompleteItem();

  // Font settings state
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(18);
  const [selectedFont, setSelectedFont] = useState<string>('Georgia');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');

  // TTS / Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const plan = planData?.plan;
  const progress = planData?.progress;

  // Find target day and target item
  const currentDay = (plan?.days || []).find((d) => d.dayNumber === dayNumber) || (plan?.days || [])[0];
  const currentItem = (currentDay?.items || []).find((i) => i.itemId === itemId) || (currentDay?.items || [])[0];

  const isScripture = currentItem?.type === 'scripture';
  const scriptureRef = currentItem?.scriptureRef;
  const bibleVersion = currentItem?.bibleVersion || 'NIV';

  // Fetch scripture text if item is scripture
  const { data: scriptureData, isLoading: isLoadingScripture } = usePlanScripture(
    planId,
    isScripture ? scriptureRef : undefined,
    bibleVersion
  );

  // Flatten all items across all days to support prev/next navigation
  const allPlanItems: Array<{ dayNumber: number; itemId: string; title: string; type: string }> = [];
  (plan?.days || []).forEach((day) => {
    (day.items || []).forEach((item) => {
      allPlanItems.push({
        dayNumber: day.dayNumber,
        itemId: item.itemId,
        title: item.title || item.scriptureRef || 'Item',
        type: item.type,
      });
    });
  });

  const currentItemIndex = allPlanItems.findIndex(
    (i) => i.dayNumber === dayNumber && i.itemId === itemId
  );
  const prevItem = currentItemIndex > 0 ? allPlanItems[currentItemIndex - 1] : null;
  const nextItem = currentItemIndex >= 0 && currentItemIndex < allPlanItems.length - 1 ? allPlanItems[currentItemIndex + 1] : null;
  const isFinalPlanItem = currentItemIndex === allPlanItems.length - 1;

  // Stop speech when unmounting or navigating
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [itemId]);

  const toggleAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast.error('Audio playback is not supported on this browser');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      const textToSpeak = isScripture
        ? scriptureData?.fullText || currentItem?.title || ''
        : `${currentItem?.title || ''}. ${currentItem?.devotionalText || ''}`;

      if (!textToSpeak) return;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleShare = async () => {
    if (isScripture) {
      await shareVerse({
        verseText: scriptureData?.fullText,
        reference: scriptureRef || currentItem?.title,
        version: bibleVersion,
        customUrl: window.location.href,
        title: `${plan?.title} - ${currentItem?.title || 'Day ' + dayNumber}`,
      });
      return;
    }

    if (navigator.share) {
      navigator.share({
        title: `${plan?.title} - ${currentItem?.title || 'Day ' + dayNumber}`,
        text: currentItem?.devotionalText,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const handleNextOrComplete = async () => {
    if (isCompleting) return;
    try {
      setIsCompleting(true);
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }

      // Mark current item complete
      const updatedProg = await completeItemMutation.mutateAsync({
        planId,
        dayNumber,
        itemId,
      });

      // Check if plan is newly completed or next item exists
      if (updatedProg?.data?.status === 'completed' || isFinalPlanItem) {
        toast.success('🎉 Congratulations! You completed the plan!');
        router.push(`/library/${planId}/completed`);
        return;
      }

      if (nextItem) {
        router.push(`/library/${planId}/read/${nextItem.dayNumber}/${nextItem.itemId}`);
      } else {
        router.push(`/library/${planId}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update progress');
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePrev = () => {
    if (prevItem) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      }
      router.push(`/library/${planId}/read/${prevItem.dayNumber}/${prevItem.itemId}`);
    }
  };

  if (isLoading || !plan || !currentItem) {
    return (
      <div className="py-20 text-center space-y-4 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-md mx-auto" />
        <div className="h-40 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded-md mx-auto" />
      </div>
    );
  }

  // Theme styling mapping
  const themeClasses = {
    light: 'bg-white text-gray-900',
    sepia: 'bg-[#F7EFED] text-[#5c4a3a]',
    cream: 'bg-[#FEF6EB] text-[#4a3f2a]',
    dark: 'bg-[#1c1c1e] text-gray-100',
  }[selectedTheme];

  return (
    <div className={`min-h-screen ${themeClasses} transition-colors duration-300 pb-32 -mx-4 -mt-20 pt-20 px-4 sm:px-6`}>
      {/* Header */}
      <div className="sticky top-0 z-30 pt-3 pb-3 flex items-center justify-between border-b border-gray-200/40 dark:border-gray-800/40 backdrop-blur-md">
        <button
          onClick={() => router.push(`/library/${planId}`)}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Back to Plan"
        >
          <ArrowLeft className="size-6" />
        </button>

        <div className="text-center min-w-0 px-2 flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
            {plan.title}
          </p>
          <h2 className="text-sm font-bold truncate">
            Day {dayNumber}
          </h2>
        </div>

        <div className="flex items-center space-x-1">
          {/* Scripture version pill or Font settings toggle */}
          {isScripture ? (
            <span className="px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900/60 text-[var(--color-primary-teal)] dark:text-teal-300 font-bold text-xs">
              {bibleVersion}
            </span>
          ) : (
            <button
              onClick={() => setIsFontModalOpen(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Font Settings"
            >
              <Type className="size-5" />
            </button>
          )}

          <button
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Share"
          >
            <Share2 className="size-5" />
          </button>
        </div>
      </div>

      {/* Reading Content */}
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        {/* Title */}
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-primary-teal)]">
            {isScripture ? 'Scripture Reading' : 'Devotional'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currentItem.title || (isScripture ? scriptureRef : 'Devotional')}
          </h1>
        </div>

        {/* Optional Media Image for Devotional */}
        {!isScripture && (currentItem.mediaUrl || plan.imageUrl) && (
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md bg-gray-100 dark:bg-gray-800">
            <img
              src={currentItem.mediaUrl || plan.imageUrl}
              alt={currentItem.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Scripture / Devotional Body */}
        <div
          style={{ fontSize: `${fontSize}px`, fontFamily: selectedFont }}
          className="leading-relaxed space-y-4 pt-2"
        >
          {isScripture ? (
            isLoadingScripture ? (
              <div className="py-8 text-center text-sm opacity-60 animate-pulse">
                Loading scripture text...
              </div>
            ) : scriptureData?.passages ? (
              <div className="space-y-4">
                {scriptureData.passages.map((passage: any, idx: number) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-xs font-bold opacity-60">{passage.refString}</p>
                    <p className="text-lg leading-loose">{passage.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base italic opacity-80">{scriptureRef}</p>
            )
          ) : (
            <div className="whitespace-pre-line">
              {currentItem.devotionalText || 'No devotional content available for this day.'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Reading Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-black/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Audio TTS Toggle */}
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              isPlayingAudio
                ? 'bg-rose-500 text-white shadow-md animate-pulse'
                : 'bg-teal-50 dark:bg-teal-950 text-[var(--color-primary-teal)] dark:text-teal-300 hover:bg-teal-100'
            }`}
            aria-label={isPlayingAudio ? 'Pause Audio' : 'Play Audio Narration'}
          >
            {isPlayingAudio ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
          </button>

          {/* Nav Controls: Prev | Current Label | Next / Complete */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrev}
              disabled={!prevItem}
              className="p-2.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Previous Item"
            >
              <ChevronLeft className="size-5" />
            </button>

            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 max-w-[120px] truncate text-center">
              {currentItem.title || (isScripture ? 'Scripture' : 'Devotional')}
            </span>

            <button
              onClick={handleNextOrComplete}
              disabled={isCompleting}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full font-bold text-sm text-white shadow-md transition-all cursor-pointer ${
                isFinalPlanItem
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-[var(--color-primary-teal)] hover:opacity-95'
              }`}
            >
              <span>{isCompleting ? 'Saving...' : isFinalPlanItem ? 'Complete Plan' : 'Next'}</span>
              {isFinalPlanItem ? <Check className="size-4 stroke-[3]" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Font & Theme Settings Modal */}
      <FontsSettingsModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
      />
    </div>
  );
}
