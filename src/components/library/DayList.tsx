'use client';

import React from 'react';
import { CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { PlanDay as IPlanDay } from '@/types/plan';

interface DayListProps {
  days: IPlanDay[];
  completedDays: number[];
  currentDay: number;
  onSelectDay: (dayNumber: number) => void;
}

export default function DayList({
  days,
  completedDays,
  currentDay,
  onSelectDay,
}: DayListProps) {
  return (
    <div className="space-y-2">
      {days.map((day) => {
        const isCompleted = completedDays.includes(day.dayNumber);
        const isCurrent = day.dayNumber === currentDay;

        return (
          <button
            key={day.dayNumber}
            onClick={() => onSelectDay(day.dayNumber)}
            className={`w-full flex items-center space-x-3 p-4 rounded-lg transition-all border-2 ${
              isCurrent
                ? 'border-[var(--color-primary-teal)] bg-blue-50'
                : isCompleted
                ? 'border-green-200 bg-green-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              ) : isCurrent ? (
                <Circle className="w-6 h-6 text-[var(--color-primary-teal)] fill-current" />
              ) : (
                <Circle className="w-6 h-6 text-gray-300" />
              )}
            </div>

            {/* Day info */}
            <div className="flex-1 text-left">
              <div className="font-bold text-gray-900">
                Day {day.dayNumber}
              </div>
              <div className="text-sm text-gray-600">{day.title}</div>
              <div className="text-xs text-gray-500 mt-1">{day.scripture}</div>
            </div>

            {/* Arrow */}
            <ChevronRight
              className={`w-5 h-5 ${
                isCurrent
                  ? 'text-[var(--color-primary-teal)]'
                  : isCompleted
                  ? 'text-green-500'
                  : 'text-gray-300'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
