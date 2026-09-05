'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Download, Share, PlusSquare, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { usePWA } from './PWAProvider';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const { isInstallable, promptInstall, isInstalled } = usePWA();

  const isIOS =
    typeof window !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  const handleInstallClick = async () => {
    if (isInstallable) {
      await promptInstall();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-[#1c1c1e] border-none shadow-2xl">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-[var(--color-primary-teal)] mb-3">
            <Download className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Install The Bible Net
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Install the app on your device for instant access and full offline reading.
          </DialogDescription>
        </DialogHeader>

        {isInstalled ? (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Already Installed
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                The Bible Net is running in standalone app mode on this device.
              </p>
            </div>
          </div>
        ) : isInstallable ? (
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-teal)] shrink-0" />
                <span>One-tap launch directly from your home screen or dock</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-teal)] shrink-0" />
                <span>Read your downloaded Bibles completely offline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[var(--color-primary-teal)] shrink-0" />
                <span>Create notes and highlights without needing internet</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full py-3 px-4 rounded-xl bg-[var(--color-primary-teal)] hover:opacity-95 text-white font-semibold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Install App Now</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="mt-4 space-y-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Add to Home Screen (iOS Safari)
            </p>
            <div className="space-y-3 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl text-sm">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/60 text-[var(--color-primary-teal)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Tap the <strong className="font-semibold text-gray-900 dark:text-white">Share</strong> button{' '}
                  <Share className="inline w-3.5 h-3.5 text-[var(--color-primary-teal)] mx-0.5" /> in Safari's bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/60 text-[var(--color-primary-teal)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Scroll down the share menu and select{' '}
                  <strong className="font-semibold text-gray-900 dark:text-white">Add to Home Screen</strong>{' '}
                  <PlusSquare className="inline w-3.5 h-3.5 text-[var(--color-primary-teal)] mx-0.5" />.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/60 text-[var(--color-primary-teal)] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                  Tap <strong className="font-semibold text-gray-900 dark:text-white">Add</strong> in the top-right corner.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 font-medium text-xs transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[var(--color-primary-teal)] shrink-0" />
                <span>Use your browser menu (⋮ or ⋯) and select <strong>Install The Bible Net</strong> or <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary-teal)] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
