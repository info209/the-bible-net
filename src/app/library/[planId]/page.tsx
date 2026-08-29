'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, Check, ChevronRight, Info, Share2 } from 'lucide-react';
import { usePlanDetails, useStartPlan, useSavePlan } from '@/hooks/usePlanQueries';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

export default function PlanDetailsOrProgressPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const { data: planData, isLoading, error } = usePlanDetails(planId);
  const startPlanMutation = useStartPlan();
  const savePlanMutation = useSavePlan();

  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-4">
        <div className="flex items-center space-x-3">
          <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-800 rounded-md" />
        </div>
        <div className="w-full aspect-[16/9] rounded-2xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded-md" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-800 rounded-md" />
        </div>
      </div>
    );
  }

  if (error || !planData || !planData.plan) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-gray-500 dark:text-gray-400 font-medium">Plan not found.</p>
        <button
          onClick={() => router.push('/library')}
          className="px-6 py-2 rounded-full bg-[var(--color-primary-teal)] text-white text-sm font-semibold cursor-pointer"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const { plan, progress, status } = planData;
  const isEnrolled = status === 'in-progress' || status === 'completed';
  const isCompleted = status === 'completed';

  // Calculate actual day dates from user start date
  const startDate = progress?.startedAt ? new Date(progress.startedAt) : new Date();

  // Active day selection defaults to currentDay or selectedDayNumber
  const activeDayNumber = selectedDayNumber || (progress?.currentDay || 1);
  const activeDayIndex = Math.max(0, activeDayNumber - 1);
  const currentDayConfig = (plan.days || [])[activeDayIndex] || (plan.days || [])[0];

  // Helper to determine next incomplete item for "Start/Continue reading" CTA
  const getNextIncompleteItem = () => {
    if (!plan.days || plan.days.length === 0) return null;
    const completedItems = progress?.completedItemIds || [];

    for (const day of plan.days) {
      for (const item of day.items || []) {
        if (!completedItems.includes(item.itemId)) {
          return { dayNumber: day.dayNumber, itemId: item.itemId };
        }
      }
    }
    // Fallback to first item of first day
    const firstDay = plan.days[0];
    const firstItem = firstDay?.items?.[0];
    return firstItem ? { dayNumber: firstDay.dayNumber, itemId: firstItem.itemId } : null;
  };

  const handleStartPlan = async () => {
    try {
      setIsStarting(true);
      await startPlanMutation.mutateAsync(plan._id.toString());
      toast.success('Plan started!');
      setSelectedDayNumber(1);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start plan');
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleSave = async () => {
    try {
      await savePlanMutation.mutateAsync(plan._id.toString());
      toast.success(progress?.isSaved ? 'Plan unsaved' : 'Plan saved to Library');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save plan');
    }
  };

  const handlePrimaryCTA = () => {
    if (!isEnrolled) {
      handleStartPlan();
      return;
    }

    if (isCompleted) {
      router.push(`/library/${plan._id}/completed`);
      return;
    }

    const nextItem = getNextIncompleteItem();
    if (nextItem) {
      router.push(`/library/${plan._id}/read/${nextItem.dayNumber}/${nextItem.itemId}`);
    } else if (currentDayConfig?.items?.[0]) {
      router.push(`/library/${plan._id}/read/${activeDayNumber}/${currentDayConfig.items[0].itemId}`);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: plan.title,
        text: plan.description,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Plan link copied to clipboard!');
    }
  };

  // --------------------------------------------------------------------------
  // SCREEN 1: PLAN OVERVIEW BEFORE STARTING (NOT ENROLLED)
  // --------------------------------------------------------------------------
  if (!isEnrolled) {
    return (
      <div className="space-y-6 pb-12">
        {/* Back Arrow Header */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => router.push('/library?tab=find-plans')}
            className="p-2 -ml-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleSave}
              className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Save Plan"
            >
              <Bookmark className={`size-5 ${progress?.isSaved ? 'fill-[var(--color-primary-teal)] text-[var(--color-primary-teal)]' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              aria-label="Share"
            >
              <Share2 className="size-5" />
            </button>
          </div>
        </div>

        {/* Plan Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
          {plan.title}
        </h1>

        {/* Large Cover Image */}
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
          <img
            src={plan.imageUrl || plan.thumbnailUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000'}
            alt={plan.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000');
            }}
          />
        </div>

        {/* Duration */}
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
        </p>

        {/* Primary Pale-Teal CTA Button */}
        <button
          onClick={handleStartPlan}
          disabled={isStarting}
          className="w-full py-3.5 rounded-full bg-[#E6F0F1] dark:bg-[#1E3A3C] text-[var(--color-primary-teal)] dark:text-teal-300 font-bold text-base hover:bg-[#D0E5E7] dark:hover:bg-[#284D4F] active:scale-[0.99] transition-all shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isStarting ? 'Starting plan...' : 'Start this plan'}
        </button>

        {/* About Section */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About</h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {plan.description}
          </p>
          {plan.author && (
            <p className="text-xs text-gray-400 pt-2 font-medium">By {plan.author}</p>
          )}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // SCREEN 2: MY PLAN / DAILY PROGRESS SCREEN (ENROLLED)
  // --------------------------------------------------------------------------
  const completedItemIds = progress?.completedItemIds || [];
  const completedDayNumbers = progress?.completedDayNumbers || [];

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push('/library?tab=my-plans')}
          className="p-2 -ml-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[220px] sm:max-w-md">
          {plan.title}
        </h1>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleShare}
            className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Options"
          >
            <Info className="size-5" />
          </button>
        </div>
      </div>

      {/* Large Rounded Plan Banner */}
      <div className="relative aspect-[21/9] w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
        <img
          src={plan.imageUrl || plan.thumbnailUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000'}
          alt={plan.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000');
          }}
        />
      </div>

      {/* Horizontal Row of Day Cards */}
      <div className="w-full overflow-x-auto scrollbar-none pt-2 pb-3 px-1">
        <div className="flex space-x-3 min-w-max">
          {(plan.days || []).map((day) => {
            const dayNum = day.dayNumber;
            const isDayCompleted = completedDayNumbers.includes(dayNum);
            const isSelected = activeDayNumber === dayNum;
            const dayDate = addDays(startDate, dayNum - 1);
            const dateLabel = format(dayDate, 'MMM d');

            return (
              <button
                key={day.dayId || dayNum}
                onClick={() => setSelectedDayNumber(dayNum)}
                className={`flex flex-col items-center px-4 py-3 rounded-2xl transition-all cursor-pointer select-none min-w-[80px] ${
                  isSelected
                    ? 'bg-[var(--color-primary-teal)] text-white shadow-md border border-transparent'
                    : isDayCompleted
                    ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border border-teal-200 dark:border-teal-800'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold">Day {dayNum}</span>
                  {isDayCompleted && (
                    <Check className={`size-3.5 ${isSelected ? 'text-white' : 'text-teal-600 dark:text-teal-400'}`} />
                  )}
                </div>
                <span className={`text-xs mt-1 font-medium ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                  {dateLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Title & Items Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Day {activeDayNumber} of {plan.duration}
          </h2>
          {currentDayConfig?.title && (
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {currentDayConfig.title}
            </span>
          )}
        </div>

        {/* List of Reading Items for Active Day */}
        <div className="space-y-3">
          {(currentDayConfig?.items || []).map((item) => {
            const isItemCompleted = completedItemIds.includes(item.itemId);

            return (
              <div
                key={item.itemId}
                onClick={() => router.push(`/library/${plan._id}/read/${activeDayNumber}/${item.itemId}`)}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  {/* Circular completion indicator */}
                  <div
                    className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isItemCompleted
                        ? 'bg-[var(--color-primary-teal)] border-[var(--color-primary-teal)] text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {isItemCompleted && <Check className="size-3.5 stroke-[3]" />}
                  </div>

                  {/* Item Title / Scripture Reference */}
                  <span className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors">
                    {item.title || item.scriptureRef || 'Devotional'}
                  </span>
                </div>

                <ChevronRight className="size-5 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Primary CTA */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-black dark:via-black/95 z-30">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handlePrimaryCTA}
            className="w-full py-4 rounded-full bg-[var(--color-primary-teal)] text-white font-bold text-base hover:opacity-95 active:scale-[0.99] transition-all shadow-lg cursor-pointer"
          >
            {isCompleted
              ? 'View Completed Summary'
              : completedItemIds.length > 0
              ? 'Continue reading'
              : 'Start reading'}
          </button>
        </div>
      </div>
    </div>
  );
}
