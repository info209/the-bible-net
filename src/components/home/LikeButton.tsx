"use client";

import React, { useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, useAnimation } from 'framer-motion';
import { useLikeState } from '@/context/LikeContext';

interface LikeButtonProps {
  contentId: string;
  contentType: 'daily-verse' | 'daily-devotion' | 'verse' | 'devotion';
  initialLiked: boolean;
  initialCount: number;
  variant?: 'carousel' | 'modal';
}

export function LikeButton({
  contentId,
  contentType,
  initialLiked,
  initialCount,
  variant = 'carousel'
}: LikeButtonProps) {
  const { isLiked, likeCount, toggleLike } = useLikeState(
    contentId,
    contentType,
    initialLiked,
    initialCount
  );

  const iconControls = useAnimation();

  useEffect(() => {
    // Run the Premium scale animation on change of liked state
    if (isLiked) {
      iconControls.start({
        scale: [1, 1.25, 1],
        transition: { duration: 0.22, ease: "easeInOut" }
      });
    } else {
      iconControls.start({
        scale: [1, 0.85, 1],
        transition: { duration: 0.22, ease: "easeInOut" }
      });
    }
  }, [isLiked, iconControls]);

  const handlePress = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike();
  };

  if (variant === 'modal') {
    return (
      <button
        onClick={handlePress}
        className="flex items-center space-x-2.5 text-black bg-black/10 hover:bg-black/15 active:scale-[0.97] backdrop-blur-md px-5 py-2.5 rounded-2xl transition-all cursor-pointer select-none font-bold text-sm border border-black/15"
      >
        <motion.div animate={iconControls} className="flex items-center justify-center">
          <Heart
            className={`size-5 transition-colors duration-200 ${
              isLiked ? 'fill-black text-black' : 'text-black/80'
            }`}
          />
        </motion.div>
        <span>
          {likeCount === 0 ? 'Like' : likeCount === 1 ? '1 Like' : `${likeCount} Likes`}
        </span>
      </button>
    );
  }

  // Default 'carousel' style (used in the Homepage carousel cards)
  return (
    <button
      onClick={handlePress}
      className="flex flex-col items-center space-y-1 text-white md:hover:scale-110 active:scale-95 transition-all"
    >
      <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full flex items-center justify-center">
        <motion.div animate={iconControls} className="flex items-center justify-center">
          <Heart
            className={`size-4 transition-colors duration-200 ${
              isLiked ? 'fill-white text-white' : 'text-white'
            }`}
          />
        </motion.div>
      </div>
      <span className="text-xs">{likeCount || 'Like'}</span>
    </button>
  );
}
