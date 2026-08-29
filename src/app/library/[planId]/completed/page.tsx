'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, CheckCircle2 } from 'lucide-react';
import { usePlanDetails, useRelatedPlans, useRatePlan } from '@/hooks/usePlanQueries';
import StarRating from '@/app/components/library/StarRating';
import { toast } from 'sonner';

export default function PlanCompletedPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.planId as string;

  const { data: planData, isLoading } = usePlanDetails(planId);
  const { data: relatedPlans = [] } = useRelatedPlans(planId);

  const ratePlanMutation = useRatePlan();
  const [userRating, setUserRating] = useState<number>(0);

  const plan = planData?.plan;
  const progress = planData?.progress;
  const initialRating = progress?.rating || 0;

  const handleRate = async (rating: number) => {
    try {
      setUserRating(rating);
      await ratePlanMutation.mutateAsync({
        planId,
        rating,
      });
      toast.success('Thank you for rating this plan!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit rating');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `I completed ${plan?.title}!`,
        text: `I just finished reading ${plan?.title} on The Bible Net!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (isLoading || !plan) {
    return (
      <div className="py-20 text-center space-y-4 animate-pulse">
        <div className="size-16 rounded-full bg-gray-200 dark:bg-gray-800 mx-auto" />
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-800 rounded-md mx-auto" />
        <div className="h-48 w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => router.push('/library?tab=completed')}
          className="p-2 -ml-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Back to Library"
        >
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
          Plan completed
        </h1>
        <button
          onClick={handleShare}
          className="p-2 rounded-full text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Share completion"
        >
          <Share2 className="size-5" />
        </button>
      </div>

      {/* Completion Badge & Large Rounded Banner */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400">
          <CheckCircle2 className="size-10 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
          {plan.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You completed all {plan.duration} days of this reading plan!
        </p>

        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg mt-4">
          <img
            src={plan.imageUrl || plan.thumbnailUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000'}
            alt={plan.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=1000');
            }}
          />
        </div>
      </div>

      {/* Rate the Plan Section */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 text-center space-y-3 border border-gray-100 dark:border-gray-800 shadow-xs">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Rate the plan
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          How did this reading plan impact your faith journey?
        </p>
        <div className="flex justify-center pt-2">
          <StarRating
            initialRating={userRating || initialRating}
            onRate={handleRate}
          />
        </div>
      </div>

      {/* Related Plans Section */}
      {relatedPlans.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
            Related plans
          </h3>

          <div className="w-full overflow-x-auto scrollbar-none py-2">
            <div className="flex space-x-4 min-w-max">
              {relatedPlans.map((relPlan) => (
                <div
                  key={relPlan._id?.toString()}
                  onClick={() => router.push(`/library/${relPlan._id}`)}
                  className="w-48 group cursor-pointer space-y-2 select-none active:scale-[0.98] transition-transform"
                >
                  <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-xs relative">
                    <img
                      src={relPlan.thumbnailUrl || relPlan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400'}
                      alt={relPlan.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400');
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400">
                      {relPlan.duration} {relPlan.duration === 1 ? 'day' : 'days'}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors">
                      {relPlan.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
