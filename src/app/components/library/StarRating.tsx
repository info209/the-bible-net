'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  initialRating?: number;
  onRate: (rating: number) => void;
  disabled?: boolean;
}

export default function StarRating({ initialRating = 0, onRate, disabled = false }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [currentRating, setCurrentRating] = useState<number>(initialRating);

  const handleSelect = (starIndex: number) => {
    if (disabled) return;
    setCurrentRating(starIndex);
    onRate(starIndex);
  };

  return (
    <div className="flex items-center space-x-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const activeStar = hoverRating > 0 ? star <= hoverRating : star <= (currentRating || initialRating);

        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onMouseEnter={() => !disabled && setHoverRating(star)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            onClick={() => handleSelect(star)}
            className="p-1 rounded-full text-amber-400 hover:scale-110 active:scale-95 transition-transform cursor-pointer disabled:cursor-not-allowed"
            aria-label={`Rate ${star} out of 5 stars`}
          >
            <Star
              className={`size-7 sm:size-8 ${
                activeStar ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
}
