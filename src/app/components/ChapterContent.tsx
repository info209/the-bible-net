"use client";
import { useEffect, useState, useRef, PointerEvent, memo, useMemo } from 'react';
import { useVerseNavigation } from '@/lib/useVerseNavigation';
import { motion } from 'framer-motion';
import { Bookmark, FileText } from 'lucide-react';
import BibleSkeleton from './BibleSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';
import { ChapterCacheService } from '@/lib/offline/ChapterCacheService';
import { findCanonicalBookOrder } from '@/utils/bibleBooks';

// Map color IDs (as stored in DB) to actual CSS colors
const HIGHLIGHT_COLOR_MAP: Record<string, string> = {
  yellow: '#FFD234',
  green:  '#4CD964',
  blue:   '#34AADC',
  pink:   '#FF6B9D',
  purple: '#A66CFF',
  orange: '#FF9500',
  red:    '#FF3B30',
  teal:   '#5AC8FA',
  lime:   '#A4D65E',
  rose:   '#FF2D55',
};

export interface ChapterFootnote {
  id?: string;
  verseNumber: number;
  text: string;
  reference?: string;
  marker?: string;
}

interface ChapterContentProps {
  book: string;
  chapter: number;
  font: string;
  fontSize: number;
  version?: string;
  scrollToVerse?: number | null;
  readingVerse?: number | null;
  selectedVerses?: number[];
  savedVerseIds?: number[];
  onVerseDoubleTap?: (verseNumber: number, e?: React.PointerEvent) => void;
  onVerseTap?: (verseNumber: number, e?: React.PointerEvent) => void;
  onVerseLongPress?: (verseNumber: number, e?: React.PointerEvent) => void;
  onOpenVerseNotes?: (verseNumber: number, notes: any[]) => void;
  highlights?: any[];
  notes?: any[];
  showFootnotes?: boolean;
  theme: {
    bg: string;
    text: string;
    verseNumber: string;
  };
  isSliderDragging?: boolean;
  /**
   * Ref from BibleReaderPage that is `true` while a horizontal swipe gesture
   * is active. ChapterContent reads this synchronously in handlePressStart to
   * skip the long-press timer — preventing VerseActionMenu from opening during
   * chapter navigation gestures.
   */
  swipeActiveRef?: React.RefObject<boolean>;
}

export async function fetchChapterContent(
  version: string,
  book: string,
  chapter: number,
  versionId?: string,
): Promise<{ title: string; verses: { number: number; text: string }[]; footnotes?: ChapterFootnote[]; _isOfflineData?: boolean }> {
  try {
    const response = await fetch(
      `/api/v1/bible/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${chapter}`,
    );
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch content');
    }
    const data = {
      title: `${result.data.book.name} ${result.data.chapter.number}`,
      verses: result.data.verses as { number: number; text: string }[],
      footnotes: (result.data.footnotes || []) as ChapterFootnote[],
    };
    // Silently cache this chapter for offline access (fire-and-forget)
    ChapterCacheService.cacheChapter(
      versionId || version,
      book,
      result.data.book.name,
      result.data.book.abbreviation || result.data.book.name,
      chapter,
      result.data.book.testament === 'NT' ? 'NT' : 'OT',
      data.verses,
      data.footnotes,
    ).catch(() => {});
    return data;
  } catch (networkError) {
    // Offline fallback: ALWAYS try serving from IndexedDB whenever network fetch fails!
    try {
      const offlineChapter = await BibleOfflineService.getChapter(versionId || version, book, chapter);
      if (offlineChapter && offlineChapter.verses && offlineChapter.verses.length > 0) {
        return {
          title: `${offlineChapter.bookName} ${chapter}`,
          verses: offlineChapter.verses,
          footnotes: (offlineChapter.footnotes || []) as ChapterFootnote[],
          _isOfflineData: true,
        };
      }
    } catch {
      // Ignore offline lookup error, throw original network error
    }
    throw networkError;
  }
}

/** Extra prop for the offline-aware version ID (MongoDB _id, distinct from abbreviation) */
interface ChapterContentWithVersionIdProps extends ChapterContentProps {
  versionId?: string;
}

