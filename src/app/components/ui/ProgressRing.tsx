import React from 'react';
import { motion } from 'framer-motion';

interface ProgressRingProps {
  progress: number; // 0 to 1
  size: number;
  strokeWidth: number;
  className?: string;
  color?: string;
  trackColor?: string;
}

export default function ProgressRing({
  progress,
  size,
  strokeWidth,
  className = '',
  color = 'var(--color-primary-teal)',
  trackColor = 'transparent',
}: ProgressRingProps) {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - clampedProgress * circumference;

  return (
    <svg width={size} height={size} className={`-rotate-90 origin-center ${className}`}>
      {/* Track */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.1, ease: 'linear' }}
      />
    </svg>
  );
}
