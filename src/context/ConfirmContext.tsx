"use client";

import React, { createContext, useContext, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
    }
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-[90%] sm:max-w-md p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl [&>[data-slot=sheet-close]]:hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {options?.title || "Confirm Action"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {options?.message}
          </div>
          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              {options?.cancelText || "Cancel"}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-colors cursor-pointer ${
                options?.destructive
                  ? "bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/10"
                  : "bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] shadow-md shadow-[var(--color-primary-teal)]/10"
              }`}
            >
              {options?.confirmText || "Confirm"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
