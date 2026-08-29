'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Star, ChevronRight } from 'lucide-react';

interface CompletedPlansViewProps {
  progresses: any[];
  isLoading: boolean;
}

export default function CompletedPlansView({ progresses, isLoading }: CompletedPlansViewProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!progresses || progresses.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          No plans under Completed
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {progresses.map((prog) => {
        const plan = prog.planId || prog.plan || {};
        const planId = plan._id?.toString() || prog.planId?.toString();
        const rating = prog.rating || 0;

        return (
          <div
            key={prog._id?.toString() || planId}
            onClick={() => router.push(`/library/${planId}/completed`)}
            className="group flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
              <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={plan.thumbnailUrl || plan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400'}
                  alt={plan.title || 'Completed Plan'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400');
                  }}
                />
                <div className="absolute top-1 right-1 p-1 bg-green-500 text-white rounded-full shadow-xs">
                  <CheckCircle2 className="size-3" />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center space-x-1">
                    <span>Completed</span>
                  </span>
                  {rating > 0 && (
                    <span className="flex items-center space-x-0.5 text-xs text-amber-500 font-bold">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <span>{rating}</span>
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors mt-0.5">
                  {plan.title || 'Untitled Plan'}
                </h4>
                <p className="text-xs text-gray-400 truncate">
                  {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>

            <ChevronRight className="size-5 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
          </div>
        );
      })}
    </div>
  );
}
