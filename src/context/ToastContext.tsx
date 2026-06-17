"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Listeners for external toast dispatches (Zustand, non-React files)
type ToastListener = (incoming: Omit<ToastMessage, "id">) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success: (message: string, duration?: number) => {
    listeners.forEach((l) => l({ type: "success", message, duration }));
  },
  error: (message: string, duration?: number) => {
    listeners.forEach((l) => l({ type: "error", message, duration }));
  },
  warning: (message: string, duration?: number) => {
    listeners.forEach((l) => l({ type: "warning", message, duration }));
  },
  info: (message: string, duration?: number) => {
    listeners.forEach((l) => l({ type: "info", message, duration }));
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // If used outside context, return global toast object
    return { toast };
  }
  return context;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const [bottomOffset, setBottomOffset] = useState(16);
  const lastToastRef = useRef<{ type: ToastType; message: string; timestamp: number } | null>(null);

  // Set up listeners for the global toast object
  useEffect(() => {
    const handleNewToast = (incoming: Omit<ToastMessage, "id">) => {
      const now = Date.now();
      const { type, message, duration } = incoming;

      // Duplicate prevention: prevent showing the same message/type within 1.5s
      if (
        lastToastRef.current &&
        lastToastRef.current.type === type &&
        lastToastRef.current.message === message &&
        now - lastToastRef.current.timestamp < 1500
      ) {
        return;
      }

      lastToastRef.current = { type, message, timestamp: now };

      const newToast: ToastMessage = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        message,
        duration,
      };

      setQueue((prev) => [...prev, newToast]);
    };

    listeners.add(handleNewToast);
    return () => {
      listeners.delete(handleNewToast);
    };
  }, []);

  // Process the queue sequentially
  useEffect(() => {
    if (!currentToast && queue.length > 0) {
      const nextToast = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentToast(nextToast);
    }
  }, [queue, currentToast]);

  // Handle auto-dismiss
  useEffect(() => {
    if (currentToast) {
      const duration = currentToast.duration || 4000; // default to 4 seconds
      const timer = setTimeout(() => {
        setCurrentToast(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [currentToast]);

  // Dynamically calculate bottom offset based on other bottom overlays
  useEffect(() => {
    const updateOffset = () => {
      let highestOffset = 16;

      // 1. Check Bottom Nav
      const bottomNav = document.querySelector('[data-bottom-nav="true"]');
      if (bottomNav) {
        const rect = bottomNav.getBoundingClientRect();
        const isVisible = rect.height > 0 && rect.top < window.innerHeight;
        if (isVisible) {
          const offsetFromBottom = window.innerHeight - rect.top;
          highestOffset = Math.max(highestOffset, offsetFromBottom + 16);
        }
      }

      // 2. Check Floating Audio Player
      const audioPlayer = document.querySelector('[data-audio-player="true"]');
      if (audioPlayer) {
        const rect = audioPlayer.getBoundingClientRect();
        const isVisible = rect.height > 0 && rect.top < window.innerHeight;
        if (isVisible) {
          const offsetFromBottom = window.innerHeight - rect.top;
          highestOffset = Math.max(highestOffset, offsetFromBottom + 16);
        }
      }

      // 3. Check Bottom Sheets
      const sheets = Array.from(document.querySelectorAll('[data-bottom-sheet="true"]'));
      sheets.forEach((sheet) => {
        const rect = sheet.getBoundingClientRect();
        const isVisible = rect.height > 0 && rect.top < window.innerHeight;
        if (isVisible) {
          const offsetFromBottom = window.innerHeight - rect.top;
          highestOffset = Math.max(highestOffset, offsetFromBottom + 16);
        }
      });

      setBottomOffset(highestOffset);
    };

    // Run initially
    updateOffset();

    // Resize/Mutation observer
    const resizeObserver = new ResizeObserver(() => updateOffset());
    const mutationObserver = new MutationObserver(() => {
      updateOffset();
      
      const bottomNav = document.querySelector('[data-bottom-nav="true"]');
      if (bottomNav) resizeObserver.observe(bottomNav);

      const audioPlayer = document.querySelector('[data-audio-player="true"]');
      if (audioPlayer) resizeObserver.observe(audioPlayer);

      const sheets = document.querySelectorAll('[data-bottom-sheet="true"]');
      sheets.forEach((sheet) => resizeObserver.observe(sheet));
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Initial attachments
    const bottomNav = document.querySelector('[data-bottom-nav="true"]');
    if (bottomNav) resizeObserver.observe(bottomNav);

    const audioPlayer = document.querySelector('[data-audio-player="true"]');
    if (audioPlayer) resizeObserver.observe(audioPlayer);

    const sheets = document.querySelectorAll('[data-bottom-sheet="true"]');
    sheets.forEach((sheet) => resizeObserver.observe(sheet));

    // Fast interval fallback to keep things perfectly reactive during slide transitions
    const interval = setInterval(updateOffset, 150);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      clearInterval(interval);
    };
  }, []);

  // Determine standard safe position including iOS safe area
  const finalBottom =
    bottomOffset === 16 ? "calc(16px + env(safe-area-inset-bottom))" : `${bottomOffset}px`;

  // UI Icons & styling based on toast type
  const renderToastIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />;
      case "error":
        return <AlertCircle className="size-5 text-rose-500 shrink-0" />;
      case "warning":
        return <AlertTriangle className="size-5 text-amber-500 shrink-0" />;
      case "info":
        return <Info className="size-5 text-sky-500 shrink-0" />;
    }
  };

  // Determine borders & shadows
  const getToastBorderClass = (type: ToastType) => {
    switch (type) {
      case "success":
        return "border-l-4 border-l-emerald-500 border-white/20 dark:border-white/10";
      case "error":
        return "border-l-4 border-l-rose-500 border-white/20 dark:border-white/10";
      case "warning":
        return "border-l-4 border-l-amber-500 border-white/20 dark:border-white/10";
      case "info":
        return "border-l-4 border-l-sky-500 border-white/20 dark:border-white/10";
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed left-0 right-0 z-[9999] pointer-events-none flex justify-center px-4"
        style={{
          bottom: finalBottom,
          transition: "bottom 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <AnimatePresence mode="wait">
          {currentToast && (
            <motion.div
              key={currentToast.id}
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto flex items-center justify-between gap-3 w-full sm:w-auto sm:min-w-[320px] sm:max-w-[480px] px-4 py-3 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 shadow-lg backdrop-blur-md ${getToastBorderClass(
                currentToast.type
              )}`}
            >
              <div className="flex items-center gap-3">
                {renderToastIcon(currentToast.type)}
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 break-words leading-tight">
                  {currentToast.message}
                </span>
              </div>
              <button
                onClick={() => setCurrentToast(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
