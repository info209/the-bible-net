"use client";
import { useEffect, useState, useRef, PointerEvent } from 'react';
import { motion } from 'framer-motion';
import BibleSkeleton from './BibleSkeleton';
import { teluguBible, hindiBible } from './BibleData';

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
  onVerseLongPress?: (verseNumber: number, e?: React.MouseEvent | React.TouchEvent) => void;
  onVerseTap?: (verseNumber: number, e?: React.MouseEvent | React.TouchEvent) => void;
  highlights?: any[];
  notes?: any[];
  theme: {
    bg: string;
    text: string;
    verseNumber: string;
  };
}

// Mock Bible content by book and chapter (English)
export const mockBibleContent: { [key: string]: { [key: number]: { title: string; verses: { number: number; text: string }[] } } } = {
  'Genesis': {
    1: {
      title: 'The History of Creation',
      verses: [
        { number: 1, text: "In the beginning God created the heavens and the earth." },
        { number: 2, text: "The earth was without form, and void; and darkness was on the face of the deep. And the Spirit of God was hovering over the face of the waters." },
        { number: 3, text: "Then God said, 'Let there be light'; and there was light." },
        { number: 4, text: "And God saw the light, that it was good; and God divided the light from the darkness." },
        { number: 5, text: "God called the light Day, and the darkness He called Night. So the evening and the morning were the first day." },
        { number: 6, text: "Then God said, 'Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.'" },
        { number: 7, text: "Thus God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament; and it was so." },
        { number: 8, text: "And God called the firmament Heaven. So the evening and the morning were the second day." },
        { number: 9, text: "Then God said, 'Let the waters under the heavens be gathered together into one place, and let the dry land appear'; and it was so." },
        { number: 10, text: "And God called the dry land Earth, and the gathering together of the waters He called Seas. And God saw that it was good." },
        { number: 11, text: "Then God said, 'Let the earth bring forth grass, the herb that yields seed, and the fruit tree that yields fruit according to its kind, whose seed is in itself, on the earth'; and it was so." },
        { number: 12, text: "And the earth brought forth grass, the herb that yields seed according to its kind, and the tree that yields fruit, whose seed is in itself according to its kind. And God saw that it was good." },
        { number: 13, text: "So the evening and the morning were the third day." },
        { number: 14, text: "Then God said, 'Let there be lights in the firmament of the heavens to divide the day from the night; and let them be for signs and seasons, and for days and years;'" },
        { number: 15, text: "and let them be for lights in the firmament of the heavens to give light on the earth'; and it was so." },
        { number: 16, text: "Then God made two great lights: the greater light to rule the day, and the lesser light to rule the night. He made the stars also." },
        { number: 17, text: "God set them in the firmament of the heavens to give light on the earth," },
        { number: 18, text: "and to rule over the day and over the night, and to divide the light from the darkness. And God saw that it was good." },
        { number: 19, text: "So the evening and the morning were the fourth day." },
        { number: 20, text: "Then God said, 'Let the waters abound with an abundance of living creatures, and let birds fly above the earth across the face of the firmament of the heavens.'" },
        { number: 21, text: "So God created great sea creatures and every living thing that moves, with which the waters abounded, according to their kind, and every winged bird according to its kind. And God saw that it was good." },
        { number: 22, text: "And God blessed them, saying, 'Be fruitful and multiply, and fill the waters in the seas, and let birds multiply on the earth.'" },
        { number: 23, text: "So the evening and the morning were the fifth day." },
        { number: 24, text: "Then God said, 'Let the earth bring forth the living creature according to its kind: cattle and creeping thing and beast of the earth, each according to its kind'; and it was so." },
        { number: 25, text: "And God made the beast of the earth according to its kind, cattle according to its kind, and everything that creeps on the earth according to its kind. And God saw that it was good." },
        { number: 26, text: "Then God said, 'Let Us make man in Our image, according to Our likeness; let them have dominion over the fish of the sea, over the birds of the air, and over the cattle, over all the earth and over every creeping thing that creeps on the earth.'" },
        { number: 27, text: "So God created man in His own image; in the image of God He created him; male and female He created them." },
        { number: 28, text: "Then God blessed them, and God said to them, 'Be fruitful and multiply; fill the earth and subdue it; have dominion over the fish of the sea, over the birds of the air, and over every living thing that moves on the earth.'" },
        { number: 29, text: "And God said, 'See, I have given you every herb that yields seed which is on the face of all the earth, and every tree whose fruit yields seed; to you it shall be for food.'" },
        { number: 30, text: "Also, to every beast of the earth, to every bird of the air, and to everything that creeps on the earth, in which there is life, I have given every green herb for food'; and it was so." },
        { number: 31, text: "Then God saw everything that He had made, and indeed it was very good. So the evening and the morning were the sixth day." }
      ]
    }
  }
};

