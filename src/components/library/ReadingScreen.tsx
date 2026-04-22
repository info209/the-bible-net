'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Minimize2, X } from 'lucide-react';

interface ReadingScreenProps {
  planTitle: string;
  dayNumber: number;
  totalDays: number;
  scripture: string;
  devotional: string;
  reflection?: string;
  onClose: () => void;
  onComplete: () => void;
  initialScrollPosition?: number;
  onScrollPositionChange?: (position: number) => void;
}

export default function ReadingScreen({
  planTitle,
  dayNumber,
  totalDays,
  scripture,
  devotional,
  reflection,
  onClose,
  onComplete,
  initialScrollPosition = 0,
  onScrollPositionChange,
}: ReadingScreenProps) {
  const [fontSize, setFontSize] = useState('base');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Restore scroll position on mount
  useEffect(() => {
    if (scrollContainerRef.current && initialScrollPosition > 0) {
      scrollContainerRef.current.scrollTop = initialScrollPosition;
    }
  }, [initialScrollPosition]);

  // Handle scroll position tracking
  const handleScroll = () => {
    if (scrollContainerRef.current && onScrollPositionChange) {
      onScrollPositionChange(scrollContainerRef.current.scrollTop);
    }
  };

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed',
    xl: 'text-xl leading-relaxed',
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="font-bold text-gray-900">{planTitle}</h1>
          <p className="text-xs text-gray-600">
            Day {dayNumber} of {totalDays}
          </p>
        </div>

        {/* Font controls */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => {
              const sizes: (keyof typeof fontSizeClasses)[] = ['sm', 'base', 'lg', 'xl'];
              const currentIndex = sizes.indexOf(fontSize as any);
              if (currentIndex > 0) setFontSize(sizes[currentIndex - 1]);
            }}
            className="p-1 hover:bg-white rounded transition-colors"
            title="Decrease font size"
          >
            <ChevronUp className="w-4 h-4 text-gray-600" />
          </button>
          <div className="px-2 text-xs font-medium text-gray-600">
            A
          </div>
          <button
            onClick={() => {
              const sizes: (keyof typeof fontSizeClasses)[] = ['sm', 'base', 'lg', 'xl'];
              const currentIndex = sizes.indexOf(fontSize as any);
              if (currentIndex < sizes.length - 1) setFontSize(sizes[currentIndex + 1]);
            }}
            className="p-1 hover:bg-white rounded transition-colors"
            title="Increase font size"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Close reading"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Scripture Reference */}
          <div className="bg-blue-50 border-l-4 border-[var(--color-primary-teal)] p-4 rounded">
            <p className="font-bold text-[var(--color-primary-teal)] text-lg">
              {scripture}
            </p>
          </div>

          {/* Devotional Content */}
          <div
            className={`text-gray-800 space-y-4 ${
              fontSizeClasses[fontSize as keyof typeof fontSizeClasses]
            }`}
          >
            {devotional.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="text-justify">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Reflection Questions */}
          {reflection && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded mt-8">
              <h3 className="font-bold text-amber-900 mb-3">Reflection</h3>
              <div
                className={`text-amber-900 space-y-2 ${
                  fontSizeClasses[fontSize as keyof typeof fontSizeClasses]
                }`}
              >
                {reflection.split('\n').map((line, idx) => (
                  <p key={idx}>
                    • {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Spacing for button */}
          <div className="h-20" />
        </div>
      </div>

      {/* Footer - Action Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={onComplete}
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:shadow-lg transition-all"
        >
          Mark as Complete
        </button>
      </div>
    </div>
  );
}
