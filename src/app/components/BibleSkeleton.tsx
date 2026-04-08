"use client";

import React from "react";

const Skeleton = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <div className={`skeleton ${className}`} style={style} />
);

export const BookListSkeleton = () => (
  <div className="grid grid-cols-2 gap-8">
    <div>
      <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
    <div>
      <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export const VersionListSkeleton = () => (
  <div className="space-y-6">
    {[1, 2, 3].map(lang => (
      <div key={lang} className="space-y-3">
        <Skeleton className="h-4 w-20" />
        {[1, 2].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    ))}
  </div>
);

export const ComparisonSkeleton = ({ theme }: { theme?: { bg: string } }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile) {
    // Mobile skeleton - card layout
    return (
      <div className="w-full px-4 py-16" style={{ backgroundColor: theme?.bg }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="mb-10">
            {[1, 2, 3].map((j) => (
              <div 
                key={j}
                className="mb-4 pb-4 px-4 py-4 rounded-xl border border-black/[0.03]"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                }}
              >
                <Skeleton className="h-3 w-16 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[95%]" />
                  <Skeleton className="h-4 w-[90%]" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop skeleton - table layout
  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: theme?.bg }}>
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur-md h-12 flex items-center px-4">
        <div className="w-10 sm:w-12" />
        <div className="flex-1 flex divide-x divide-gray-100">
          <div className="flex-1 px-3">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex-1 px-3">
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto w-full px-4 mb-20">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex divide-x divide-gray-100 border-b border-gray-50 h-32">
            <div className="w-10 sm:w-12 flex justify-center py-4">
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex-1 p-3 sm:p-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[95%]" />
            </div>
            <div className="flex-1 p-3 sm:p-4 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-[90%]" />
              <Skeleton className="h-3 w-[85%]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function BibleSkeleton({ theme }: { theme?: { bg: string } }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-6 pb-20 animate-fade-in" style={{ backgroundColor: theme?.bg }}>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Chapter Title Skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-4" />
        </div>

        {/* Verses Skeleton */}
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col space-y-2">
              <div className="flex items-start gap-2">
                <Skeleton className="h-3 w-4 mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[95%]" />
                  {i % 2 === 0 && <Skeleton className="h-4 w-[80%]" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

