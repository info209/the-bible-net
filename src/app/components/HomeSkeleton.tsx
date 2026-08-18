"use client";

import React from "react";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`skeleton ${className}`} />
);

/** Greeting row — exact mirror of HomeView's greeting div */
export const GreetingSkeleton = () => (
  <div className="flex items-center gap-3.5 px-0 mt-0.5">
    {/* Avatar — w-12 h-12 shrink-0, teal bg in real view */}
    <Skeleton className="w-12 h-12 rounded-full shrink-0" />
    {/* Text column — flex-col min-w-0, no gap (leading-tight in real view) */}
    <div className="flex flex-col min-w-0">
      {/* greeting text: text-[15px] font-normal */}
      <Skeleton className="h-[15px] w-24 mb-[3px]" />
      {/* name text: text-[21px] font-bold */}
      <Skeleton className="h-[21px] w-36" />
    </div>
  </div>
);

/**
 * Full-width card skeleton mirroring the Daily Verse / Daily Devotional carousel cards.
 * - No border-radius (rounded-none), full bleed, h-[355px]
 * - Dark shimmer base to suggest a textured background image
 * - Date label + dot indicators at top, section label + title, 4 verse lines, action row
 */
export const CarouselCardSkeleton = () => (
  <div className="relative w-full h-[355px] overflow-hidden flex flex-col justify-between p-6">
    {/* Shimmer base — covers full card, mimics textured background */}
    <Skeleton className="absolute inset-0 w-full h-full rounded-none" />

    <div className="relative z-10 flex flex-col h-full justify-between">
      {/* Top: date label + dot indicators + section label + title */}
      <div className="flex flex-col items-center">
        <Skeleton className="h-4 w-28 mb-2" />
        <div className="flex items-center gap-1.5 mb-6">
          <Skeleton className="h-1.5 w-6 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
        </div>
        <div className="w-full">
          <Skeleton className="h-3 w-20 mb-1" />
          <Skeleton className="h-6 w-56" />
        </div>
      </div>

      {/* Middle: verse / devotion text lines */}
      <div className="flex flex-col gap-2 flex-1 mt-4 overflow-hidden">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[95%]" />
        <Skeleton className="h-4 w-[88%]" />
        <Skeleton className="h-4 w-[75%]" />
      </div>

      {/* Bottom: 4-button action row — Like · Comment · Share · More */}
      <div className="flex items-center justify-between pt-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-2 w-8" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** Journals & Prayers banner — mirrors the full-width SVG-background card */
export const JournalBannerSkeleton = () => (
  <div
    className="relative overflow-hidden min-h-[120px] w-full flex items-center justify-between p-6"
    style={{ borderRadius: "var(--radius-md, 1rem)" }}
  >
    <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
    <div className="relative z-10 flex items-center space-x-4 flex-1 min-w-0">
      {/* Emoji icon box */}
      <Skeleton className="size-14 rounded-xl flex-shrink-0" />
      {/* Text lines */}
      <div className="space-y-2 flex-1 min-w-0">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-[90%]" />
        <Skeleton className="h-3 w-[70%]" />
      </div>
    </div>
    {/* Arrow circle */}
    <Skeleton className="relative z-10 size-10 rounded-full flex-shrink-0" />
  </div>
);

/** Community Prayer Wall — amber/orange gradient bg matching HomeView */
export const PrayerSkeleton = () => (
  <div
    className="relative overflow-hidden w-full rounded-2xl p-6 shadow-xl"
    style={{ background: "linear-gradient(135deg, #fffbeb 0%, #ffedd5 100%)" }}
  >
    <Skeleton className="h-6 w-56 mb-4" />
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white/80 rounded-lg p-4 flex items-start space-x-3">
          <Skeleton className="size-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
    <Skeleton className="w-full h-11 rounded-xl mt-4" />
  </div>
);

/** Footer — logo, tagline, social icons */
export const FooterSkeleton = () => (
  <footer className="w-full bg-white border-t border-gray-100/80 mt-12 py-10 px-6 flex flex-col items-center">
    <Skeleton className="h-14 w-36 mb-6" />
    <Skeleton className="h-3.5 w-64 mb-2" />
    <Skeleton className="h-3.5 w-48 mb-8" />
    <div className="flex items-center gap-8">
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="size-6 rounded-full" />
      <Skeleton className="size-6 rounded-full" />
    </div>
  </footer>
);

export default function HomeSkeleton() {
  return (
    <div className="space-y-6 pt-0 pb-6 bg-transparent min-h-full px-0 overflow-hidden">
      {/* 1. Greeting */}
      <GreetingSkeleton />

      {/* 2. Daily Verse Carousel */}
      <div className="relative overflow-hidden mb-8 w-full">
        <CarouselCardSkeleton />
      </div>

      {/* 3. Daily Devotional Carousel */}
      <div className="relative overflow-hidden mb-6 w-full">
        <CarouselCardSkeleton />
      </div>

      {/* 4. Journals & Prayers Banner */}
      <JournalBannerSkeleton />

      {/* 5. Community Prayer Wall */}
      <PrayerSkeleton />

      {/* 6. Footer */}
      <FooterSkeleton />
    </div>
  );
}

