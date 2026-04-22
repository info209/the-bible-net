'use client';

import React, { useState } from 'react';
import { Award, Star, Share2, ChevronRight } from 'lucide-react';

interface CompletionScreenProps {
  planTitle: string;
  duration: number;
  completedDate: Date;
  onRate: (rating: number, review: string) => void;
  onViewRelated: () => void;
  onGoHome: () => void;
  relatedPlans?: Array<{ title: string; duration: number }>;
}

export default function CompletionScreen({
  planTitle,
  duration,
  completedDate,
  onRate,
  onViewRelated,
  onGoHome,
  relatedPlans = [],
}: CompletionScreenProps) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleRate = () => {
    if (rating > 0) {
      onRate(rating, review);
      setSubmitted(true);
    }
  };

  const formattedDate = completedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex flex-col items-center justify-center p-4">
      {/* Success Animation */}
      <div className="mb-8 animate-bounce">
        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
          <Award className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Message */}
      <div className="text-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Plan Completed!</h1>
        <p className="text-lg text-gray-700">
          Congratulations! You've finished{' '}
          <span className="font-bold text-green-600">"{planTitle}"</span>
        </p>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mb-8 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-gray-600">Plan Duration</span>
          <span className="font-bold text-gray-900">{duration} days</span>
        </div>
        <div className="flex items-center justify-between border-b pb-3">
          <span className="text-gray-600">Completed On</span>
          <span className="font-bold text-gray-900">{formattedDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Progress</span>
          <span className="font-bold text-green-600">100%</span>
        </div>
      </div>

      {/* Rating Section */}
      {!submitted && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mb-8 space-y-4">
          <h3 className="font-bold text-lg text-gray-900">Rate This Plan</h3>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Review Text */}
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your thoughts about this plan (optional)"
            className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            rows={3}
          />

          {/* Submit Button */}
          <button
            onClick={handleRate}
            disabled={rating === 0}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Rating
          </button>
        </div>
      )}

      {/* Related Plans */}
      {relatedPlans.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mb-8 space-y-4">
          <h3 className="font-bold text-lg text-gray-900">Related Plans</h3>
          <div className="space-y-2">
            {relatedPlans.slice(0, 3).map((plan, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{plan.title}</p>
                  <p className="text-xs text-gray-600">{plan.duration} days</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
          <button
            onClick={onViewRelated}
            className="w-full py-2 border border-[var(--color-primary-teal)] text-[var(--color-primary-teal)] rounded-lg font-medium hover:bg-blue-50 transition-all text-sm"
          >
            View More Plans
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 max-w-md w-full">
        <button
          onClick={onGoHome}
          className="w-full py-3 bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <span>Back to Library</span>
          <ChevronRight className="w-5 h-5" />
        </button>

        <button
          className="w-full py-3 border-2 border-[var(--color-primary-teal)] text-[var(--color-primary-teal)] rounded-lg font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <Share2 className="w-5 h-5" />
          <span>Share Achievement</span>
        </button>
      </div>
    </div>
  );
}
