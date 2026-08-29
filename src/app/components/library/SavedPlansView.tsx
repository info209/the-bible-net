'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, ChevronRight } from 'lucide-react';

interface SavedPlansViewProps {
  progresses: any[];
  isLoading: boolean;
}

export default function SavedPlansView({ progresses, isLoading }: SavedPlansViewProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (!progresses || progresses.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
          No plans under Saved
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {progresses.map((prog) => {
        const plan = prog.planId || prog.plan || {};
        const planId = plan._id?.toString() || prog.planId?.toString();

        return (
          <div
            key={prog._id?.toString() || planId}
            onClick={() => router.push(`/library/${planId}`)}
            className="group flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center space-x-3.5 min-w-0 flex-1">
              <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-gray-800">
                <img
                  src={plan.thumbnailUrl || plan.imageUrl || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400'}
                  alt={plan.title || 'Plan'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400');
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {plan.duration} {plan.duration === 1 ? 'day' : 'days'}
                </span>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-[var(--color-primary-teal)] transition-colors">
                  {plan.title || 'Untitled Plan'}
                </h4>
              </div>
            </div>
            <ChevronRight className="size-5 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
          </div>
        );
      })}
    </div>
  );
}
