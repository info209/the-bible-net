"use client";

import React, { useRef, useEffect } from 'react';

interface PremiumCarouselProps {
  children: React.ReactNode[];
  activeIndex: number;
  onChange: (index: number) => void;
  ariaLabel?: string;
}

export function PremiumCarousel({ children, activeIndex, onChange, ariaLabel }: PremiumCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Refs to track gestures without causing re-renders during dragging
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isSwipeActionRef = useRef<boolean | null>(null);

  const count = children.length;

  useEffect(() => {
    // Keep the track transform synchronized on external activeIndex updates
    const track = trackRef.current;
    if (track && !isDraggingRef.current) {
      track.style.transition = 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      track.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;
    }
  }, [activeIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only support left click on mouse
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const container = containerRef.current;
    if (!container) return;

    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    isDraggingRef.current = true;
    isSwipeActionRef.current = null;

    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    // Detect gesture direction to lock either horizontal swipe or vertical page scroll
    if (isSwipeActionRef.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > 10 || absY > 10) {
        if (absX > absY) {
          isSwipeActionRef.current = true;
          // Capture the pointer to handle drag outside container boundaries now that horizontal swiping has started
          const container = containerRef.current;
          if (container) {
            try {
              container.setPointerCapture(e.pointerId);
            } catch {}
          }
        } else {
          isSwipeActionRef.current = false;
          // Cancel custom dragging & let native browser vertical scroll happen
          isDraggingRef.current = false;
          return;
        }
      } else {
        return;
      }
    }

    if (isSwipeActionRef.current === false) return;

    // Prevent text selection or browser page scrolling when swiping horizontally
    e.preventDefault();

    const containerWidth = containerRef.current?.clientWidth || 1;
    let computedDeltaX = deltaX;

    const isAtStart = activeIndex === 0;
    const isAtEnd = activeIndex === count - 1;

    // Boundary resistance:
    // • index 0 = newest. Dragging RIGHT tries to go to index -1 → resist.
    // • index n-1 = oldest. Dragging LEFT tries to go past the end → resist.
    if ((isAtStart && deltaX > 0) || (isAtEnd && deltaX < 0)) {
      computedDeltaX = deltaX * 0.2;
    }

    // Bound the drag movement to one slide width to enforce exactly one-slide navigation
    computedDeltaX = Math.max(-containerWidth, Math.min(containerWidth, computedDeltaX));

    if (trackRef.current) {
      const basePercent = -activeIndex * 100;
      // Dragging naturally in the direction of pointer movement
      trackRef.current.style.transform = `translate3d(calc(${basePercent}% + ${computedDeltaX}px), 0, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (isSwipeActionRef.current !== true) return;

    const deltaX = e.clientX - startXRef.current;
    const elapsedTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(deltaX) / (elapsedTime || 1); // pixels per millisecond

    const swipeThreshold = 50; // minimum drag distance in pixels
    const velocityThreshold = 0.4; // minimum drag speed in px/ms

    let newIndex = activeIndex;

    // Decide if we should go to next, previous, or snap back to current.
    // Standard direction: swipe RIGHT → previous slide, swipe LEFT → next slide.
    if (deltaX > swipeThreshold || (deltaX > 0 && velocity > velocityThreshold)) {
      if (activeIndex > 0) {
        newIndex = activeIndex - 1;
      }
    } else if (deltaX < -swipeThreshold || (deltaX < 0 && velocity > velocityThreshold)) {
      if (activeIndex < count - 1) {
        newIndex = activeIndex + 1;
      }
    }

    // Animate smoothly to the destination slide
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translate3d(-${newIndex * 100}%, 0, 0)`;
    }

    if (newIndex !== activeIndex) {
      onChange(newIndex);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    }

    // Revert/snap back to current activeIndex
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translate3d(-${activeIndex * 100}%, 0, 0)`;
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    // Intercept clicks during dragging/swiping to prevent accidental triggers (e.g. open modal, like, comment)
    if (isSwipeActionRef.current === true) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeIndex > 0) {
        onChange(activeIndex - 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeIndex < count - 1) {
        onChange(activeIndex + 1);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-teal)]/50 focus-visible:ring-offset-2 rounded-2xl"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        ref={trackRef}
        className="flex w-full will-change-transform"
        style={{
          transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full flex-shrink-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${count}`}
            aria-hidden={index !== activeIndex}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
