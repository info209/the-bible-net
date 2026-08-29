'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plan } from '@/types/plan';

interface FindPlansViewProps {
  plans: Plan[];
  isLoading: boolean;
  onStartPlan: (planId: string, e: React.MouseEvent) => void;
  isStartingPlanId?: string | null;
}

export default function FindPlansView({
  plans,
  isLoading,
  onStartPlan,
  isStartingPlanId,
}: FindPlansViewProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Banner Skeleton */}
        <div className="w-full h-48 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        {/* Compact List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-2">
              <div className="size-16 rounded-xl bg-gray-200 dark:bg-gray-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded-sm" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded-sm" />
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          No plans under Find plans
        </p>
      </div>
    );
  }

  // First 2 plans rendered as Discovery Cards (large landscape banner)
  const featuredPlans = plans.slice(0, 2);
  // Remaining plans rendered as Compact Plan Rows
  const compactPlans = plans.slice(2);

  return (
    <div className="space-y-8 pb-8">
      {/* Featured / Discovery Cards */}
      {featuredPlans.length > 0 && (
        <div className="space-y-6">
          {featuredPlans.map((plan) => (
            <div
              key={plan._id?.toString() || plan.title}
              onClick={() => router.push(`/library/${plan._id}`)}
              className="group cursor-pointer space-y-2 transition-transform active:scale-[0.99]"
            >
              {/* Large landscape rounded banner image */}
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md bg-gray-100 dark:bg-gray-800">
                <img
                  src={plan.imageUrl || plan.thumbnailUrl || '/images/default-plan-banner.jpg'}
                  alt={plan.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=800');
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
              </div>
              {/* Duration & Title below image */}
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                </p>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[var(--color-primary-teal)] transition-colors line-clamp-2">
                  {plan.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compact Plan Rows */}
      {compactPlans.length > 0 && (
        <div className="space-y-4 pt-2">
          {compactPlans.map((plan) => (
            <div
              key={plan._id?.toString() || plan.title}
              onClick={() => router.push(`/library/${plan._id}`)}
              className="flex items-center justify-between p-2 sm:p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5 min-w-0 flex-1 mr-3">
                {/* Rounded square thumbnail on left */}
                <div className="size-16 sm:size-18 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                  <img
                    src={plan.thumbnailUrl || plan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400'}
                    alt={plan.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400');
                    }}
                  />
                </div>
                {/* Duration & Title */}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                  </span>
                  <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors">
                    {plan.title}
                  </h4>
                </div>
              </div>

              {/* Rounded pale-teal "Start" action on right */}
              <button
                onClick={(e) => onStartPlan(plan._id.toString(), e)}
                disabled={isStartingPlanId === plan._id.toString()}
                className="px-5 py-2 rounded-full bg-[#E6F0F1] dark:bg-[#1E3A3C] text-[var(--color-primary-teal)] dark:text-teal-300 font-semibold text-sm hover:bg-[#D0E5E7] dark:hover:bg-[#284D4F] transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isStartingPlanId === plan._id.toString() ? 'Starting...' : 'Start'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
