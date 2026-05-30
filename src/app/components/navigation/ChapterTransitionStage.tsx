"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionMode = 'slide' | 'curl' | 'fade' | 'scroll';

interface ChapterTransitionStageProps {
  /** Unique key — change this to trigger a transition */
  pageKey: string | number;
  /** Direction of navigation */
  direction: 'next' | 'prev';
  /** Which transition animation to use */
  mode: TransitionMode;
  /** Live drag offset in pixels (signed, negative = dragging left) */
  dragOffset?: number;
  /** Whether a drag gesture is currently active */
  isDragging?: boolean;
  /** Background color of the reading area (for page layers) */
  bgColor?: string;
  /** Pre-rendered previous chapter content (for preloading & interactive slide) */
  prevPageContent?: React.ReactNode;
  /** Pre-rendered next chapter content (for preloading & interactive slide) */
  nextPageContent?: React.ReactNode;
  /** Current chapter content */
  children: React.ReactNode;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Easing curves
// ─────────────────────────────────────────────────────────────────────────────

// iOS-style momentum deceleration
const IOS_EASE: [number, number, number, number] = [0.32, 0.72, 0, 1];
// Material standard easing
const STANDARD_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
// Deceleration (enter from off-screen)
const DECELERATE_EASE: [number, number, number, number] = [0.0, 0.0, 0.2, 1];
// Acceleration (exit to off-screen)
const ACCELERATE_EASE: [number, number, number, number] = [0.4, 0.0, 1.0, 1];

// ─────────────────────────────────────────────────────────────────────────────
// Variant factories
// ─────────────────────────────────────────────────────────────────────────────

function getSlideVariants(direction: 'next' | 'prev'): Variants {
  const d = direction === 'next' ? 1 : -1;
  return {
    initial: {
      x: `${100 * d}%`,
      opacity: 1,
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 32, mass: 0.85 },
      },
    },
    exit: {
      x: `${-100 * d}%`,
      opacity: 1,
      transition: {
        x: { duration: 0.38, ease: ACCELERATE_EASE },
      },
    },
  };
}

function getScrollVariants(direction: 'next' | 'prev'): Variants {
  const d = direction === 'next' ? 1 : -1;
  return {
    initial: {
      x: `${100 * d}%`,
      opacity: 0.85,
    },
    animate: {
      x: 0,
      opacity: 1,
      transition: {
        x: { duration: 0.42, ease: IOS_EASE },
        opacity: { duration: 0.22, ease: DECELERATE_EASE },
      },
    },
    exit: {
      x: `${-60 * d}%`,
      opacity: 0.4,
      transition: {
        x: { duration: 0.38, ease: ACCELERATE_EASE },
        opacity: { duration: 0.3, ease: ACCELERATE_EASE },
      },
    },
  };
}

function getFadeVariants(): Variants {
  return {
    initial: {
      opacity: 0,
      scale: 0.975,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        opacity: { duration: 0.32, ease: DECELERATE_EASE },
        scale:   { duration: 0.32, ease: DECELERATE_EASE },
      },
    },
    exit: {
      opacity: 0,
      scale:   0.975,
      transition: {
        opacity: { duration: 0.22, ease: ACCELERATE_EASE },
        scale:   { duration: 0.22, ease: ACCELERATE_EASE },
      },
    },
  };
}

