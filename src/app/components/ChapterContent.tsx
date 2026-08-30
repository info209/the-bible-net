"use client";
import { useEffect, useState, useRef, PointerEvent, memo } from 'react';
import { useVerseNavigation } from '@/lib/useVerseNavigation';
import { motion } from 'framer-motion';
import { Bookmark, FileText } from 'lucide-react';
import BibleSkeleton from './BibleSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';
import { ChapterCacheService } from '@/lib/offline/ChapterCacheService';

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
  highlights?: any[];
  notes?: any[];
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
): Promise<{ title: string; verses: { number: number; text: string }[]; _isOfflineData?: boolean }> {
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
  onVerseDoubleTap, onVerseTap,
  highlights = [], notes = [],
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
            const hasNote = notes.some(n =>
              n.metadata?.verses?.includes(verse.number) &&
              n.metadata?.chapter === chapter &&
              (n.metadata?.bookId === book || n.metadata?.bookName === book)
            );

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
                    <FileText className="w-[14px] h-[14px] ml-1.5 inline-block text-[var(--color-accent-rose)] fill-none" />
                  )}
                  {isSavedVerse && (
                    <Bookmark className="w-[14px] h-[14px] ml-1.5 inline-block fill-current text-[#31C4BE]" />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ChapterContent);
