'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useNetworkStatusContext } from '@/lib/offline/NetworkStatusContext';

export type AppAuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'auth-status-unavailable-because-offline';

export interface SafeUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export interface SafeSession {
  user?: SafeUser;
  expires?: string;
  isOfflineSession?: boolean;
}

interface AuthContextValue {
  session: SafeSession | null;
  /** Same as session for next-auth useSession API compatibility */
  data: SafeSession | null;
  user: SafeUser | null;
  status: AppAuthStatus;
  isAuthenticated: boolean;
  isOfflineAuth: boolean;
  isLoading: boolean;
  signOutWithOfflineCleanup: (options?: { callbackUrl?: string }) => Promise<void>;
  updateSession: (data?: any) => Promise<Session | null>;
}

const STORAGE_KEY = 'the_bible_net_safe_session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSafeSessionFromStorage(): SafeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.user && (parsed.user.id || parsed.user.email)) {
      return {
        ...parsed,
        isOfflineSession: true,
      };
    }
  } catch (err) {
    console.warn('[AuthContext] Failed to read cached safe session:', err);
  }
  return null;
}

function writeSafeSessionToStorage(session: Session | SafeSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session && session.user && (session.user.id || session.user.email)) {
      const safeData = {
        user: {
          id: (session.user as any).id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          role: (session.user as any).role,
          firstName: (session.user as any).firstName,
          lastName: (session.user as any).lastName,
        },
        expires: session.expires,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[AuthContext] Failed to persist safe session:', err);
  }
}

function clearSafeSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Also notify Service Worker to purge cached auth session if supported
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_AUTH_CACHE' });
    }
  } catch (err) {
    console.warn('[AuthContext] Failed to clear safe session:', err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: nextAuthSession, status: nextAuthStatus, update } = useSession();
  const { isOnline } = useNetworkStatusContext();

  // Initialize cached session synchronously from localStorage for instant offline boots
  const [cachedSession, setCachedSession] = useState<SafeSession | null>(readSafeSessionFromStorage);

  // Sync active online session into persistent storage
  useEffect(() => {
    if (nextAuthStatus === 'authenticated' && nextAuthSession?.user) {
      setCachedSession({
        ...nextAuthSession,
        isOfflineSession: false,
      });
      writeSafeSessionToStorage(nextAuthSession);
    } else if (nextAuthStatus === 'unauthenticated' && isOnline) {
      // Genuinely logged out while online
      setCachedSession(null);
      clearSafeSessionFromStorage();
    }
  }, [nextAuthSession, nextAuthStatus, isOnline]);

  // Revalidate session when internet returns
  useEffect(() => {
    if (isOnline && cachedSession && nextAuthStatus === 'unauthenticated') {
      // Check if session can be revalidated with server
      update().then((fresh) => {
        if (!fresh || !fresh.user) {
          // Server confirmed session expired or logged out
          setCachedSession(null);
          clearSafeSessionFromStorage();
        }
      }).catch(() => {
        // Inconclusive network, do not immediately wipe
      });
    }
  }, [isOnline, cachedSession, nextAuthStatus, update]);

  // Determine normalized auth status
  const effectiveStatus: AppAuthStatus = useMemo(() => {
    if (nextAuthStatus === 'loading') {
      // If we are offline and have a cached session, don't wait indefinitely in loading
      if (!isOnline && cachedSession) {
        return 'auth-status-unavailable-because-offline';
      }
      return 'loading';
    }

    if (nextAuthStatus === 'authenticated' && nextAuthSession?.user) {
      return 'authenticated';
    }

    // When offline or network failed: preserve authenticated UI if we have a safe cached session
    if (!isOnline && cachedSession?.user) {
      return 'auth-status-unavailable-because-offline';
    }

    // If genuinely unauthenticated
    return 'unauthenticated';
  }, [nextAuthStatus, nextAuthSession, isOnline, cachedSession]);

  const effectiveSession = useMemo<SafeSession | null>(() => {
    if (effectiveStatus === 'authenticated') {
      return nextAuthSession ?? null;
    }
    if (effectiveStatus === 'auth-status-unavailable-because-offline') {
      return cachedSession ?? null;
    }
    return null;
  }, [effectiveStatus, nextAuthSession, cachedSession]);

  const isAuthenticated = effectiveStatus === 'authenticated' || effectiveStatus === 'auth-status-unavailable-because-offline';
  const isOfflineAuth = effectiveStatus === 'auth-status-unavailable-because-offline';

  const signOutWithOfflineCleanup = useCallback(async (options?: { callbackUrl?: string }) => {
    setCachedSession(null);
    clearSafeSessionFromStorage();
    await nextAuthSignOut(options);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: effectiveSession,
      data: effectiveSession,
      user: effectiveSession?.user ?? null,
      status: effectiveStatus,
      isAuthenticated,
      isOfflineAuth,
      isLoading: effectiveStatus === 'loading',
      signOutWithOfflineCleanup,
      updateSession: update,
    }),
    [
      effectiveSession,
      effectiveStatus,
      isAuthenticated,
      isOfflineAuth,
      signOutWithOfflineCleanup,
      update,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