const defaultContent = {
  title: 'Sample Chapter Content',
  verses: [
    { number: 1, text: "In the beginning God created the heaven and the earth." }
  ]
};

export default function ChapterContent({ 
  book, chapter, font, fontSize, version = 'NKJV', 
  scrollToVerse, readingVerse, theme, selectedVerses = [], 
  onVerseLongPress, onVerseTap,
  highlights = [], notes = []
}: ChapterContentProps) {
  const [apiContent, setApiContent] = useState<{ title: string; verses: { number: number; text: string }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{x: number, y: number} | null>(null);
  const isLongPressRef = useRef(false);

  const handlePressStart = (e: React.MouseEvent | React.TouchEvent, verseNum: number) => {
    // Only handle left click for mouse
    if ('button' in e && e.button !== 0) return;
    
    // Stop propagation to prevent parent gestures from taking over immediately
    // but don't preventDefault yet so scrolling can still start
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    console.log(`[VersePress] Start verse ${verseNum} at (${Math.round(clientX)}, ${Math.round(clientY)})`);
    
    touchStartPosRef.current = { x: clientX, y: clientY };
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    
    isLongPressRef.current = false;
    
    longPressTimerRef.current = setTimeout(() => {
      console.log(`[VersePress] Trigger long press for verse ${verseNum}`);
      if (onVerseLongPress) onVerseLongPress(verseNum, e);
      isLongPressRef.current = true;
      longPressTimerRef.current = null;
      
      // If mobile, try to provide haptic feedback if available
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (e) {}
      }
    }, 600); // 600ms for a distinctive long press
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!touchStartPosRef.current) return;
    
    const dist = Math.sqrt(
      Math.pow(e.clientX - touchStartPosRef.current.x, 2) + 
      Math.pow(e.clientY - touchStartPosRef.current.y, 2)
    );
    
    // If moved more than 10px, it's a scroll or swipe, not a long press
    if (dist > 10) {
      if (longPressTimerRef.current) {
        console.log(`[VersePress] Cancel: Movement detected (${Math.round(dist)}px)`);
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handlePressEnd = (e: React.MouseEvent | React.TouchEvent, verseNum: number) => {
    const isLong = isLongPressRef.current;
    
    console.log(`[VersePress] End verse ${verseNum}. WasLong: ${isLong}`);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    if (!touchStartPosRef.current) return;

    if (isLong) {
       touchStartPosRef.current = null;
       isLongPressRef.current = false;
       return; 
    }

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
    
    const moveDist = Math.sqrt(
      Math.pow(clientX - touchStartPosRef.current.x, 2) + 
      Math.pow(clientY - touchStartPosRef.current.y, 2)
    );
    
    // If not a long press and moved very little, it's a tap
    if (moveDist < 15) {
      console.log(`[VersePress] Trigger tap for verse ${verseNum}`);
      if (onVerseTap) onVerseTap(verseNum, e);
    }
    
    touchStartPosRef.current = null;
    isLongPressRef.current = false;
  };

  const handlePressCancel = () => {
    if (longPressTimerRef.current) {
      console.log(`[VersePress] Cancel: Press interrupted`);
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
    isLongPressRef.current = false;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchContent = async () => {
      if (!book || !chapter || book === 'undefined' || !version) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/v1/bible/${encodeURIComponent(version)}/${encodeURIComponent(book)}/${chapter}`);
        const result = await response.json();
        if (isMounted) {
          if (result.success) {
            setApiContent({
              title: `${result.data.book.name} ${result.data.chapter.number}`,
              verses: result.data.verses
            });
          } else {
            setError(result.error || 'Failed to fetch content');
            setApiContent(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError('An error occurred while fetching content');
          setApiContent(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchContent();
    return () => { isMounted = false; };
  }, [book, chapter, version]);

  const content = apiContent;

  useEffect(() => {
    if (scrollToVerse && scrollToVerse >= 1 && content?.verses?.length) {
      const timer = setTimeout(() => {
        const verseElement = document.getElementById(`verse-${book}-${chapter}-${scrollToVerse}`);
        if (verseElement) {
          const scrollContainer = document.querySelector('[class*="overflow-y-auto"]');
          if (scrollContainer) {
            const elementTop = verseElement.getBoundingClientRect().top;
            const containerTop = scrollContainer.getBoundingClientRect().top;
            const currentScroll = scrollContainer.scrollTop;
            const targetScroll = currentScroll + elementTop - containerTop - 180;
            scrollContainer.scrollTo({ top: targetScroll, behavior: 'smooth' });
          } else {
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scrollToVerse, book, chapter, content]);

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
      className="px-4 sm:px-6 py-6 sm:py-8 pb-[180px]"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
           <h2 className="text-2xl font-bold tracking-tight" style={{ color: theme.text, fontFamily: font }}>{apiContent.title}</h2>
           <div className="h-1 w-12 bg-accent-rose mt-4 rounded-full opacity-80" />
        </div>
        <div className="space-y-3 leading-loose text-justify" style={{ fontFamily: font, fontSize: `${fontSize}px` }}>
          {apiContent.verses?.map(verse => {
            const isSelected = selectedVerses.includes(verse.number);
            const isReading = readingVerse === verse.number;
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

            return (
              <div
                key={verse.number}
                id={`verse-${book}-${chapter}-${verse.number}`}
                className="relative transition-all duration-200 rounded px-2 py-1 select-none cursor-pointer hover:bg-black/[0.02]"
                onMouseDown={(e) => handlePressStart(e, verse.number)}
                onMouseUp={(e) => handlePressEnd(e, verse.number)}
                onMouseLeave={handlePressCancel}
                onTouchStart={(e) => handlePressStart(e, verse.number)}
                onTouchEnd={(e) => handlePressEnd(e, verse.number)}
                onTouchCancel={handlePressCancel}
                onPointerMove={handlePointerMove}
                style={{
                  color: theme.text,
                  backgroundColor: highlight?.metadata?.color && highlight.metadata.color !== 'none'
                    ? (HIGHLIGHT_COLOR_MAP[highlight.metadata.color] ?? highlight.metadata.color) + '66'
                    : (isReading ? 'var(--color-primary-teal-subtle)' : 'transparent'),
                }}
              >
                <sup className="font-bold mr-1.5 select-none opacity-60" style={{ color: theme.verseNumber }}>{verse.number}</sup>
                <span
                  className={`${isReading ? 'font-medium' : 'font-normal'}`}
                  style={isSelected ? {
                    textDecoration: 'underline',
                    textDecorationStyle: 'dashed',
                    textDecorationColor: 'var(--color-accent-rose)',
                    textUnderlineOffset: '4px',
                  } : undefined}
                >
                  {verse.text}
                  {hasNote && (
                    <span className="ml-2 inline-flex items-center justify-center">
                      <span className="size-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    </span>
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
