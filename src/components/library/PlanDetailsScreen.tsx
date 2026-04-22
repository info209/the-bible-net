'use client';

import React from 'react';
import { ChevronLeft, Clock, Star, User } from 'lucide-react';
import { Plan } from '@/types/plan';

interface PlanDetailsScreenProps {
  plan: Plan;
  onBack: () => void;
  onStart: () => void;
  onContinue: () => void;
  onSave: () => void;
  status?: 'not-started' | 'in-progress' | 'completed';
  isSaved?: boolean;
  isLoading?: boolean;
}

export default function PlanDetailsScreen({
  plan,
  onBack,
  onStart,
  onContinue,
  onSave,
  status = 'not-started',
  isSaved = false,
  isLoading = false,
}: PlanDetailsScreenProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center font-bold text-gray-900">Plan Details</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="pb-24">
        {/* Image/Gradient */}
        <div className="h-64 bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)]">
          {plan.imageUrl ? (
            <img
              src={plan.imageUrl}
              alt={plan.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-white opacity-40 text-6xl">📖</div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
          {/* Title and Meta */}
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-gray-900">{plan.title}</h2>

            {/* Quick Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-2 text-[var(--color-primary-teal)]" />
                <span>{plan.duration} days</span>
              </div>
              <div className="flex items-center text-gray-600">
                <User className="w-4 h-4 mr-2 text-[var(--color-primary-teal)]" />
                <span>By {plan.author}</span>
              </div>
              <div className="flex items-center">
                <div className="flex space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.round(plan.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-600 ml-2">
                  {plan.averageRating.toFixed(1)} ({plan.totalRatings})
                </span>
              </div>
            </div>
          </div>

          {/* Difficulty Badge */}
          <div className="inline-block">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                plan.difficulty === 'beginner'
                  ? 'bg-green-100 text-green-700'
                  : plan.difficulty === 'intermediate'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {plan.difficulty.charAt(0).toUpperCase() + plan.difficulty.slice(1)} Level
            </span>
          </div>

          {/* About the Plan */}
          <div className="space-y-3">
            <h3 className="text-xl font-bold text-gray-900">About This Plan</h3>
            <div className="text-gray-700 leading-relaxed space-y-3">
              {plan.description.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* What You'll Learn */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-bold text-blue-900">What You'll Get</h4>
            <ul className="space-y-2 text-sm text-blue-900">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>{plan.duration} daily devotionals</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Scripture-based reflections</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Guided spiritual growth journey</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Progress tracking and completion badge</span>
              </li>
            </ul>
          </div>

          {/* Days Overview */}
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900">Days Overview</h4>
            <div className="grid grid-cols-2 gap-2">
              {plan.days.slice(0, 6).map((day) => (
                <div key={day.dayNumber} className="bg-gray-50 p-3 rounded-lg text-sm">
                  <div className="font-medium text-gray-900">Day {day.dayNumber}</div>
                  <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {day.title}
                  </div>
                </div>
              ))}
              {plan.days.length > 6 && (
                <div className="bg-gray-50 p-3 rounded-lg text-sm flex items-center justify-center">
                  <span className="text-gray-600 text-xs font-medium">
                    +{plan.days.length - 6} more days
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 space-y-3">
        {status === 'not-started' ? (
          <>
            <button
              onClick={onStart}
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? 'Starting...' : 'Start This Plan'}
            </button>
            <button
              onClick={onSave}
              className="w-full py-3 border-2 border-[var(--color-primary-teal)] text-[var(--color-primary-teal)] rounded-lg font-bold hover:bg-blue-50 transition-all"
            >
              {isSaved ? '✓ Saved' : 'Save for Later'}
            </button>
          </>
        ) : (
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Continue Reading'}
          </button>
        )}
      </div>
    </div>
  );
}
