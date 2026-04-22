'use client';

import React from 'react';
import { Clock, Star } from 'lucide-react';
import { Plan } from '@/types/plan';

interface PlanCardProps {
  plan: Plan;
  onAction: (action: 'start' | 'continue' | 'view') => void;
  actionLabel: 'Start' | 'Continue' | 'View';
  progressPercentage?: number;
  showProgress?: boolean;
}

export default function PlanCard({
  plan,
  onAction,
  actionLabel,
  progressPercentage = 0,
  showProgress = false,
}: PlanCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-100">
      {/* Image or gradient background */}
      <div className="h-40 bg-gradient-to-br from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] relative">
        {plan.imageUrl ? (
          <img
            src={plan.imageUrl}
            alt={plan.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white opacity-30 text-4xl">📖</div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Duration */}
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-1" />
          <span>{plan.duration} days</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 line-clamp-2">
          {plan.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center space-x-1">
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
          <span className="text-xs text-gray-600 ml-1">
            ({plan.totalRatings})
          </span>
        </div>

        {/* Progress bar (if in progress) */}
        {showProgress && progressPercentage > 0 && (
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600">Progress</span>
              <span className="text-xs font-bold text-[var(--color-primary-teal)]">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => {
            if (actionLabel === 'View') {
              onAction('view');
            } else if (actionLabel === 'Continue') {
              onAction('continue');
            } else {
              onAction('start');
            }
          }}
          className={`w-full py-2 rounded-lg font-medium transition-all text-sm ${
            actionLabel === 'Start'
              ? 'bg-[var(--color-primary-teal)] text-white hover:shadow-md'
              : actionLabel === 'Continue'
              ? 'bg-green-500 text-white hover:shadow-md'
              : 'border border-[var(--color-primary-teal)] text-[var(--color-primary-teal)] hover:bg-blue-50'
          }`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
