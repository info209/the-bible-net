"use client";

import React from "react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

export const GreetingSkeleton = () => (
  <div className="flex items-center space-x-3 mb-6">
    <Skeleton className="size-10 rounded-full" />
    <div className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-32" />
    </div>
  </div>
);

export const BannerSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 shadow-sm">
    <div className="flex items-center space-x-3 w-full">
      <Skeleton className="size-10 rounded-full flex-shrink-0" />
      <div className="space-y-2 w-full">
        <Skeleton className="h-3 w-[80%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </div>
    <Skeleton className="h-10 w-full sm:w-32 rounded-lg" />
  </div>
);

export const VerseSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[360px] flex flex-col mb-6">
    <div className="mb-4">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-48 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
    <div className="flex-1 flex flex-col justify-center space-y-4 my-6">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-[90%]" />
      <Skeleton className="h-4 w-[85%]" />
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center space-y-2">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-2 w-8" />
        </div>
      ))}
    </div>
  </div>
);

export const DevotionSkeleton = () => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[320px] mb-6">
    <div className="flex items-start justify-between mb-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="size-10 rounded-full" />
    </div>
    <div className="space-y-3 my-6">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[70%]" />
    </div>
    <div className="bg-gray-50 p-4 rounded-lg mb-6">
      <Skeleton className="h-3 w-full mb-2" />
      <Skeleton className="h-3 w-[80%]" />
    </div>
    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
      <div className="flex space-x-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center space-y-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-2 w-6" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-28 rounded-full" />
    </div>
  </div>
);

export const ReadingPlanSkeleton = () => (
  <div className="space-y-4 mb-6">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-20" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between h-[180px]">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-2 w-24" />
            </div>
            <Skeleton className="size-12 rounded-full flex-shrink-0" />
          </div>
          <div className="space-y-3">
            <Skeleton className="w-full h-2 rounded-full" />
            <Skeleton className="w-full h-9 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const JournalBannerSkeleton = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-6 flex items-center justify-between gap-4 min-h-[120px] w-full shadow-sm mb-6">
    <div className="flex items-center space-x-4 w-full">
      {/* Icon Box */}
      <Skeleton className="size-12 rounded-xl flex-shrink-0" />
      {/* Text Lines */}
      <div className="space-y-2 w-full max-w-[240px] sm:max-w-md">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[70%]" />
      </div>
    </div>
    {/* Arrow Circle */}
    <Skeleton className="size-10 rounded-full flex-shrink-0" />
  </div>
);

export const PrayerSkeleton = () => (
  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
    <Skeleton className="h-6 w-56 mb-4" />
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-lg p-4 flex items-start space-x-3">
          <Skeleton className="size-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-2 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
    <Skeleton className="w-full h-12 rounded-xl mt-4" />
  </div>
);

export default function HomeSkeleton() {
  return (
    <div className="space-y-6 pb-20 pt-2 px-0 max-w-2xl mx-auto">
      <div className="px-4">
        <GreetingSkeleton />
      </div>
      <div className="px-2">
        <VerseSkeleton />
      </div>
      <div className="px-2">
        <DevotionSkeleton />
      </div>
      <div className="px-4">
        <JournalBannerSkeleton />
      </div>
      <div className="px-4">
        <PrayerSkeleton />
      </div>
    </div>
  );
}

