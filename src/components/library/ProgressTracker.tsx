'use client';

import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProgressTrackerProps {
  currentDay: number;
  totalDays: number;
  completedDays: number;
  planTitle: string;
}

export default function ProgressTracker({
  currentDay,
  totalDays,
  completedDays,
  planTitle,
}: ProgressTrackerProps) {
  const progressPercentage = Math.round((completedDays / totalDays) * 100);

  return (
    <div className="bg-gradient-to-br from-[var(--color-primary-teal)]/10 to-[var(--color-primary-teal-light)]/10 rounded-lg p-4 space-y-3">
      {/* Title */}
      <h3 className="font-bold text-gray-900">{planTitle}</h3>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-bold text-[var(--color-primary-teal)]">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Day counter */}
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-gray-700">
            Day <span className="font-bold text-[var(--color-primary-teal)]">{currentDay}</span> of{' '}
            <span className="font-bold">{totalDays}</span>
          </span>
        </div>
        <div className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
          {completedDays} completed
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex items-center space-x-4 text-xs text-gray-600 pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-1">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>{completedDays} done</span>
        </div>
        <div className="flex items-center space-x-1">
          <Circle className="w-4 h-4 text-gray-400" />
          <span>{totalDays - completedDays} remaining</span>
        </div>
      </div>
    </div>
  );
}
