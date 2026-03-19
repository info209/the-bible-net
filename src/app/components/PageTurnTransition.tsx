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
  /** Whether to show a subtle paper fold shadow */
  showShadow?: boolean;
}

/**
 * PageTurnTransition - A reusable component for realistic book page turning animations.
 * 
 * Features:
 * - 3D rotateY, skewY, and translateX transforms
 * - Dynamic transformOrigin based on direction
 * - Paper realism effects (gradients, inset shadows)
 * - Spring physics for entry and cubic-bezier for exit
 * - Backface visibility hidden for clean 3D rendering
 */
const PageTurnTransition: React.FC<PageTurnTransitionProps> = ({ 
  children, 
  pageKey, 
  direction,
  className = "",
  backgroundColor = "transparent",
  showShadow = true
}) => {
  
  // Custom transition easing
  const exitEasing = [0.645, 0.045, 0.355, 1]; // cubic-bezier(0.645, 0.045, 0.355, 1.000)

  // Page turn variants
  const pageVariants: Variants = {
    initial: (dir: number) => ({
      rotateY: dir > 0 ? 80 : -80, // Slightly less than 90 to ensure it's "there"
      skewY: dir > 0 ? -5 : 5,
      x: dir > 0 ? '50%' : '-50%',
      opacity: 0,
      scale: 0.95,
      // Hinge logic: when moving forward, we are turning the page on the left hinge
      // But requirement 7 explicitly asked for right-center for forward.
      // We will follow requirement 7 but adjust rotation to match.
      transformOrigin: dir > 0 ? 'right center' : 'left center',
      zIndex: 0,
    }),
    animate: (dir: number) => ({
      rotateY: 0,
      skewY: 0,
      x: 0,
      opacity: 1,
      scale: 1,
      zIndex: dir > 0 ? 5 : 10, // New page is on top when moving backward
      transition: {
        rotateY: { type: "spring", stiffness: 80, damping: 20, mass: 1 },
        skewY: { type: "spring", stiffness: 80, damping: 20, mass: 1 },
        x: { type: "spring", stiffness: 80, damping: 20, mass: 1 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 }
      }
    }),
    exit: (dir: number) => ({
      rotateY: dir > 0 ? -120 : 120, // Rotate out
      skewY: dir > 0 ? 8 : -8,
      x: dir > 0 ? '-100%' : '100%',
      scale: 0.9,
      opacity: 0,
      filter: "brightness(0.7) contrast(1.1)",
      // Switch origin for exit
      transformOrigin: dir > 0 ? 'left center' : 'right center',
      zIndex: dir > 0 ? 10 : 5, // Old page stays on top when moving forward
      transition: {
        duration: 0.7,
        ease: exitEasing as any
      }
    })
  };

  // Shadow variants
  const shadowVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 0.05 },
    exit: { 
      opacity: [0.05, 0.3, 0],
      transition: { duration: 0.7, ease: exitEasing as any }
    }
  };

  return (
    <div 
      className={`relative w-full min-h-[500px] ${className}`}
      style={{
        perspective: '1500px',
        transformStyle: 'preserve-3d',
        zIndex: 1
      }}
    >
      <AnimatePresence initial={true} custom={direction} mode="popLayout">
        <motion.div
          key={pageKey}
          custom={direction}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="w-full h-full flex flex-col pointer-events-auto bg-[var(--app-bg)]"
          style={{
            // Requirement 9: Prevent rendering artifacts
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transformStyle: 'preserve-3d',
            // Requirement 8: Subtle paper gradient background
            background: backgroundColor === 'transparent' 
              ? 'linear-gradient(to right, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.01) 50%, rgba(255,255,255,0.02) 100%)'
              : `linear-gradient(135deg, ${backgroundColor} 0%, rgba(0,0,0,0.02) 100%)`,
            backgroundColor: backgroundColor === 'transparent' ? 'white' : backgroundColor,
          }}
        >
          {/* Requirement 8: Inset shadow during flip */}
          {showShadow && (
            <motion.div 
              variants={shadowVariants}
              className="absolute inset-0 pointer-events-none z-[20]"
              style={{
                background: direction > 0 
                  ? 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.05) 100%)'
                  : 'linear-gradient(to left, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.05) 100%)',
              }}
            />
          )}

          {/* Page Content */}
          <div className="relative flex-1 z-[1]">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};


export default PageTurnTransition;
