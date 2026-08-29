'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Play } from 'lucide-react';

interface MyPlansViewProps {
  progresses: any[];
  isLoading: boolean;
}

export default function MyPlansView({ progresses, isLoading }: MyPlansViewProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!progresses || progresses.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          No plans under My plans
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {progresses.map((prog) => {
        const plan = prog.planId || prog.plan || {};
        const planId = plan._id?.toString() || prog.planId?.toString();
        const totalDays = prog.totalDays || plan.duration || 1;
        const currentDay = prog.currentDay || 1;
        const completedDays = prog.completedDayNumbers?.length || prog.daysProgress?.filter((d: any) => d.completed).length || 0;
        const progressPercentage = Math.min(100, Math.round((completedDays / totalDays) * 100));

        return (
          <div
            key={prog._id?.toString() || planId}
            onClick={() => router.push(`/library/${planId}`)}
            className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-4 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-start space-x-4">
              {/* Thumbnail */}
              <div className="size-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={plan.thumbnailUrl || plan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400'}
                  alt={plan.title || 'Reading Plan'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400');
                  }}
                />
              </div>

              {/* Content info */}
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-[var(--color-primary-teal)] dark:text-teal-400">
                  Day {currentDay} of {totalDays}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors mt-0.5">
                  {plan.title || 'Untitled Plan'}
                </h3>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary-teal)] transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{progressPercentage}% complete</span>
                    <span>{totalDays - completedDays} days left</span>
                  </div>
                </div>
              </div>

              <ChevronRight className="size-5 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
