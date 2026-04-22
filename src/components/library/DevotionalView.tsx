'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { PlanDay as IPlanDay } from '@/types/plan';

interface DevotionalViewProps {
  day: IPlanDay;
  dayNumber: number;
  totalDays: number;
  isCompleted: boolean;
  isSaved?: boolean;
  onStartReading: () => void;
  onContinueReading: () => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  onToggleSave?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export default function DevotionalView({
  day,
  dayNumber,
  totalDays,
  isCompleted,
  isSaved = false,
  onStartReading,
  onContinueReading,
  onPreviousDay,
  onNextDay,
  onToggleSave,
  hasPrevious = true,
  hasNext = true,
}: DevotionalViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{day.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Day {dayNumber} of {totalDays}
          </p>
        </div>
        {onToggleSave && (
          <button
            onClick={onToggleSave}
            className="p-3 rounded-full hover:bg-gray-100 transition-colors"
            title={isSaved ? 'Remove bookmark' : 'Bookmark'}
          >
            {isSaved ? (
              <BookmarkCheck className="w-6 h-6 text-[var(--color-primary-teal)] fill-current" />
            ) : (
              <BookmarkPlus className="w-6 h-6 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Content Type Badge */}
      <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
        Devotional
      </div>

      {/* Scripture Reference */}
      <div className="bg-gradient-to-br from-[var(--color-primary-teal)]/5 to-[var(--color-primary-teal-light)]/5 p-4 rounded-lg border border-[var(--color-primary-teal)]/20">
        <p className="text-lg font-semibold text-[var(--color-primary-teal)]">
          {day.scripture}
        </p>
      </div>

      {/* Description/Preview */}
      {day.description && (
        <p className="text-gray-700 leading-relaxed">{day.description}</p>
      )}

      {/* Main CTA Buttons */}
      <div className="flex gap-3">
        {!isCompleted ? (
          <>
            <button
              onClick={onStartReading}
              className="flex-1 py-3 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-lg font-bold hover:shadow-lg transition-all"
            >
              Start Reading
            </button>
            <button
              onClick={onContinueReading}
              className="flex-1 py-3 border-2 border-[var(--color-primary-teal)] text-[var(--color-primary-teal)] rounded-lg font-bold hover:bg-blue-50 transition-all"
            >
              Continue Reading
            </button>
          </>
        ) : (
          <div className="w-full py-3 bg-green-100 text-green-700 rounded-lg font-bold text-center">
            ✓ Completed
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onPreviousDay}
          disabled={!hasPrevious}
          className="flex-1 flex items-center justify-center space-x-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>
        <button
          onClick={onNextDay}
          disabled={!hasNext}
          className="flex-1 flex items-center justify-center space-x-2 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