function getCurlVariants(direction: 'next' | 'prev'): Variants {
  const rotateStart = direction === 'next' ? 90 : -90;
  const rotateExit  = direction === 'next' ? -90 : 90;
  return {
    initial: {
      rotateY: rotateStart,
      opacity: 0.3,
    },
    animate: {
      rotateY: 0,
      opacity: 1,
      transition: {
        rotateY: { type: 'spring', stiffness: 65, damping: 18, mass: 1.1 },
        opacity: { duration: 0.25, ease: DECELERATE_EASE },
      },
    },
    exit: {
      rotateY: rotateExit,
      opacity: 0,
      transition: {
        rotateY: { duration: 0.72, ease: STANDARD_EASE },
        opacity: { duration: 0.4, ease: ACCELERATE_EASE },
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Slide Layer (used only during drag in slide/scroll modes)
// ─────────────────────────────────────────────────────────────────────────────

interface InteractiveSlideLayerProps {
  offset: number;          // signed px
  bgColor: string;
  currentPage: React.ReactNode;
  prevPage: React.ReactNode;
  nextPage: React.ReactNode;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * During an active drag gesture this component takes over rendering from
 * AnimatePresence. It moves pages directly via CSS transforms — NO React
 * state updates happen during the drag, so no re-renders occur.
 */
const InteractiveSlideLayer = React.memo(function InteractiveSlideLayer({
  offset,
  bgColor,
  currentPage,
  prevPage,
  nextPage,
  isFirst,
  isLast,
}: InteractiveSlideLayerProps) {
  // Clamp offset at boundary — add rubber-band feel at edges
  const clampedOffset = (() => {
    if (offset > 0 && isFirst) return offset * 0.15; // rubber-band left edge
    if (offset < 0 && isLast)  return offset * 0.15; // rubber-band right edge
    return offset;
  })();

  const pct = (clampedOffset / (typeof window !== 'undefined' ? window.innerWidth : 390)) * 100;

  return (
    <div
      className="relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Previous page — visible when dragging right (offset > 0) */}
      {offset > 0 && !isFirst && (
        <div
          aria-hidden
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(${-100 + pct}%, 0, 0)`,
            backgroundColor: bgColor,
          }}
        >
          {prevPage}
        </div>
      )}

      {/* Next page — visible when dragging left (offset < 0) */}
      {offset < 0 && !isLast && (
        <div
          aria-hidden
          className="absolute inset-0 will-change-transform"
          style={{
            transform: `translate3d(${100 + pct}%, 0, 0)`,
            backgroundColor: bgColor,
          }}
        >
          {nextPage}
        </div>
      )}

      {/* Current page — always rendered on top */}
      <div
        className="relative will-change-transform"
        style={{ transform: `translate3d(${pct}%, 0, 0)` }}
      >
        {currentPage}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ChapterTransitionStage
 *
 * The single unified transition wrapper for all 4 modes.
 *
 * Render contract:
 *  - When `isDragging` is true AND mode is slide/scroll: renders InteractiveSlideLayer
 *    (bypasses AnimatePresence, uses direct CSS transforms)
 *  - Otherwise: renders through AnimatePresence with mode-appropriate variants
 *
 * Guarantees:
 *  - ALWAYS resolves to one of two stable states: page fully visible or prev page fully visible
 *  - AnimatePresence `mode="wait"` for curl/fade (one at a time)
 *  - AnimatePresence `mode="popLayout"` for slide/scroll (overlap allowed during spring)
 *  - All transforms are GPU-accelerated via translate3d / will-change
 */
export default function ChapterTransitionStage({
  pageKey,
  direction,
  mode,
  dragOffset = 0,
  isDragging = false,
  bgColor = '#ffffff',
  prevPageContent,
  nextPageContent,
  children,
  className = '',
}: ChapterTransitionStageProps) {

  // Whether we're in interactive drag mode (only for slide & scroll)
  const isInteractiveDrag = isDragging && (mode === 'slide' || mode === 'scroll');

  // ── Compute variants ───────────────────────────────────────────────────────

  const variants: Variants = (() => {
    switch (mode) {
      case 'slide':  return getSlideVariants(direction);
      case 'scroll': return getScrollVariants(direction);
      case 'fade':   return getFadeVariants();
      case 'curl':   return getCurlVariants(direction);
      default:       return getSlideVariants(direction);
    }
  })();

  // ── Curl-specific transform origin ─────────────────────────────────────────
  const curlTransformOrigin = mode === 'curl'
    ? (direction === 'next' ? 'left center' : 'right center')
    : undefined;

  // ── Curl shadow overlay ────────────────────────────────────────────────────
  const curlFoldShadow = mode === 'curl'
    ? (direction === 'next'
        ? 'linear-gradient(to right, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.1) 20%, transparent 44%)'
        : 'linear-gradient(to left, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.1) 20%, transparent 44%)')
    : undefined;

  // ── AnimatePresence mode ───────────────────────────────────────────────────
  // wait = curl, fade (sequential, no overlap)
  // popLayout = slide, scroll (overlap allowed for simultaneous enter/exit)
  const apMode = (mode === 'curl' || mode === 'fade') ? 'wait' : 'popLayout';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  if (isInteractiveDrag) {
    return (
      <div className={className}>
        <InteractiveSlideLayer
          offset={dragOffset}
          bgColor={bgColor}
          currentPage={children}
          prevPage={prevPageContent ?? null}
          nextPage={nextPageContent ?? null}
          isFirst={false}
          isLast={false}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={mode === 'curl' ? { perspective: '1200px', perspectiveOrigin: '50% 38%' } : undefined}
    >
      <AnimatePresence mode={apMode} initial={false}>
        <motion.div
          key={pageKey}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full"
          style={{
            willChange: 'transform, opacity',
            transformStyle: mode === 'curl' ? 'preserve-3d' : undefined,
            backfaceVisibility: mode === 'curl' ? 'hidden' : undefined,
            WebkitBackfaceVisibility: mode === 'curl' ? 'hidden' : undefined,
            transformOrigin: curlTransformOrigin,
          }}
        >
          {/* Curl fold-shadow overlay */}
          {mode === 'curl' && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 0, transition: { duration: 0.55 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              style={{
                position: 'absolute',
                inset: 0,
                background: curlFoldShadow,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          )}

          {/* Page content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Hidden preload containers — mount adjacent chapters so they fetch data */}
      {prevPageContent && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '-200%',
            width: '100%',
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden',
          }}
        >
          {prevPageContent}
        </div>
      )}
      {nextPageContent && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: '200%',
            width: '100%',
            opacity: 0,
            pointerEvents: 'none',
            visibility: 'hidden',
          }}
        >
          {nextPageContent}
        </div>
      )}
    </div>
  );
}
