'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SavedVerseClient {
  _id: string;
  bookId: string;
  bookName: string;
  chapter: number;
  verses: number[];
  verseRangeText: string;
  labels: string[];
  note: string;
  version?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveVersePayload {
  bookId: string;
  bookName: string;
  chapter: number;
  verses: number[];
  verseRangeText: string;
  labels?: string[];
  note?: string;
  version?: string;
  isPrivate?: boolean;
}

export interface UpdateVersePayload {
  labels?: string[];
  note?: string;
  isPrivate?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Build a human-readable verse range string like "Genesis 1:2, 5-7" */
export function buildVerseRangeText(
  bookName: string,
  chapter: number,
  verses: number[]
): string {
  if (!verses.length) return '';
  const sorted = [...verses].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = start;
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      if (i < sorted.length) {
        start = sorted[i];
        end = start;
      }
    }
  }
  return `${bookName} ${chapter}:${ranges.join(', ')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseSavedVersesReturn {
  savedVerses: SavedVerseClient[];
  isLoading: boolean;
  userLabels: string[];
  isLabelsLoading: boolean;

  /** Check if any of the given verse numbers overlap with an existing save in the chapter */
  isSaved: (bookId: string, chapter: number, verses: number[]) => boolean;

  /** Get the save document for a given (bookId, chapter, verses) selection */
  getSavedVerse: (bookId: string, chapter: number, verses: number[]) => SavedVerseClient | undefined;

  /** All verse numbers that have been saved in the given (bookId, chapter) */
  savedVerseIdsForChapter: (bookId: string, chapter: number) => number[];

  /** Save (upsert) verses — optimistic update */
  saveVerse: (payload: SaveVersePayload) => Promise<void>;

  /** Update an existing save — optimistic update */
  updateSavedVerse: (id: string, patch: UpdateVersePayload) => Promise<void>;

  /** Delete a save — optimistic update */
  deleteSavedVerse: (id: string) => Promise<void>;

  /** Add a user-created label to DB */
  addUserLabel: (label: string) => Promise<void>;

  /** Refresh saved verses from server */
  refresh: () => Promise<void>;
}

export function useSavedVerses(): UseSavedVersesReturn {
  const { data: session, status } = useSession();
  const [savedVerses, setSavedVerses] = useState<SavedVerseClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userLabels, setUserLabels] = useState<string[]>([]);
  const [isLabelsLoading, setIsLabelsLoading] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());
  // Guards against double-fetching when status is already 'authenticated' on mount
  const hasFetchedRef = useRef(false);

  const fetchSavedVerses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/saved-verses?limit=200');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setSavedVerses(json.data as SavedVerseClient[]);
    } catch (err) {
      console.error('[useSavedVerses] fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserLabels = useCallback(async () => {
    setIsLabelsLoading(true);
    try {
      const res = await fetch('/api/user-labels');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setUserLabels(json.data as string[]);
    } catch (err) {
      console.error('[useSavedVerses] labels fetch error:', err);
    } finally {
      setIsLabelsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fires when status becomes 'authenticated' (normal login flow), OR
    // immediately on mount if Next-Auth already restored the session from
    // cookie (e.g. page refresh / navigation back) — hasFetchedRef prevents
    // a duplicate fetch if both happen in the same lifecycle.
    if (status !== 'authenticated') return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchSavedVerses();
    fetchUserLabels();
  }, [status, fetchSavedVerses, fetchUserLabels]);

  const isSaved = useCallback(
    (bookId: string, chapter: number, verses: number[]): boolean => {
      if (!verses.length) return false;
      return savedVerses.some(
        (sv) =>
          sv.bookId === bookId &&
          sv.chapter === chapter &&
          verses.some((v) => sv.verses.includes(v))
      );
    },
    [savedVerses]
  );

  const getSavedVerse = useCallback(
    (bookId: string, chapter: number, verses: number[]): SavedVerseClient | undefined => {
      if (!verses.length) return undefined;
      return savedVerses.find(
        (sv) =>
          sv.bookId === bookId &&
          sv.chapter === chapter &&
          verses.some((v) => sv.verses.includes(v))
      );
    },
    [savedVerses]
  );

  const savedVerseIdsForChapter = useCallback(
    (bookId: string, chapter: number): number[] => {
      return savedVerses
        .filter((sv) => sv.bookId === bookId && sv.chapter === chapter)
        .flatMap((sv) => sv.verses);
    },
    [savedVerses]
  );

  const saveVerse = useCallback(async (payload: SaveVersePayload) => {
    const key = `save:${payload.bookId}:${payload.chapter}:${payload.verses.sort().join(',')}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);

    // Optimistic insert
    const optimistic: SavedVerseClient = {
      _id: `opt_${Date.now()}`,
      bookId: payload.bookId,
      bookName: payload.bookName,
      chapter: payload.chapter,
      verses: [...payload.verses].sort((a, b) => a - b),
      verseRangeText: payload.verseRangeText,
      labels: payload.labels ?? [],
      note: payload.note ?? '',
      version: payload.version,
      isPrivate: payload.isPrivate ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSavedVerses((prev) => {
      // Remove any existing save for the same chapter overlap, then add new
      const filtered = prev.filter(
        (sv) =>
          !(
            sv.bookId === payload.bookId &&
            sv.chapter === payload.chapter &&
            payload.verses.some((v) => sv.verses.includes(v))
          )
      );
      return [optimistic, ...filtered];
    });

    try {
      const res = await fetch('/api/saved-verses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSavedVerses((prev) =>
          prev.map((sv) => (sv._id === optimistic._id ? (json.data as SavedVerseClient) : sv))
        );
      } else {
        // Revert
        setSavedVerses((prev) => prev.filter((sv) => sv._id !== optimistic._id));
      }
    } catch {
      setSavedVerses((prev) => prev.filter((sv) => sv._id !== optimistic._id));
    } finally {
      pendingRef.current.delete(key);
    }
  }, []);

  const updateSavedVerse = useCallback(async (id: string, patch: UpdateVersePayload) => {
    const key = `update:${id}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);

    // Optimistic patch
    let previous: SavedVerseClient | undefined;
    setSavedVerses((prev) =>
      prev.map((sv) => {
        if (sv._id === id) {
          previous = sv;
          return { ...sv, ...patch, updatedAt: new Date().toISOString() };
        }
        return sv;
      })
    );

    try {
      const res = await fetch(`/api/saved-verses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSavedVerses((prev) =>
          prev.map((sv) => (sv._id === id ? (json.data as SavedVerseClient) : sv))
        );
      } else if (previous) {
        setSavedVerses((prev) => prev.map((sv) => (sv._id === id ? previous! : sv)));
      }
    } catch {
      if (previous) setSavedVerses((prev) => prev.map((sv) => (sv._id === id ? previous! : sv)));
    } finally {
      pendingRef.current.delete(key);
    }
  }, []);

  const deleteSavedVerse = useCallback(async (id: string) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);

    let removed: SavedVerseClient | undefined;
    setSavedVerses((prev) => {
      removed = prev.find((sv) => sv._id === id);
      return prev.filter((sv) => sv._id !== id);
    });

    try {
      const res = await fetch(`/api/saved-verses/${id}`, { method: 'DELETE' });
      if (!res.ok && removed) {
        setSavedVerses((prev) => [removed!, ...prev]);
      }
    } catch {
      if (removed) setSavedVerses((prev) => [removed!, ...prev]);
    } finally {
      pendingRef.current.delete(id);
    }
  }, []);

  const addUserLabel = useCallback(async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    // Optimistic add
    setUserLabels((prev) => {
      if (prev.some((l) => l.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [trimmed, ...prev];
    });

    try {
      await fetch('/api/user-labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      });
    } catch (err) {
      console.error('[useSavedVerses] addUserLabel error:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchSavedVerses(), fetchUserLabels()]);
  }, [fetchSavedVerses, fetchUserLabels]);

  return {
    savedVerses,
    isLoading,
    userLabels,
    isLabelsLoading,
    isSaved,
    getSavedVerse,
    savedVerseIdsForChapter,
    saveVerse,
    updateSavedVerse,
    deleteSavedVerse,
    addUserLabel,
    refresh,
  };
}
