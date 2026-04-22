'use client';

import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ProgressTracker from './ProgressTracker';
import DayList from './DayList';
import DevotionalView from './DevotionalView';
import { PlanDay as IPlanDay, PlanProgress as IPlanProgress } from '@/types/plan';

type ViewMode = 'days' | 'devotional' | 'reading';

interface PlanProgressViewProps {
  planTitle: string;
  planDays: IPlanDay[];
  progress: IPlanProgress;
  onBack: () => void;
  onStartReading: (dayNumber: number) => void;
  onMarkComplete: (dayNumber: number) => void;
  onToggleSave?: (dayNumber: number) => void;
}

export default function PlanProgressView({
  planTitle,
  planDays,
  progress,
  onBack,
  onStartReading,
  onMarkComplete,
  onToggleSave,
}: PlanProgressViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [selectedDayNumber, setSelectedDayNumber] = useState(progress.currentDay);

  const selectedDay = planDays.find((d) => d.dayNumber === selectedDayNumber);
  const completedDayNumbers = progress.daysProgress
    .filter((d) => d.completed)
    .map((d) => d.dayNumber);
  const isCurrentDayCompleted = completedDayNumbers.includes(selectedDayNumber);

  const handleSelectDay = (dayNumber: number) => {
    setSelectedDayNumber(dayNumber);
    setViewMode('devotional');
  };

  const handleStartReading = () => {
    onStartReading(selectedDayNumber);
    setViewMode('reading');
  };

  const handleCompleteDay = () => {
    onMarkComplete(selectedDayNumber);
    setViewMode('days');
    // Move to next day if available
    if (selectedDayNumber < planDays.length) {
      setSelectedDayNumber(selectedDayNumber + 1);
    }
  };

  const handlePreviousDay = () => {
    if (selectedDayNumber > 1) {
      setSelectedDayNumber(selectedDayNumber - 1);
    }
  };

  const handleNextDay = () => {
    if (selectedDayNumber < planDays.length) {
      setSelectedDayNumber(selectedDayNumber + 1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">{planTitle}</h1>
            <p className="text-xs text-gray-600">
              Day {selectedDayNumber} of {planDays.length}
            </p>
          </div>
        </div>

        {/* Quick Progress */}
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] transition-all duration-300"
            style={{
              width: `${Math.round((completedDayNumbers.length / planDays.length) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'days' && (
        <div className="p-4 max-w-4xl mx-auto space-y-6">
          {/* Progress Tracker */}
          <ProgressTracker
            currentDay={progress.currentDay}
            totalDays={planDays.length}
            completedDays={completedDayNumbers.length}
            planTitle={planTitle}
          />

          {/* Day List */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Planned Days</h2>
            <DayList
              days={planDays}
              completedDays={completedDayNumbers}
              currentDay={progress.currentDay}
              onSelectDay={handleSelectDay}
            />
          </div>
        </div>
      )}

      {viewMode === 'devotional' && selectedDay && (
        <div className="p-4 max-w-4xl mx-auto">
          <DevotionalView
            day={selectedDay}
            dayNumber={selectedDayNumber}
            totalDays={planDays.length}
            isCompleted={isCurrentDayCompleted}
            isSaved={false}
            onStartReading={handleStartReading}
            onContinueReading={handleStartReading}
            onPreviousDay={handlePreviousDay}
            onNextDay={handleNextDay}
            onToggleSave={() => onToggleSave?.(selectedDayNumber)}
            hasPrevious={selectedDayNumber > 1}
            hasNext={selectedDayNumber < planDays.length}
          />
        </div>
      )}

      {/* Go back button for devotional view */}
      {viewMode === 'devotional' && (
        <div className="p-4 flex justify-center">
          <button
            onClick={() => setViewMode('days')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Back to Days
          </button>
        </div>
      )}
    </div>
  );
}
