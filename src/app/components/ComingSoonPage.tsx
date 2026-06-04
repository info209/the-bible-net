"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, BookOpen, Compass, Lock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ComingSoonVariant = "coming-soon" | "under-development" | "feature-locked" | "maintenance";

interface ComingSoonPageProps {
  variant?: ComingSoonVariant;
  title?: string; // Feature name (e.g. "Library", "Explore")
  customTitle?: string; // Custom header title (e.g. override "Coming Soon")
  customSubtitle?: string; // Custom subtitle text
  customDescription?: string; // Custom description text
  actionLabel?: string; // Custom button label (default is "Go Back")
  onAction?: () => void; // Custom button callback
  showBackButton?: boolean;
}

export default function ComingSoonPage({
  variant = "coming-soon",
  title,
  customTitle,
  customSubtitle,
  customDescription,
  actionLabel = "Go Back",
  onAction,
  showBackButton = true,
}: ComingSoonPageProps) {
  const router = useRouter();

  // Variant Configuration
  const config = {
    "coming-soon": {
      badge: "Coming Soon",
      title: "This feature is coming soon",
      subtitle: "This feature is currently being crafted and will be available in a future update.",
      description: "We're working hard to deliver a meaningful experience that aligns with your Bible study journey.",
      accentClass: "text-[var(--color-primary-teal)]",
      glowColor: "rgba(65, 173, 176, 0.15)",
    },
    "under-development": {
      badge: "Under Development",
      title: "Feature Under Development",
      subtitle: "This feature is currently being crafted and will be available in a future update.",
      description: "This feature is under active development. Thank you for your patience.",
      accentClass: "text-[var(--color-primary-teal)]",
      glowColor: "rgba(65, 173, 176, 0.15)",
    },
    "feature-locked": {
      badge: "Premium Feature",
      title: "Feature Locked",
      subtitle: "This feature is locked and will be unlocked in a future phase.",
      description: "Unlock deeper insights. This feature is currently locked for standard study accounts.",
      accentClass: "text-[var(--color-accent-rose)]",
      glowColor: "rgba(210, 57, 82, 0.12)",
    },
    maintenance: {
      badge: "Maintenance",
      title: "Under Maintenance",
      subtitle: "We are currently performing routine maintenance to improve stability.",
      description: "This section is temporarily offline for maintenance. Thank you for your patience.",
      accentClass: "text-amber-500",
      glowColor: "rgba(245, 158, 11, 0.12)",
    },
  };

  const currentConfig = config[variant];
  const displayTitle = customTitle || currentConfig.title;
  const displaySubtitle = customSubtitle || currentConfig.subtitle;
  const displayDescription = customDescription || currentConfig.description;

  const handleAction = () => {
    if (onAction) {
      onAction();
    } else {
      router.back();
    }
  };

  // Render variant specific premium icons
  const renderIcon = () => {
    switch (variant) {
      case "under-development":
        return (
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Pulsing Glow Background */}
            <div className="absolute inset-0 rounded-full animate-glow bg-[var(--color-primary-teal)]/10 blur-xl" />
            
            {/* Spinning background rays */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <svg className="w-full h-full animate-spin-slow text-[var(--color-primary-teal)]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" fill="none" />
              </svg>
            </div>

            {/* Main Compass/Drafting Icon */}
            <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/[0.08] shadow-lg animate-float">
              <Compass className="w-12 h-12 text-[var(--color-primary-teal)]" strokeWidth={1.5} />
            </div>

            {/* Sparkles */}
            <Sparkles className="absolute top-2 right-2 w-5 h-5 text-amber-400 animate-sparkle" />
            <Sparkles className="absolute bottom-4 left-2 w-4 h-4 text-cyan-300 animate-sparkle delay-75" />
          </div>
        );
      case "feature-locked":
        return (
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Pulsing Glow Background */}
            <div className="absolute inset-0 rounded-full animate-glow bg-[var(--color-accent-rose)]/10 blur-xl" />

            {/* Main Lock Icon */}
            <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/[0.08] shadow-lg animate-float">
              <Lock className="w-12 h-12 text-[var(--color-accent-rose)]" strokeWidth={1.5} />
            </div>
            
            <Sparkles className="absolute top-4 left-3 w-5 h-5 text-rose-300 animate-sparkle" />
          </div>
        );
      case "maintenance":
        return (
          <div className="relative flex items-center justify-center w-36 h-36">
            {/* Pulsing Glow Background */}
            <div className="absolute inset-0 rounded-full animate-glow bg-amber-500/10 blur-xl" />

            {/* Main Settings/Wrench Icon */}
            <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/[0.08] shadow-lg animate-float">
              <Settings className="w-12 h-12 text-amber-500 animate-spin-slow" strokeWidth={1.5} />
            </div>
          </div>
        );
      case "coming-soon":
      default:
        return (
          <div className="relative flex items-center justify-center w-40 h-40">
            {/* Pulsing Glow Background */}
            <div 
              className="absolute inset-0 rounded-full animate-glow blur-2xl opacity-60" 
              style={{ backgroundColor: currentConfig.glowColor }}
            />

            {/* Floating bible icon */}
            <div className="relative z-10 flex items-center justify-center w-28 h-28 rounded-3xl bg-white dark:bg-[#151515] border border-gray-100 dark:border-white/[0.08] shadow-lg animate-float">
              {/* Premium Open Bible Drawing */}
              <svg 
                className="w-16 h-16 text-[var(--color-primary-teal)]" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.25" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {/* Left Page */}
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                {/* Right Page */}
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                {/* Ribbon Bookmark */}
                <path d="M12 7v10" className="text-[var(--color-accent-rose)]" strokeWidth="1.5" />
                {/* Cross Emblem on Left Cover (Subtle) */}
                <path d="M5 9h2M6 8v3" strokeWidth="1" strokeOpacity="0.7" />
              </svg>
            </div>

            {/* Floating Sparkles around the Bible */}
            <Sparkles className="absolute top-2 right-4 w-5 h-5 text-amber-400 animate-sparkle" />
            <Sparkles className="absolute bottom-6 left-2 w-4 h-4 text-cyan-300 animate-sparkle delay-150" />
            
            {/* Tiny faint cross elements in background */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 opacity-25 dark:opacity-10 text-[var(--color-primary-teal)] text-lg pointer-events-none select-none font-light animate-float-delayed">✝</div>
            <div className="absolute top-1/3 right-1 opacity-25 dark:opacity-10 text-[var(--color-primary-teal)] text-sm pointer-events-none select-none font-light animate-float">✝</div>
          </div>
        );
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4 py-8 relative overflow-hidden select-none w-full"
      role="status"
      aria-live="polite"
    >
      {/* CSS Animations Injector */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(-4px);
          }
          50% {
            transform: translateY(4px);
          }
        }
        @keyframes glow {
          0%, 100% {
            transform: scale(0.95);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.85;
          }
        }
        @keyframes sparkle {
          0%, 100% {
            transform: scale(0.6);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.9;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
        }
        .animate-glow {
          animation: glow 4s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-float,
          .animate-float-delayed,
          .animate-glow,
          .animate-sparkle,
          .animate-spin-slow {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Decorative background radial overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 bg-radial-[circle_at_center,var(--color-primary-teal-subtle)_0%,transparent_70%]" />

      <div className="max-w-md w-full flex flex-col items-center z-10 space-y-6">
        
        {/* 1. Animated Icon */}
        <div className="flex justify-center" aria-hidden="true">
          {renderIcon()}
        </div>

        {/* 2. Feature Title Context Header */}
        {title && (
          <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] dark:text-gray-500">
            {title} Section
          </h2>
        )}

        {/* 3. Main Title / Coming Soon Label */}
        <h1 className="text-3xl font-extrabold text-[#111111] dark:text-white leading-tight font-sans tracking-tight">
          {displayTitle}
        </h1>

        {/* Dynamic Coming Soon / Status Badge */}
        <span 
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-xs bg-white dark:bg-[#1c1c1e] ${currentConfig.accentClass}`}
          style={{ borderColor: "rgba(65, 173, 176, 0.15)" }}
        >
          <span className="size-2 rounded-full bg-current animate-pulse" />
          {currentConfig.badge}
        </span>

        {/* 4. Subtitle and Supporting Description */}
        <div className="space-y-3 px-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 leading-relaxed max-w-sm mx-auto">
            {displaySubtitle}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
            {displayDescription}
          </p>
        </div>

        {/* 5. Optional Action Button */}
        {showBackButton && (
          <div className="pt-4">
            <Button
              onClick={handleAction}
              className="rounded-full bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white hover:opacity-90 active:scale-95 transition-all font-semibold px-8 py-2.5 h-auto text-xs shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" strokeWidth={2.5} />
              {actionLabel}
            </Button>
          </div>
        )}
        
      </div>
    </div>
  );
}
