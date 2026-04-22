import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import ProgressRing from './ui/ProgressRing';

interface AudioFloatingPlayerProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  className?: string;
}

const EQUALIZER_BARS = [1, 2, 3, 4];

export default function AudioFloatingPlayer({
  isPlaying,
  progress,
  onPlayPause,
  onNext,
  onPrev,
  className = '',
}: AudioFloatingPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isExpanded) {
        setIsExpanded(false);
      }
    };
    
    if (isExpanded) {
      // Small delay to prevent immediate trigger on open
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 50);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isExpanded]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Capsule path for minimized state progress
  const pillWidth = 56;
  const pillHeight = 56;
  const pillRadius = pillHeight / 2;
  const pillStrokeWidth = 2;
  
  // Actually, wait, if the original pill is just width=56, height=56 it's already a circle! 
  // Let's make the pill wider so it looks like a pill if requested, but wait "Shape: pill / rounded capsule."
  // Usually an equalizer is wide. Let's make width=72, height=48.

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 ${className}`}>
      <motion.div
        layout
        initial={{ borderRadius: 999 }}
        animate={{
          width: isExpanded ? 240 : 64,
          height: isExpanded ? 72 : 48,
          borderRadius: 999,
        }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="relative bg-[#00695C] shadow-lg flex items-center justify-center overflow-hidden cursor-pointer"
        onClick={handleToggle}
      >
        {/* Progress Fill/Stroke */}
        <div className="absolute inset-0 pointer-events-none rounded-full overflow-hidden">
             {/* If not expanded, we can show a subtle background horizontal fill or border */}
             {/* Creating a border progress indicator using conic-gradient for the expanded state */}
        </div>

        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="minimized"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center gap-1 h-full w-full relative"
            >
              {/* Progress Border (Minimized) using an SVG capsule/circle */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 64 48">
                 <rect 
                   x="1" y="1" width="62" height="46" rx="23"
                   fill="none"
                   stroke="rgba(255,255,255,0.2)"
                   strokeWidth="2"
                 />
                 <motion.rect 
                   x="1" y="1" width="62" height="46" rx="23"
                   fill="none"
                   stroke="rgba(255,255,255,0.8)"
                   strokeWidth="2"
                   strokeLinecap="round"
                   // approximate path length = 2 * (62 - 46) + pi * 46 = 32 + 144 = 176
                   strokeDasharray="176"
                   initial={{ strokeDashoffset: 176 }}
                   animate={{ strokeDashoffset: 176 - (progress * 176) }}
                   transition={{ duration: 0.1 }}
                 />
              </svg>

              {EQUALIZER_BARS.map((bar) => (
                <motion.div
                  key={bar}
                  className="w-1 bg-white rounded-full origin-bottom"
                  animate={{
                    height: isPlaying ? ['12px', '24px', '8px', '16px', '12px'] : '12px',
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: isPlaying ? Infinity : 0,
                    ease: "easeInOut",
                    delay: bar * 0.1,
                  }}
                  style={{ minHeight: '6px' }}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between w-full px-6 h-full relative"
            >
              <button 
                onClick={(e) => handleAction(e, onPrev)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="relative flex items-center justify-center">
                 {/* Circular Progress Ring for the Play Button */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg width="60" height="60" className="-rotate-90">
                      <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                      <motion.circle 
                        cx="30" cy="30" r="28" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.9)" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 28}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: (2 * Math.PI * 28) * (1 - progress) }}
                        transition={{ duration: 0.1 }}
                      />
                    </svg>
                 </div>
                 
                 <button 
                   onClick={(e) => handleAction(e, onPlayPause)}
                   className="w-12 h-12 bg-white text-[#00695C] rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
                   style={{ zIndex: 2 }}
                 >
                   {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                 </button>
              </div>

              <button 
                onClick={(e) => handleAction(e, onNext)}
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors active:scale-95"
              >
                <ChevronRight size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
