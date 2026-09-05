'use client';

/**
 * PWAProvider
 *
 * Handles:
 * 1. Registering the Service Worker (/sw.js)
 * 2. Listening for SW updates and controlling changes
 * 3. Capturing the beforeinstallprompt event for PWA installation
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

interface PWAContextValue {
  isInstallable: boolean;
  promptInstall: () => Promise<void>;
  isInstalled: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

const PWAContext = createContext<PWAContextValue>({
  isInstallable: false,
  promptInstall: async () => {},
  isInstalled: false,
  swRegistration: null,
});

export function PWAProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swRegistration, setSwRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    }

    // Register Service Worker
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV !== 'test'
    ) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          setSwRegistration(reg);

          // Check for SW updates periodically
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (
                  installingWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  console.log('[PWA] New version available.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      // Reload on controller change if requested
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller changed.');
      });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt,
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        promptInstall,
        isInstalled,
        swRegistration,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA(): PWAContextValue {
  return useContext(PWAContext);
}
