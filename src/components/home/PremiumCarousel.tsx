"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PremiumCarouselProps {
  children: React.ReactNode[];
  activeIndex: number;
  onChange: (index: number) => void;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
  fullHeight?: boolean;
}

export function PremiumCarousel({
  children,
  activeIndex,
  onChange,
  ariaLabel,
  className = "",
  style = {},
  fullHeight = false
}: PremiumCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  
  // Refs to track gestures without causing re-renders during dragging
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);
  const isSwipeActionRef = useRef<boolean | null>(null);

  // Auto-fade navigation controls state & refs
  const [isControlsVisible, setIsControlsVisible] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);
  const isHoveredRef = useRef(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 2000);
  }, [clearInactivityTimer]);

  useEffect(() => {
    return () => {
      clearInactivityTimer();
    };
  }, [clearInactivityTimer]);

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    isHoveredRef.current = true;
    setIsControlsVisible(true);
    startInactivityTimer();
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    isHoveredRef.current = false;
    clearInactivityTimer();
    setIsControlsVisible(false);
  };

  const handleActivity = (e?: React.SyntheticEvent) => {
    if (e && 'pointerType' in e && (e as React.PointerEvent).pointerType === 'touch') return;
    if (isHoveredRef.current || isFocusedWithin) {
      setIsControlsVisible(true);
      startInactivityTimer();
    }
  };

  const handleFocus = () => {
    setIsFocusedWithin(true);
    setIsControlsVisible(true);
    startInactivityTimer();
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsFocusedWithin(false);
      if (!isHoveredRef.current) {
        clearInactivityTimer();
        setIsControlsVisible(false);
      }
    }
  };

  const count = children.length;

  useEffect(() => {
    // Keep the track transform synchronized on external activeIndex updates
    const track = trackRef.current;
    if (track && !isDraggingRef.current) {
      track.style.transition = 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      track.style.transform = `translate3d(-${(count - 1 - activeIndex) * 100}%, 0, 0)`;
    }
  }, [activeIndex, count]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handleActivity(e);
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
    handleActivity(e);
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - startXRef.current;
    const deltaY = e.clientY - startYRef.current;

    // Detect gesture direction to lock either horizontal swipe or vertical page scroll
    if (isSwipeActionRef.current === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > 20 || absY > 20) {
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
    if ((isAtStart && deltaX < 0) || (isAtEnd && deltaX > 0)) {
      computedDeltaX = deltaX * 0.2;
    }

    // Bound the drag movement to one slide width to enforce exactly one-slide navigation
    computedDeltaX = Math.max(-containerWidth, Math.min(containerWidth, computedDeltaX));

    if (trackRef.current) {
      const basePercent = -(count - 1 - activeIndex) * 100;
      // Dragging naturally in the direction of pointer movement
      trackRef.current.style.transform = `translate3d(calc(${basePercent}% + ${computedDeltaX}px), 0, 0)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    handleActivity(e);
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const container = containerRef.current;
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (isSwipeActionRef.current !== true) {
      setTimeout(() => {
        isSwipeActionRef.current = null;
      }, 50);
      return;
    }

    const deltaX = e.clientX - startXRef.current;
    const elapsedTime = Date.now() - startTimeRef.current;
    const velocity = Math.abs(deltaX) / (elapsedTime || 1); // pixels per millisecond

    const swipeThreshold = 50; // minimum drag distance in pixels
    const velocityThreshold = 0.4; // minimum drag speed in px/ms

    let newIndex = activeIndex;

    // Decide if we should go to next, previous, or snap back to current.
    // Swipe RIGHT → older content (index + 1), swipe LEFT → newer content (index - 1)
    if (deltaX > swipeThreshold || (deltaX > 0 && velocity > velocityThreshold)) {
      if (activeIndex < count - 1) {
        newIndex = activeIndex + 1;
      }
    } else if (deltaX < -swipeThreshold || (deltaX < 0 && velocity > velocityThreshold)) {
      if (activeIndex > 0) {
        newIndex = activeIndex - 1;
      }
    }

    // Animate smoothly to the destination slide
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)';
      trackRef.current.style.transform = `translate3d(-${(count - 1 - newIndex) * 100}%, 0, 0)`;
    }

    if (newIndex !== activeIndex) {
      onChange(newIndex);
    }

    setTimeout(() => {
      isSwipeActionRef.current = null;
    }, 50);
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
      trackRef.current.style.transform = `translate3d(-${(count - 1 - activeIndex) * 100}%, 0, 0)`;
    }

    setTimeout(() => {
      isSwipeActionRef.current = null;
    }, 50);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    handleActivity(e);
    // Intercept clicks during dragging/swiping to prevent accidental triggers (e.g. open modal, like, comment)
    if (isSwipeActionRef.current === true) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    handleActivity(e);
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (activeIndex < count - 1) {
        onChange(activeIndex + 1);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (activeIndex > 0) {
        onChange(activeIndex - 1);
      }
    }
  };

  const reversedChildren = React.Children.toArray(children).reverse();
  const showNavigationControls = isControlsVisible || isFocusedWithin;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden w-full touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-teal)]/50 focus-visible:ring-offset-2 group ${fullHeight ? 'h-full' : ''} ${className}`}
      style={{ borderRadius: 'var(--radius-md)', ...style }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClickCapture={handleClickCapture}
      onKeyDown={handleKeyDown}
      onWheel={handleActivity}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        ref={trackRef}
        className={`flex w-full will-change-transform ${fullHeight ? 'h-full' : ''}`}
        style={{
          transform: `translate3d(-${(count - 1 - activeIndex) * 100}%, 0, 0)`,
          transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {reversedChildren.map((child, index) => {
          const isCurrentActive = index === (count - 1 - activeIndex);
          return (
            <div
              key={index}
              className={`w-full flex-shrink-0 ${fullHeight ? 'h-full' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${index + 1} of ${count}`}
              aria-hidden={!isCurrentActive}
            >
              {child}
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows for Desktop */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleActivity(e);
              if (activeIndex < count - 1) onChange(activeIndex + 1);
            }}
            disabled={activeIndex === count - 1}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center size-10 rounded-full bg-black/30 hover:bg-black/50 text-white border border-white/10 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 disabled:!opacity-0 disabled:pointer-events-none ${showNavigationControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-label="Previous slide (older)"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleActivity(e);
              if (activeIndex > 0) onChange(activeIndex - 1);
            }}
            disabled={activeIndex === 0}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex items-center justify-center size-10 rounded-full bg-black/30 hover:bg-black/50 text-white border border-white/10 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 disabled:!opacity-0 disabled:pointer-events-none ${showNavigationControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-label="Next slide (newer)"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}

