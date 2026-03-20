"use client";

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface PageTurnTransitionProps {
  children: React.ReactNode;
  /** Unique key for the current page (e.g., chapter ID) */
  pageKey: string | number;
  /** Navigation direction: 1 for next chapter, -1 for previous */
  direction: number;
  /** Optional container class */
  className?: string;
  /** Background color for the page paper */
  backgroundColor?: string;
}

/**
 * PageTurnTransition — Realistic physical book-page turn.
 *
 * How it works:
 *  - The outer wrapper sets `perspective: 1200px` so all children get true 3D depth.
 *  - Each page enters by rotating FROM the spine (rotateY ±90°) back to flat (0°).
 *  - Each page exits by rotating INTO the spine on the opposite side.
 *  - A fold-shadow overlay fades out as the page settles flat,
 *    simulating paper bending at the spine.
 *  - `backfaceVisibility: hidden` prevents content from showing through the back.
 *  - `transformOrigin` is set on the style (not in variants) to avoid TS conflicts.
 *  - `will-change: transform` enables GPU compositing for silky performance.
 */
const PageTurnTransition: React.FC<PageTurnTransitionProps> = ({
  children,
  pageKey,
  direction,
  className = "",
  backgroundColor = "transparent",
}) => {

  // Easing curves — typed as tuples for compatibility with framer-motion's Easing type
  const EXIT_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];
  const ENTER_EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];
  const EXIT_DURATION = 0.75;

  // Forward (next): new page comes from the right, hinging on left spine.
  // Backward (prev): new page comes from the left, hinging on right spine.
  const hingeOrigin = direction > 0 ? "left center" : "right center";
  const startRotateY = direction > 0 ? 90 : -90;
  const exitRotateY = direction > 0 ? -90 : 90;

  // Page variants — transformOrigin is set via `style` on the motion.div
  // to avoid type conflicts (framer-motion doesn't type it in Variants)
  const pageVariants: Variants = {
    initial: {
      rotateY: startRotateY,
      opacity: 0,
    },
    animate: {
      rotateY: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 60,
        damping: 16,
        mass: 1.2,
      },
    },
    exit: {
      rotateY: exitRotateY,
      opacity: 0,
      transition: {
        duration: EXIT_DURATION,
        ease: EXIT_EASE,
      },
    },
  };

  // Fold shadow: starts opaque (page at 90°), fades out as page lands flat.
  // On exit, keyframes make it pulse briefly then disappear.
  const shadowVariants: Variants = {
    initial: { opacity: 0.8 },
    animate: {
      opacity: 0,
      transition: { duration: 0.55, ease: ENTER_EASE },
    },
    exit: {
      opacity: 0,
      transition: { duration: EXIT_DURATION * 0.4, ease: EXIT_EASE },
    },
  };

  const resolvedBg = backgroundColor === 'transparent' ? '#ffffff' : backgroundColor;

  // Shadow gradient: dark side at the spine, fades toward the outer edge
  const foldShadow = direction > 0
    ? "linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.14) 16%, transparent 42%)"
    : "linear-gradient(to left, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.14) 16%, transparent 42%)";

  // Subtle white sheen on the outer (turning) edge — simulates light catching the page
  const edgeSheen = direction > 0
    ? "linear-gradient(to right, transparent 82%, rgba(255,255,255,0.2) 93%, transparent 100%)"
    : "linear-gradient(to left, transparent 82%, rgba(255,255,255,0.2) 93%, transparent 100%)";

  return (
    <div
      className={`relative w-full ${className}`}
      style={{
        perspective: "1200px",
        perspectiveOrigin: "50% 38%",
      }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={pageKey}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full"
          style={{
            backgroundColor: resolvedBg,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transformStyle: "preserve-3d",
            willChange: "transform, opacity",
            transformOrigin: hingeOrigin,
            position: "relative",
          }}
        >
          {/* Fold shadow + edge sheen overlay — animates together */}
          <motion.div
            variants={shadowVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `${foldShadow}, ${edgeSheen}`,
              pointerEvents: "none",
              zIndex: 20,
            }}
          />

          {/* Actual page content */}
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PageTurnTransition;