function ChapterContent({ 
  book, chapter, font, fontSize, version,
  versionId,
  scrollToVerse, readingVerse, theme, selectedVerses = [], savedVerseIds = [], 
  onVerseDoubleTap, onVerseTap, onOpenVerseNotes,
  highlights = [], notes = [],
  showFootnotes = true,
  isSliderDragging = false,
  swipeActiveRef,
}: ChapterContentWithVersionIdProps) {
  const queryClient = useQueryClient();

  const { data: apiContent, isLoading, error: queryError } = useQuery({
    queryKey: ['chapter-content', version, book, chapter],
    queryFn: () => fetchChapterContent(version || '', book, chapter, versionId),
    enabled: !!book && !!chapter && book !== 'undefined' && !!version,
    staleTime: Infinity, // Bible text never changes
    // Use cached data immediately even if stale — offline experience
    gcTime: 24 * 60 * 60 * 1000, // Keep in memory for 24h
  });

  const error = queryError ? (queryError as Error).message : null;
  const isOfflineData = (apiContent as any)?._isOfflineData === true;

  // Canonical book order resolution for stable cross-version/language matching
  const currentBookOrder = useMemo(() => {
    return findCanonicalBookOrder(book);
  }, [book]);

  // Index notes by verse number for $O(1)$ fast lookup
  const verseNotesMap = useMemo(() => {
    const map = new Map<number, any[]>();
    if (!notes || !notes.length) return map;

    for (const n of notes) {
      const noteBookIdent =
        n.metadata?.bookId ||
        n.metadata?.bookName ||
        n.verses?.[0]?.bookId ||
        n.verses?.[0]?.bookName ||
        (n as any).bookId ||
        (n as any).bookName;

      const noteBookOrder = findCanonicalBookOrder(noteBookIdent);
      if (currentBookOrder !== null && noteBookOrder !== null && currentBookOrder !== noteBookOrder) {
        continue;
      }

      const noteChapter =
        n.metadata?.chapter ??
        n.verses?.[0]?.chapter ??
        (n as any).chapter;

      if (typeof noteChapter === 'number' && noteChapter !== chapter) {
        continue;
      }

      const vList: number[] =
        n.metadata?.verses ??
        n.verses?.[0]?.verses ??
        (typeof n.metadata?.verse === 'number' ? [n.metadata.verse] : []);

      for (const v of vList) {
        const arr = map.get(v) || [];
        arr.push(n);
        map.set(v, arr);
      }
    }

    return map;
  }, [notes, currentBookOrder, chapter]);

  // Pre-fetch adjacent chapters in background while online
  useEffect(() => {
    if (!apiContent || !book || !version || typeof navigator === 'undefined' || !navigator.onLine) return;
    const prefetch = (chapterNum: number) => {
      if (chapterNum < 1) return;
      queryClient.prefetchQuery({
        queryKey: ['chapter-content', version, book, chapterNum],
        queryFn: () => fetchChapterContent(version, book, chapterNum, versionId),
        staleTime: Infinity,
      });
    };
    // Pre-fetch prev and next chapters silently
    prefetch(chapter - 1);
    prefetch(chapter + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, chapter, version]);

  const lastTapRef = useRef<{ verseNum: number; time: number } | null>(null);

  const handleVerseClick = (verseNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (selectedVerses.length > 0) {
      if (onVerseTap) {
        onVerseTap(verseNum, e as unknown as React.PointerEvent);
      }
    } else {
      // Mobile touch double-tap detection
      const nativeEvent = e.nativeEvent as any;
      const isTouch = nativeEvent.pointerType === 'touch' || nativeEvent.touches !== undefined;
      
      if (isTouch) {
        const now = Date.now();
        const lastTap = lastTapRef.current;
        
        if (lastTap && lastTap.verseNum === verseNum && now - lastTap.time < 300) {
          lastTapRef.current = null; // Reset
          
          // Clear text selection
          try { window.getSelection()?.removeAllRanges(); } catch (_) {}
          
          // Haptic feedback
          if ('vibrate' in navigator) {
            try { navigator.vibrate(50); } catch (err) {}
          }
          
          if (onVerseDoubleTap) {
            onVerseDoubleTap(verseNum, e as unknown as React.PointerEvent);
          }
        } else {
          lastTapRef.current = { verseNum, time: now };
        }
      }
    }
  };

  const handleVerseDoubleClick = (verseNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (selectedVerses.length === 0) {
      // Clear text selection
      try { window.getSelection()?.removeAllRanges(); } catch (_) {}
      
      // Haptic feedback
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (err) {}
      }
      
      if (onVerseDoubleTap) {
        onVerseDoubleTap(verseNum, e as unknown as React.PointerEvent);
      }
    }
  };

  const content = apiContent;

  // Canonical verse navigation — uses MutationObserver, no setTimeout races.
  // isChapterReady is true only when data has been fetched and rendered, so
  // the hook never attempts to scroll before the verse elements exist.
  useVerseNavigation({
    book,
    chapter,
    verseNumber: isSliderDragging ? null : (scrollToVerse ?? null),
    isChapterReady: !isLoading && !!apiContent && !!(apiContent.verses?.length),
  });

  if (error && !content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center">
        <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to load content</h3>
        <p className="text-gray-500 max-w-xs">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-primary-teal text-white rounded-full font-medium shadow-lg hover:bg-primary-teal-dark transition-all">Try Again</button>
      </div>
    );
  }

  if (isLoading || !book || !version || book === 'undefined' || !apiContent) {
    return <BibleSkeleton theme={theme} />;
  }

  const isDarkTheme = theme.bg === '#1c1c1e';

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
      className="px-4 sm:px-6 py-6 sm:py-8"
      style={{ paddingBottom: 'var(--reading-bottom-padding, 80px)' }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
           <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme.text, fontFamily: font }}>{apiContent.title}</h2>
           <div className="h-1 w-12 bg-accent-rose mt-4 rounded-full opacity-80" />
        </div>
        <div className="space-y-1 leading-relaxed text-justify" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
          {apiContent.verses?.map((verse: { number: number; text: string }) => {
            const isSelected = selectedVerses.includes(verse.number);
            const isReading = readingVerse === verse.number;
            const isSavedVerse = savedVerseIds.includes(verse.number);
            const highlight = highlights.find(h =>
              h.metadata?.verse === verse.number &&
              h.metadata?.chapter === chapter &&
              (h.metadata?.bookId === book || h.metadata?.bookName === book)
            );
            
            const verseNotes = verseNotesMap.get(verse.number) || [];
            const hasNote = verseNotes.length > 0;

            // Determine background: highlight > transparent
            let bgColor: string;
            if (highlight?.metadata?.color && highlight.metadata.color !== 'none') {
              bgColor = (HIGHLIGHT_COLOR_MAP[highlight.metadata.color] ?? highlight.metadata.color) + '55';
            } else {
              bgColor = 'transparent';
            }

            return (
              <div
                key={verse.number}
                id={`verse-${book}-${chapter}-${verse.number}`}
                className="relative transition-all duration-200 rounded px-2 py-0.5 cursor-pointer hover:bg-black/[0.02] scroll-mt-[120px]"
                onClick={(e) => handleVerseClick(verse.number, e)}
                onDoubleClick={(e) => handleVerseDoubleClick(verse.number, e)}
                style={{
                  color: theme.text,
                  backgroundColor: bgColor,
                }}
              >
                {isReading && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#31C4BE] rounded-l" />
                )}
                <sup className="font-bold mr-1.5 select-none opacity-60" style={{ color: theme.verseNumber }}>{verse.number}</sup>
                <span
                  className={`${isReading ? 'font-bold' : 'font-normal'}`}
                  style={isSelected ? {
                    textDecoration: 'underline',
                    textDecorationStyle: 'dashed',
                    textDecorationColor: 'var(--color-accent-rose)',
                    textUnderlineOffset: '4px',
                  } : undefined}
                >
                  {verse.text}
                  {hasNote && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVerseNotes?.(verse.number, verseNotes);
                      }}
                      className="inline-flex items-center justify-center p-0.5 ml-1.5 align-middle rounded hover:scale-110 active:scale-95 transition-all text-[var(--color-accent-rose)] focus:outline-none cursor-pointer"
                      title={`View notes for ${book} ${chapter}:${verse.number}`}
                      aria-label={`View notes for ${book} ${chapter}:${verse.number}`}
                    >
                      <FileText className="w-[14px] h-[14px] fill-none" />
                    </button>
                  )}
                  {isSavedVerse && (
                    <Bookmark className="w-[14px] h-[14px] ml-1.5 inline-block fill-current text-[#31C4BE]" />
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footnotes Section at bottom of content */}
        {showFootnotes && apiContent?.footnotes && apiContent.footnotes.length > 0 && (
          <div
            className="mt-10 pt-6 border-t"
            style={{
              borderColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <h3
                className="text-xs font-bold uppercase tracking-wider select-none"
                style={{ color: theme.verseNumber, opacity: 0.85 }}
              >
                Footnotes
              </h3>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: theme.verseNumber,
                }}
              >
                {apiContent.footnotes.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {apiContent.footnotes.map((fn: ChapterFootnote, idx: number) => {
                const refStr = fn.reference || `${book} ${chapter}:${fn.verseNumber || 1}`;
                return (
                  <div
                    key={fn.id || `fn-${idx}`}
                    className="text-xs leading-relaxed flex items-start gap-2.5 p-2.5 rounded-xl transition-colors"
                    style={{
                      backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      color: theme.text,
                    }}
                  >
                    <span
                      className="font-bold shrink-0 text-[11px] px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        color: theme.verseNumber,
                      }}
                    >
                      {refStr}
                    </span>
                    <span className="flex-1 opacity-90 text-[12px]">{fn.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default memo(ChapterContent);
