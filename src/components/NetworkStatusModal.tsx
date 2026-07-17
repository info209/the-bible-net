"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WifiOff } from "lucide-react";

export default function NetworkStatusModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOffline = () => {
      setIsOpen(true);
    };

    const handleOnline = () => {
      setIsOpen(false);
    };

    // Set initial state
    if (!navigator.onLine) {
      setIsOpen(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[85%] sm:max-w-xs p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl [&>button[data-slot=dialog-close]]:hidden flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 relative mb-4">
          <span className="absolute inset-0 rounded-full bg-rose-400 opacity-20 animate-ping" />
          <WifiOff className="h-8 w-8 relative z-10" />
        </div>
        
        <DialogHeader className="text-center flex flex-col items-center">
          <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            No Internet Connection
          </DialogTitle>
          <DialogDescription className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
            Please check and try again
          </DialogDescription>
        </DialogHeader>

        <button
          onClick={() => setIsOpen(false)}
          className="w-full mt-6 py-2.5 rounded-xl text-white font-semibold bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-[var(--color-primary-teal)]/20 text-sm focus:outline-none"
        >
          OK
        </button>
      </DialogContent>
    </Dialog>
  );
}
