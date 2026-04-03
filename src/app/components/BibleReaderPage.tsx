"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Home, Book, BookOpen, Compass, Play, Pause, MoreVertical, X, ChevronLeft, ChevronRight, Check, List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText, Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Gauge, Timer, Circle, Activity, SlidersHorizontal, Square, Bookmark, BookmarkCheck, Repeat, Repeat1 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSavedItems } from '@/lib/useSavedItems';
import { RiSortDesc, RiSortAlphabetAsc } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import BibleSkeleton, { BookListSkeleton, VersionListSkeleton, ComparisonSkeleton } from './BibleSkeleton';
import AppHeader from './AppHeader';
import PageTurnTransition from './PageTurnTransition';

import { useMediaStore } from '@/lib/mediaStore';
import ChapterContent, { mockBibleContent } from './ChapterContent';
import ComparisonContent from './ComparisonContent';
import VerseActionMenu from './VerseActionMenu';
// import AudioControlPanel from './AudioControlPanel';
// import BibleSearch from './BibleSearch';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { teluguBible, hindiBible } from './BibleData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const bibleBooks = {
  'Old Testament': [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
    'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
    'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
  ],
  'New Testament': [
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
    'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
    '1 John', '2 John', '3 John', 'Jude', 'Revelation'
  ]
};

// Initial versions as fallback
const initialVersions = [
  { name: 'NKJV', fullName: 'New King James Version', language: 'English' },
  { name: 'KJV', fullName: 'King James Version', language: 'English' },
  { name: 'NASB', fullName: 'New American Standard Bible', language: 'English' },
  { name: 'AMP', fullName: 'Amplified Bible', language: 'English' },
  { name: 'TEL', fullName: 'పవిత్ర గ్రంథము', language: 'Telugu' },
  { name: 'HIN', fullName: 'पवित्र बाइबिल', language: 'Hindi' },
];

// Chapter counts for each book
const bookChapters: { [key: string]: number } = {
  'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36, 'Deuteronomy': 34,
  'Joshua': 24, 'Judges': 21, 'Ruth': 4, '1 Samuel': 31, '2 Samuel': 24,
  '1 Kings': 22, '2 Kings': 25, '1 Chronicles': 29, '2 Chronicles': 36, 'Ezra': 10,
  'Nehemiah': 13, 'Esther': 10, 'Job': 42, 'Psalms': 150, 'Proverbs': 31,
  'Ecclesiastes': 12, 'Song of Solomon': 8, 'Isaiah': 66, 'Jeremiah': 52, 'Lamentations': 5,
  'Ezekiel': 48, 'Daniel': 12, 'Hosea': 14, 'Joel': 3, 'Amos': 9,
  'Obadiah': 1, 'Jonah': 4, 'Micah': 7, 'Nahum': 3, 'Habakkuk': 3,
  'Zephaniah': 3, 'Haggai': 2, 'Zechariah': 14, 'Malachi': 4,
  'Matthew': 28, 'Mark': 16, 'Luke': 24, 'John': 21, 'Acts': 28,
  'Romans': 16, '1 Corinthians': 16, '2 Corinthians': 13, 'Galatians': 6, 'Ephesians': 6,
  'Philippians': 4, 'Colossians': 4, '1 Thessalonians': 5, '2 Thessalonians': 3,
  '1 Timothy': 6, '2 Timothy': 4, 'Titus': 3, 'Philemon': 1, 'Hebrews': 13,
  'James': 5, '1 Peter': 5, '2 Peter': 3, '1 John': 5, '2 John': 1,
  '3 John': 1, 'Jude': 1, 'Revelation': 22
};

interface BibleReaderPageProps {
  onNavigate?: (page: 'home' | 'bible' | 'library' | 'explore') => void;
}

export default function BibleReaderPage({ onNavigate }: BibleReaderPageProps) {
  const { currentVerse, setCurrentVerse, setCurrentChapter: setStoreChapter } = useMediaStore();
  const { updateProgress, latestProgress } = useReadingProgress();
  const { data: session } = useSession();
  const router = useRouter();
  const { isSaved, getSavedItem, toggleSave, saveItem } = useSavedItems();

  // determine whether we are on bible page; if not, render only nav bar
  const pathname = usePathname();
  const isBiblePage = pathname?.startsWith('/bible') || false;

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [displayBookName, setDisplayBookName] = useState<string>('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [displayVersionName, setDisplayVersionName] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [hideFootnotes, setHideFootnotes] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);
  const [showVerseSelector, setShowVerseSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);

  // Stable refs — avoid stale closures in utterance event handlers
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsPlayingRef = useRef(false);
  const ttsPausedRef = useRef(false);
  const ttsIndexRef = useRef(0);
  const isCleaningUpRef = useRef(false);
  const [ttsCurrentVerseIndex, setTtsCurrentVerseIndex] = useState(0);
  // TTS settings
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [ttsVoice, setTtsVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  
  // Selection State
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  

  const handleVerseLongPress = useCallback((verseNum: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) return prev;
      return [...prev, verseNum];
    });
  }, []);

  const handleVerseTap = useCallback((verseNum: number, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.stopPropagation();
    setSelectedVerses(prev => {
      if (prev.length === 0) return prev; // If not in selection mode, ignore
      if (prev.includes(verseNum)) {
        return prev.filter(v => v !== verseNum);
      } else {
        return [...prev, verseNum];
      }
    });
  }, []);

  // Handlers for menu actions
  const onVerseMenuClose = () => setSelectedVerses([]);
  const onVerseMenuHighlight = async (color: string) => { 
    if (!session?.user || selectedVerses.length === 0) return;
    
    // For each selected verse, save a highlight
    for (const verseNum of selectedVerses) {
      const refId = `${selectedBookId}_${selectedChapter}_${verseNum}_${selectedVersionId}`;
      await saveItem({
        type: 'highlight',
        refId,
        metadata: {
          bookId: selectedBookId || undefined,
          chapter: selectedChapter,
          verse: verseNum,
          versionId: selectedVersionId || undefined,
          color
        }
      });
    }
    setSelectedVerses([]); 
  };

  const onVerseMenuSave = async (labels: string[]) => { 
    if (!session?.user || selectedVerses.length === 0) return;

    for (const verseNum of selectedVerses) {
      const refId = `${selectedBookId}_${selectedChapter}_${verseNum}_${selectedVersionId}`;
      await saveItem({
        type: 'bible',
        refId,
        metadata: {
          bookId: selectedBookId || undefined,
          chapter: selectedChapter,
          verse: verseNum,
          versionId: selectedVersionId || undefined,
          labels
        }
      });
    }
    setSelectedVerses([]); 
  };

  const onVerseMenuNote = async (note: string) => { 
    if (!session?.user || selectedVerses.length === 0) return;

    // A note can cover multiple verses? Usually notes are per verse or per selection.
    // For now, let's save it to the first verse in selection or a compound refId.
    const refId = `${selectedBookId}_${selectedChapter}_${selectedVerses.join('-')}_${selectedVersionId}`;
    await saveItem({
      type: 'note',
      refId,
      metadata: {
        bookId: selectedBookId || undefined,
        chapter: selectedChapter,
        verses: selectedVerses,
        versionId: selectedVersionId || undefined,
        content: note
      }
    });
    setSelectedVerses([]); 
  };
  const onVerseMenuCompare = () => { 
    setComparisonMode(true); 
    if (!secondVersionId) {
        const defaultV2 = bibleVersions.find(v => v.id !== selectedVersionId) || bibleVersions[0];
        if (defaultV2) {
            setSecondVersionId(defaultV2.id);
            setDisplaySecondVersionName(defaultV2.name);
        }
    }
    setTtsPlaying(false);
    setTtsPaused(false);
    setSelectedVerses([]);
  };

  const onVerseMenuShare = () => {
    const shareText = `Check out these verses from ${displayBookName} ${selectedChapter}`;
    if (navigator.share) {
        navigator.share({ title: 'Bible Verses', text: shareText }).catch(console.error);
    } else {
        alert(shareText);
    }
    setSelectedVerses([]);
  };

  const [repeatMode, setRepeatMode] = useState<'none' | 'chapter' | 'verse'>('none');
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const isLongPressRef = useRef(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTouchRef = useRef(false); // Track touch events to prevent mouse double-fire
  const handleNextRef = useRef<() => void>(() => {}); // Stable ref for TTS auto-advance
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [fontSize, setFontSize] = useState(18);
  const [pageTransition, setPageTransition] = useState<'slide' | 'curl' | 'fade' | 'scroll'>('slide');
  const [chapterKey, setChapterKey] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const isTransitioningRef = useRef(false);
  const [showSearch, setShowSearch] = useState(false);
  const [bookSortType, setBookSortType] = useState<'traditional' | 'alphabetical'>('traditional');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [secondVersionId, setSecondVersionId] = useState<string | null>(null);
  const [displaySecondVersionName, setDisplaySecondVersionName] = useState('NKJV');
  
  // Version state
  const [bibleVersions, setBibleVersions] = useState<any[]>(initialVersions);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  // Book/Chapter state from API
  const [bibleBooksState, setBibleBooksState] = useState<{ 'Old Testament': { id: string, name: string }[], 'New Testament': { id: string, name: string }[] }>({ 'Old Testament': bibleBooks['Old Testament'].map(n => ({ id: n, name: n })), 'New Testament': bibleBooks['New Testament'].map(n => ({ id: n, name: n })) });
  const [currentBookChapters, setCurrentBookChapters] = useState<number>(bookChapters['Genesis']);
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);

  // Current chapter verses for narration
  const [currentChapterVerses, setCurrentChapterVerses] = useState<any[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Parse URL to set initial state or handle navigation
  useEffect(() => {
    if (!pathname || !pathname.startsWith('/bible')) return;
    
    // Pattern: /bible/{version}/{book}/{chapter} or just /bible
    const segments = pathname.split('/').filter(Boolean); // e.g., ["bible", "kjv", "genesis", "1"]
    
    if (segments.length >= 4) {
      const [_, urlVersion, urlBook, urlChapter] = segments;
      
      // Update version
      if (urlVersion && displayVersionName !== urlVersion && urlVersion !== 'undefined') {
          const matchingVer = bibleVersions.find(v => v.name === urlVersion || v.id === urlVersion);
          if (matchingVer) {
              setSelectedVersionId(matchingVer.id);
              setDisplayVersionName(matchingVer.fullName || matchingVer.name);
          }
      }
      
      // Update book/chapter
      if (urlBook && urlBook !== 'undefined') {
          // Normalize book name to compare
          const normalizedBook = urlBook.replace(/-/g, ' ');
          const allBooks = [...bibleBooksState['Old Testament'], ...bibleBooksState['New Testament']];
          const matchingBook = allBooks.find(b => b.name.toLowerCase() === normalizedBook.toLowerCase() || b.id === urlBook);
          
          if (matchingBook && selectedBookId !== matchingBook.id) {
              setSelectedBookId(matchingBook.id);
              setDisplayBookName(matchingBook.name);
          }
      }
      
      if (urlChapter && parseInt(urlChapter) !== selectedChapter) {
          setSelectedChapter(parseInt(urlChapter) || 1);
      }
    } else if (segments.length === 1 && latestProgress && !selectedBookId) {
        // Just /bible opened - load latest progress if we haven't set a book yet
        setSelectedVersionId(latestProgress.versionId);
        setDisplayVersionName(latestProgress.versionName || null);
        setSelectedBookId(latestProgress.bookId);
        setDisplayBookName(latestProgress.bookName || 'Genesis');
        setSelectedChapter(latestProgress.chapter);
    }
  }, [pathname, bibleVersions]); // Removed state dependencies to prevent resetting user selection back to URL state

  // Helper to check if any selection/settings popup is open
  const isAnyPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMoreMenu ||
    showSettingsMenu || showSearch || showVerseSelector;

  // ESC key closes any open popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showBookSelector) setShowBookSelector(false);
      else if (showChapterSelector) setShowChapterSelector(false);
      else if (showVerseSelector) setShowVerseSelector(false);
      else if (showVersionSelector) setShowVersionSelector(false);
      else if (showSettingsMenu) setShowSettingsMenu(false);
      else if (showMoreMenu) setShowMoreMenu(false);
      else if (showSearch) setShowSearch(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBookSelector, showChapterSelector, showVerseSelector, showVersionSelector, showSettingsMenu, showMoreMenu, showSearch]);

  // Fetch Bible Versions on mount
  useEffect(() => {
    // Optimization: Don't hit Bible APIs if not on Bible page
    if (!isBiblePage) return;

    const fetchVersions = async () => {
      setIsLoadingVersions(true);
      try {
        const response = await fetch('/api/v1/bible/versions');
        const result = await response.json();
        if (result.success && result.data.length > 0) {
          // Map API versions to match the UI format
          const mappedVersions = result.data.map((v: any) => ({
            id: v._id,
            name: v.abbreviation,
            fullName: v.name,
            language: v.language === 'en' ? 'English' : v.language === 'te' ? 'Telugu' : v.language === 'hi' ? 'Hindi' : v.language
          }));
          setBibleVersions(mappedVersions);
          if (mappedVersions.length > 0 && !selectedVersionId) {
            const kjvVersion = mappedVersions.find((v: any) => v.name === 'KJV' || v.name === 'KJV-BSI') || mappedVersions[0];
            setSelectedVersionId(kjvVersion.id);
            setDisplayVersionName(kjvVersion.fullName);
          }
        }
      } catch (err) {
        console.error('Failed to fetch versions:', err);
      } finally {
        setIsLoadingVersions(false);
      }
    };
    fetchVersions();
  }, []);

  // Fetch books when version changes
  useEffect(() => {
    // Optimization: Don't hit Bible APIs if not on Bible page
    if (!isBiblePage) return;

    const fetchBooks = async () => {
      if (!selectedVersionId) return;
      
      

      setIsLoadingBooks(true);
      try {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/books`);
        const result = await response.json();
        if (result.success) {
          const books = result.data;
          // Enhanced filtering to handle missing testament field
          const ot = books.filter((b: any) => {
            if (b.testament) return b.testament === 'OT';
            return b.order <= 39; // Traditional OT count
          }).map((b: any) => ({ id: b._id, name: b.name }));
          
          const nt = books.filter((b: any) => {
            if (b.testament) return b.testament === 'NT';
            return b.order > 39; // Traditional NT start
          }).map((b: any) => ({ id: b._id, name: b.name }));

          setBibleBooksState({
            'Old Testament': ot,
            'New Testament': nt
          });
          
          const allNewBooks = [...ot, ...nt];
          
          if (!selectedBookId) {
            if (ot.length > 0) {
              const genesisBook = ot.find((b: any) => b.name === 'Genesis') || ot[0];
              setSelectedBookId(genesisBook.id);
              setDisplayBookName(genesisBook.name);
            } else if (nt.length > 0) {
              setSelectedBookId(nt[0].id);
              setDisplayBookName(nt[0].name);
            }
          } else {
            // Version switched: find the equivalent book ID in the newly fetched books
            const matchingBook = allNewBooks.find((b: any) => b.name === displayBookName);
            if (matchingBook) {
              setSelectedBookId(matchingBook.id);
              // displayBookName remains the same
            } else if (allNewBooks.length > 0) {
              setSelectedBookId(allNewBooks[0].id);
              setDisplayBookName(allNewBooks[0].name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch books:', err);
      } finally {
        setIsLoadingBooks(false);
      }
    };
    fetchBooks();
  }, [selectedVersionId]);

  // Fetch chapter count when book changes
  useEffect(() => {
    // Optimization: Don't hit Bible APIs if not on Bible page
    if (!isBiblePage) return;

    const fetchChapters = async () => {
      if (!selectedVersionId || !selectedBookId) return;
      
      

      try {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBookId}/chapters`);
        const result = await response.json();
        if (result.success) {
          // If chapters are returned, set the count
          if (Array.isArray(result.data)) {
            setCurrentBookChapters(result.data.length);
          } else if (result.data && typeof result.data === 'object' && result.data.count) {
            setCurrentBookChapters(result.data.count);
          } else {
            // Fallback
            setCurrentBookChapters(bookChapters[displayBookName] || 1);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chapters:', err);
        setCurrentBookChapters(bookChapters[displayBookName] || 1);
      }
    };
    fetchChapters();
  }, [selectedBookId, selectedVersionId]);

  // Sync names when IDs are available but the labels reflect the ID (MongoID fallback)
  useEffect(() => {
    if (selectedVersionId && bibleVersions.length > 0) {
        // If displayVersionName is null or looks like an ID, try to find the proper name
        const isId = (s: string | null) => !s || s.length === 24 && /^[0-9a-fA-F]+$/.test(s);
        if (isId(displayVersionName)) {
            const matchingVer = bibleVersions.find(v => v.id === selectedVersionId);
            if (matchingVer) {
                setDisplayVersionName(matchingVer.fullName || matchingVer.name);
            }
        }
    }
  }, [selectedVersionId, bibleVersions, displayVersionName]);

  useEffect(() => {
      const allBooks = [...bibleBooksState['Old Testament'], ...bibleBooksState['New Testament']];
      if (selectedBookId && allBooks.length > 0) {
          const isId = (s: string | null) => !s || s.length === 24 && /^[0-9a-fA-F]+$/.test(s);
          if (isId(displayBookName)) {
              const matchingBook = allBooks.find(b => b.id === selectedBookId);
              if (matchingBook) {
                  setDisplayBookName(matchingBook.name);
              }
          }
      }
  }, [selectedBookId, bibleBooksState, displayBookName]);

  // Fetch verses for narration
  useEffect(() => {
    // Optimization: Don't hit Bible APIs if not on Bible page
    if (!isBiblePage) return;

    const fetchVerses = async () => {
      if (!selectedVersionId || !selectedBookId || !selectedChapter) return;
      
      

      
      setIsLoadingContent(true);
      try {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBookId}/${selectedChapter}`);
        const result = await response.json();
        if (result.success) {
          setCurrentChapterVerses(result.data.verses);
          // Sync with media store
          setStoreChapter(selectedBookId, selectedChapter, selectedVersionId);
        }
      } catch (err) {
        console.error('Failed to fetch verses:', err);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchVerses();
  }, [selectedBookId, selectedChapter, selectedVersionId, bibleVersions]);

  // Debugging logs for state synchronization
  useEffect(() => {
    
    
    
  }, [selectedVersionId, selectedBookId, selectedChapter]);

  // Track Reading Progress on Chapter Open
  useEffect(() => {
    if (selectedBookId && selectedVersionId) {
      updateProgress({
        bookId: selectedBookId,
        bookName: displayBookName,
        chapter: selectedChapter,
        versionId: selectedVersionId,
        versionName: displayVersionName || selectedVersionId,
        completed: false
      });
    }
  }, [selectedBookId, selectedChapter, selectedVersionId, updateProgress, displayBookName, displayVersionName]);

  // Touch/swipe state for interactive slide
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const gestureDetected = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll detection state - only for bottom nav
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [showAudioControls, setShowAudioControls] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const lastScrollY = useRef(0);
  const scrollDirectionRef = useRef<'down' | 'up'>('up');
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastStateToggleTime = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);







  // Helper functions for navigation
  const allBooks = [...bibleBooksState['Old Testament'], ...bibleBooksState['New Testament']];
  const currentBookIndex = allBooks.findIndex(b => b.id === selectedBookId);
  const isFirstChapterOfBible = selectedBookId === allBooks[0]?.id && selectedChapter === 1;
  const isLastChapterOfBible = selectedBookId === allBooks[allBooks.length - 1]?.id && selectedChapter === currentBookChapters;

  const totalChapters = currentBookChapters;

  // Get next chapter info for preview during drag
  const getNextChapter = () => {
    if (selectedChapter < totalChapters) {
      return { book: displayBookName, chapter: selectedChapter + 1 };
    } else if (currentBookIndex < allBooks.length - 1) {
      return { book: allBooks[currentBookIndex + 1].name, chapter: 1 };
    }
    return { book: displayBookName, chapter: selectedChapter };
  };

  // Get previous chapter info for preview during drag
  const getPrevChapter = () => {
    if (selectedChapter > 1) {
      return { book: displayBookName, chapter: selectedChapter - 1 };
    } else if (currentBookIndex > 0) {
      const prevBook = allBooks[currentBookIndex - 1];
      return { book: prevBook.name, chapter: bookChapters[prevBook.name] || 50 };
    }
    return { book: displayBookName, chapter: selectedChapter };
  };
  const nextChapterInfo = getNextChapter();
  const prevChapterInfo = getPrevChapter();

  // Navigate to specific verse from search
  const handleNavigateToVerse = (book: { id: string, name: string }, chapter: number, verse: number) => {
    setSelectedBookId(book.id);
                              setDisplayBookName(book.name);
    setSelectedChapter(chapter);
    setSelectedVerse(verse);
    setShowSearch(false);

    // Scroll to the verse after a short delay to allow state to update
    setTimeout(() => {
      const verseElement = document.getElementById(`verse-${book.id}-${chapter}-${verse}`);
      if (verseElement && scrollContainerRef.current) {
        const elementTop = verseElement.getBoundingClientRect().top;
        const containerTop = scrollContainerRef.current.getBoundingClientRect().top;
        const currentScroll = scrollContainerRef.current.scrollTop;
        const targetScroll = currentScroll + elementTop - containerTop - 100;

        scrollContainerRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      }
    }, 300);
  };

  const handlePrevious = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const lockDuration = pageTransition === 'curl' ? 900 : pageTransition === 'slide' ? 550 : pageTransition === 'fade' ? 450 : 650;
    setTimeout(() => { isTransitioningRef.current = false; }, lockDuration);

    setTransitionDirection('prev');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      if (selectedChapter > 1) {
        setSelectedChapter(selectedChapter - 1);
      } else if (currentBookIndex > 0) {
        const prevBook = allBooks[currentBookIndex - 1];
        setSelectedBookId(prevBook.id);
        setDisplayBookName(prevBook.name);
        setSelectedChapter(bookChapters[prevBook.name] || 50);
      }
    }, 50);
  };

  const handleNext = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const lockDuration = pageTransition === 'curl' ? 900 : pageTransition === 'slide' ? 550 : pageTransition === 'fade' ? 450 : 650;
    setTimeout(() => { isTransitioningRef.current = false; }, lockDuration);

    setTransitionDirection('next');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      if (selectedChapter < totalChapters) {
        setSelectedChapter(selectedChapter + 1);
      } else if (currentBookIndex < allBooks.length - 1) {
        const nextBook = allBooks[currentBookIndex + 1];
        setSelectedBookId(nextBook.id);
        setDisplayBookName(nextBook.name);
        setSelectedChapter(1);
      }
    }, 50);
  };

  // ─── TTS ENGINE (Stable ref-based, no stale closures) ───────────────────────

  // Load voices once (browsers fire onvoiceschanged asynchronously)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Keep refs in sync with state so event handlers never have stale values
  useEffect(() => { ttsPlayingRef.current = ttsPlaying; }, [ttsPlaying]);
  useEffect(() => { ttsPausedRef.current = ttsPaused; }, [ttsPaused]);
  useEffect(() => { ttsIndexRef.current = ttsCurrentVerseIndex; }, [ttsCurrentVerseIndex]);
  const repeatModeRef = useRef(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  // Internal speak function — reads from refs, never from state
  // Handle real-time volume/rate updates
  useEffect(() => {
    if (ttsPlaying && !ttsPaused && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      speakAtIndex(ttsCurrentVerseIndex);
    }
  }, [ttsVolume, ttsRate]);

  // States for highlights and notes
  const [userHighlights, setUserHighlights] = useState<any[]>([]);
  const [userNotes, setUserNotes] = useState<any[]>([]);

  // Fetch highlights and notes for current chapter
  useEffect(() => {
    if (!session?.user || !selectedBookId || !selectedChapter) return;
    
    const fetchData = async () => {
      try {
        // Fetch highlights
        const hRes = await fetch(`/api/user/saved-items?type=highlight&bookId=${selectedBookId}&chapter=${selectedChapter}`);
        const hData = await hRes.json();
        if (hData.success) setUserHighlights(hData.data);

        // Fetch notes
        const nRes = await fetch(`/api/user/saved-items?type=note&bookId=${selectedBookId}&chapter=${selectedChapter}`);
        const nData = await nRes.json();
        if (nData.success) setUserNotes(nData.data);
      } catch (err) {
        console.error("Failed to fetch highlights/notes:", err);
      }
    };
    
    fetchData();
  }, [session?.user, selectedBookId, selectedChapter]);

  const speakAtIndex = useCallback((index: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isCleaningUpRef.current) return;
    if (!ttsPlayingRef.current || ttsPausedRef.current) return;
    if (!currentChapterVerses || index >= currentChapterVerses.length) {
      // End of chapter — stop cleanly
      ttsPlayingRef.current = false;
      setTtsPlaying(false);
      setTtsPaused(false);

      if (repeatModeRef.current === 'chapter' && currentChapterVerses && currentChapterVerses.length > 0) {
        // Loop the chapter
        ttsPlayingRef.current = true;
        setTtsPlaying(true);
        setTimeout(() => speakAtIndex(0), 10);
      } else if (repeatModeRef.current === 'none') {
        // Auto-advance to next chapter
        setTimeout(() => handleNextRef.current(), 300);
      }
      return;
    }

    window.speechSynthesis.cancel(); // cancel any lingering utterance

    const verse = currentChapterVerses[index];
    const utterance = new SpeechSynthesisUtterance(verse.text);

    // Language
    const lang = bibleVersions.find(v => v.id === selectedVersionId)?.language;
    utterance.lang = lang === 'Telugu' ? 'te-IN' : lang === 'Hindi' ? 'hi-IN' : 'en-US';

    // Settings from state at call time (not stale refs)
    utterance.rate = ttsRate;
    utterance.volume = ttsVolume;
    if (ttsVoice) utterance.voice = ttsVoice;

    utterance.onstart = () => {
      if (isCleaningUpRef.current) return;
      ttsIndexRef.current = index;
      setTtsCurrentVerseIndex(index);
      setCurrentVerse(verse.number);
    };

    utterance.onend = () => {
      if (isCleaningUpRef.current) return;
      if (ttsPlayingRef.current && !ttsPausedRef.current) {
        if (repeatModeRef.current === 'verse') {
          speakAtIndex(index);
        } else if (repeatModeRef.current === 'none' || repeatModeRef.current === 'chapter') {
          speakAtIndex(index + 1);
        }
      }
    };

    utterance.onerror = (event) => {
      // 'interrupted' fires when we call cancel() intentionally — safe to ignore
      if (event.error === 'interrupted' || isCleaningUpRef.current) return;
      console.error('SpeechSynthesis error:', event.error);
      ttsPlayingRef.current = false;
      setTtsPlaying(false);
      setTtsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [currentChapterVerses, bibleVersions, selectedVersionId]);

  // Sync volume/rate changes with active utterance instantly
  useEffect(() => {
    if (utteranceRef.current) {
      utteranceRef.current.rate = ttsRate;
      utteranceRef.current.volume = ttsVolume;
    }
  }, [ttsRate, ttsVolume]);

  // Public TTS controls
  const stopTTS = useCallback(() => {
    isCleaningUpRef.current = false;
    ttsPlayingRef.current = false;
    ttsPausedRef.current = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    ttsIndexRef.current = 0;
    setTtsCurrentVerseIndex(0);
    setTtsPlaying(false);
    setTtsPaused(false);
    setCurrentVerse(null);
  }, []);

  const startTTS = useCallback((fromIndex?: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const idx = fromIndex ?? ttsIndexRef.current;
    ttsPlayingRef.current = true;
    ttsPausedRef.current = false;
    isCleaningUpRef.current = false;
    setTtsPlaying(true);
    setTtsPaused(false);
    speakAtIndex(idx);
  }, [speakAtIndex]);

  const pauseTTS = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.pause();
    ttsPausedRef.current = true;
    setTtsPaused(true);
  }, []);

  const resumeTTS = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Clear paused refs FIRST — speakAtIndex checks ttsPausedRef.current at entry
    // and returns early if still true, so we must clear before calling it
    ttsPausedRef.current = false;
    setTtsPaused(false);
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    } else {
      // Browser didn't maintain the paused utterance — re-speak from saved index
      speakAtIndex(ttsIndexRef.current);
    }
  }, [speakAtIndex]);

  const toggleTTS = useCallback(() => {
    if (!ttsPlaying && !ttsPaused) {
      startTTS();
    } else if (ttsPlaying && !ttsPaused) {
      pauseTTS();
    } else if (ttsPaused) {
      resumeTTS();
    }
  }, [ttsPlaying, ttsPaused, startTTS, pauseTTS, resumeTTS]);

  // Long press handling — separate touch vs mouse to prevent double-fire on mobile
  const handlePlaybackTouchStart = useCallback(() => {
    isTouchRef.current = true; // Mark as touch interaction
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsControlPanelOpen(true);
    }, 1500);
  }, []);

  const handlePlaybackTouchEnd = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      toggleTTS();
    }
    isLongPressRef.current = false;
  }, [toggleTTS]);

  const handlePlaybackMouseDown = useCallback(() => {
    if (isTouchRef.current) return; // Skip if touch already handled
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setIsControlPanelOpen(true);
    }, 1500);
  }, []);

  const handlePlaybackMouseUp = useCallback(() => {
    if (isTouchRef.current) {
      isTouchRef.current = false; // Reset for next interaction
      return;
    }
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      toggleTTS();
    }
    isLongPressRef.current = false;
  }, [toggleTTS]);

  const handlePlaybackPressCancel = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    isLongPressRef.current = false;
    isTouchRef.current = false;
  }, []);

  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentChapterVerses.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, x / rect.width));
    const newVerseIndex = Math.floor(progress * currentChapterVerses.length);
    
    // Stop and restart from new index
    stopTTS();
    setTimeout(() => startTTS(newVerseIndex), 10);
  }, [currentChapterVerses.length, stopTTS, startTTS]);

  // TTS Control additions
  const handlePrevVerse = useCallback(() => {
    if (ttsCurrentVerseIndex > 0) {
      stopTTS();
      setTimeout(() => startTTS(ttsCurrentVerseIndex - 1), 50);
    }
  }, [ttsCurrentVerseIndex, stopTTS, startTTS]);

  const handleNextVerse = useCallback(() => {
    if (currentChapterVerses && ttsCurrentVerseIndex < currentChapterVerses.length - 1) {
      stopTTS();
      setTimeout(() => startTTS(ttsCurrentVerseIndex + 1), 50);
    }
  }, [ttsCurrentVerseIndex, currentChapterVerses, stopTTS, startTTS]);

  const toggleRepeatMode = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'none') return 'verse';
      if (prev === 'verse') return 'chapter';
      return 'none';
    });
  }, []);

  // Reset TTS when chapter / book / version changes
  useEffect(() => {
    isCleaningUpRef.current = false;
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    ttsPlayingRef.current = false;
    ttsPausedRef.current = false;
    ttsIndexRef.current = 0;
    setTtsCurrentVerseIndex(0);
    setTtsPlaying(false);
    setTtsPaused(false);
    setCurrentVerse(null);
  }, [selectedBookId, selectedChapter, selectedVersionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Keep handleNextRef in sync so TTS auto-advance can call it
  useEffect(() => { handleNextRef.current = handleNext; });

  // Auto-scroll to current verse during TTS playback
  useEffect(() => {
    if (!ttsPlaying || ttsPaused || !currentVerse) return;
    const el = document.getElementById(
      `verse-${selectedBookId}-${selectedChapter}-${currentVerse}`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentVerse, ttsPlaying, ttsPaused, selectedBookId, selectedChapter]);

  // Interactive drag handlers for slide transition
  const handleTouchStart = (e: React.TouchEvent) => {
    if (pageTransition !== 'slide') return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    gestureDetected.current = 'none';
    // Don't set isDragging yet - wait to detect gesture direction
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pageTransition !== 'slide') return;

    touchEndX.current = e.touches[0].clientX;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect gesture direction only once
    if (gestureDetected.current === 'none' && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      if (Math.abs(diffY) > Math.abs(diffX)) {
        gestureDetected.current = 'vertical';
      } else {
        gestureDetected.current = 'horizontal';
        setIsDragging(true); // Only engage drag system for horizontal gestures
      }
    }

    // If vertical scroll, do nothing - let native scrolling work
    if (gestureDetected.current === 'vertical') {
      return;
    }

    // If horizontal and dragging is engaged, handle page navigation
    if (gestureDetected.current === 'horizontal' && isDragging) {
      // Limit drag to prevent going forward from last chapter or backward from first
      if (diffX < 0 && isLastChapterOfBible) return;
      if (diffX > 0 && isFirstChapterOfBible) return;

      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (pageTransition !== 'slide') {
      // For non-slide transitions, use simple swipe detection
      const swipeThreshold = 75;
      const diff = touchStartX.current - touchEndX.current;

      if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0 && !isLastChapterOfBible) {
          handleNext();
        } else if (diff < 0 && !isFirstChapterOfBible) {
          handlePrevious();
        }
      }
      return;
    }

    if (!isDragging) return;

    const threshold = window.innerWidth * 0.3; // 30% of screen width

    if (Math.abs(dragOffset) > threshold) {
      // Complete the transition
      if (dragOffset < 0 && !isLastChapterOfBible) {
        // Swiped left - go to next chapter
        handleNext();
      } else if (dragOffset > 0 && !isFirstChapterOfBible) {
        // Swiped right - go to previous chapter
        handlePrevious();
      }
    }

    // Reset drag state
    setIsDragging(false);
    setDragOffset(0);
    gestureDetected.current = 'none';
  };

  // Get transition animation variants
  const getTransitionVariants = (): Variants => {
    const direction = transitionDirection === 'next' ? 1 : -1;

    switch (pageTransition) {
      case 'slide':
        return {
          initial: {
            x: `${100 * direction}%`,
            opacity: 1,
          },
          animate: {
            x: 0,
            opacity: 1,
            transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
          },
          exit: {
            x: `${-100 * direction}%`,
            opacity: 1,
            transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }
          }
        };

      // curl is handled by <PageTurnTransition> directly — this fallback is not used
      case 'curl':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };

      case 'fade':
        return {
          initial: { opacity: 0, scale: 0.985 },
          animate: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }
          },
          exit: {
            opacity: 0,
            scale: 0.985,
            transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] }
          }
        };

      case 'scroll':
      default: {
        const px = direction > 0 ? 70 : -70;
        return {
          initial: { y: px, opacity: 0 },
          animate: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
          },
          exit: {
            y: -px,
            opacity: 0,
            transition: { duration: 0.3, ease: [0.55, 0, 1, 0.45] }
          }
        };
      }
    }
  };

  const transitionConfig = {
    slide: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
    curl:  { duration: 0.8,  ease: [0.4, 0, 0.2, 1] },
    fade:  { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
    scroll: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  } as const;

  // Theme configurations
  const themeConfig = {
    light: {
      bg: '#fefefe',
      text: '#31393a',
      verseNumber: '#db6175'
    },
    sepia: {
      bg: '#f5e6d3',
      text: '#5c4a3a',
      verseNumber: '#c44a61'
    },
    cream: {
      bg: '#fef3e2',
      text: '#4a3f2a',
      verseNumber: '#d4596d'
    },
    dark: {
      bg: '#2e3737',
      text: '#e5e7e7',
      verseNumber: '#ff6b85'
    }
  };

  const currentTheme = themeConfig[selectedTheme];

  // Reset selectedVerse when chapter or book changes - set to null so it doesn't auto-scroll
  useEffect(() => {
    // Clear selected verse so chapter opens at the top naturally
    setSelectedVerse(null);
  }, [selectedBookId, selectedChapter]);

  // Scroll detection logic - optimized to fix flickering
  useEffect(() => {
    let lastKnownScrollY = 0;
    let ticking = false;
    const threshold = 10; // Only toggle after 10px of movement
    const headerHeight = 100; // Point where header definitely hides

    const updateScroll = () => {
      if (!scrollContainerRef.current) {
        ticking = false;
        return;
      }

      const currentScrollY = scrollContainerRef.current.scrollTop;
      const scrollHeight = scrollContainerRef.current.scrollHeight;
      const clientHeight = scrollContainerRef.current.clientHeight;
      const scrolledToBottom = scrollHeight - currentScrollY - clientHeight < 50;

      // Tracking progress
      const scrollProgress = (currentScrollY + clientHeight) / scrollHeight;
      if (scrollProgress >= 0.75 && selectedBookId && selectedVersionId) {
        updateProgress({
          bookId: selectedBookId,
          bookName: displayBookName,
          chapter: selectedChapter,
          versionId: selectedVersionId,
          versionName: displayVersionName || undefined,
          completed: true
        });
      }

      setIsAtBottom(scrolledToBottom);

      // Flicker Prevention with Hysteresis and Debounce
      const now = Date.now();
      const diff = currentScrollY - lastKnownScrollY;
      const absDiff = Math.abs(diff);
      
      if (scrolledToBottom) {
        setShowBottomNav(true);
        setShowAudioControls(true);
      } else if (currentScrollY <= 50) {
        setShowBottomNav(true);
        setShowAudioControls(true);
      } else if (absDiff >= (diff > 0 ? 60 : 20)) { // Hysteresis: hide threshold 60, show threshold 20
        if (now - lastStateToggleTime.current > 500) { // Lock frequent toggling
          const isScrollingDown = currentScrollY > lastKnownScrollY;
          if (currentScrollY > 150) {
            if (isScrollingDown) {
              setShowBottomNav(false);
              setShowAudioControls(false);
            } else {
              setShowBottomNav(true);
              setShowAudioControls(true);
            }
            lastStateToggleTime.current = now;
          }
        }
        lastKnownScrollY = currentScrollY;
      }

      // 3. Keep showing if inactivity at bottom, but hide if inactivity in middle
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      if (currentScrollY > 200 && !scrolledToBottom && showBottomNav) {
        scrollTimeout.current = setTimeout(() => {
          setShowBottomNav(false);
          setShowAudioControls(false);
        }, 8000); // Wait longer before auto-hiding
      }

      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      };
    }
  }, [selectedBookId, selectedChapter, selectedVersionId, displayBookName, displayVersionName]);

  // Dispatch reading mode event to client layout (also hide footer when control panel/bottom sheet is open)
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('bible-reading-mode', { detail: { isReadingMode: !showBottomNav || isAnyPopupOpen || isControlPanelOpen } })
    );
  }, [showBottomNav, isAnyPopupOpen, isControlPanelOpen]);
  
  // Safari-specific fix: Trigger minimal scroll when entering Reading Mode to encourage address bar hide
  useEffect(() => {
    if (!showBottomNav && scrollContainerRef.current) {
        // Only trigger if we are at the very top (safari address bar trick)
        if (scrollContainerRef.current.scrollTop === 0) {
            scrollContainerRef.current.scrollTop = 1;
        }
    }
  }, [showBottomNav]);

  // Bible narration functions
  const getBibleContent = () => {
    if (currentChapterVerses && currentChapterVerses.length > 0) {
      return currentChapterVerses;
    }

    // Fallback to mock data if API data is not yet loaded
    /*
    let bibleData = mockBibleContent;
    if (selectedVersionId === 'TEL' || selectedVersionId === 'TELBSI') {
      bibleData = teluguBible as any;
    } else if (selectedVersionId === 'HIN' || selectedVersionId === 'HINBSI') {
      bibleData = hindiBible as any;
    }
    return bibleData[selectedBook]?.[selectedChapter]?.verses || [];
    */
    return [];
  };




  return (
    <div className="fixed inset-0 h-[100dvh] bg-[var(--app-bg)] flex flex-col z-[100] overflow-hidden">
      {/* Scrollable Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-32"
      >
        {/* Header Section Grouped for Reading Mode - STICKY CONTAINER */}
        <div className="sticky top-0 left-0 right-0 z-50 flex flex-col">
          {/* Main Header/Navbar - SCROLLS AWAY (Hides) */}
          <div 
            className={`transition-all duration-300 ease-in-out overflow-hidden z-[50] ${
              !showBottomNav ? 'h-0 opacity-0 pointer-events-none' : 'h-16 opacity-100'
            }`}
          >
            <AppHeader onMenuOpen={() => setMenuOpen(true)} className="!static" />
          </div>

          {/* Sub Navigation Bar - REMAINS STICKY (Static relative to its sticky parent) */}
          <div className="glass-ios border-b border-white/20 shadow-sm w-full">
            <div className="max-w-3xl mx-auto px-4 py-1">
            <div className="flex items-center justify-between">
              {/* Book/Chapter/Version selectors */}
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setShowBookSelector(!showBookSelector);
                    setShowChapterSelector(false);
                    setShowVersionSelector(false);
                  }}
                  className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
                >
                  <span className="text-sm font-normal">
                    {displayBookName?.length === 24 && /^[0-9a-fA-F]+$/.test(displayBookName) ? (isLoadingBooks ? 'Loading...' : displayBookName) : (displayBookName || 'Genesis')}
                  </span>
                  <ChevronDown className="size-3" />
                </button>

                <button
                  onClick={() => {
                    setShowChapterSelector(!showChapterSelector);
                    setShowBookSelector(false);
                    setShowVersionSelector(false);
                  }}
                  className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
                >
                  <span className="text-sm font-normal">{selectedChapter}</span>
                  <ChevronDown className="size-3" />
                </button>

                <button
                  onClick={() => {
                    setShowVersionSelector(!showVersionSelector);
                    setShowBookSelector(false);
                    setShowChapterSelector(false);
                  }}
                  className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
                >
                  <span className="text-sm font-normal">
                    {(displayVersionName?.length === 24 && /^[0-9a-fA-F]+$/.test(displayVersionName)) || !displayVersionName
                        ? (isLoadingVersions ? 'Loading...' : 'Select Version')
                        : displayVersionName}
                  </span>
                  <ChevronDown className="size-3" />
                </button>
              </div>

              {/* Right side tools - Settings */}
              <div className="flex items-center -space-x-1 ml-auto mr-3">
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
                >
                  <FiSearch className="size-5 text-[var(--color-gray-900)]" />
                </button>
                <button
                  onClick={() => setShowMoreMenu(true)}
                  className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
                >
                  <MoreVertical className="size-5 text-[var(--color-gray-900)]" />
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Selector panels */}
        <Dialog open={showBookSelector} onOpenChange={setShowBookSelector}>
          <DialogContent className="max-w-[360px] max-h-[80vh] p-0 gap-0 overflow-hidden rounded-xl [&>[data-slot=dialog-close]]:hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Books</h3>

                <div className="flex items-center gap-3">
                  {/* Sort Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-primary)] font-medium">
                      {bookSortType === 'traditional' ? 'Traditional' : 'Alphabetical'}
                    </span>
                    <div className="flex bg-gray-200/80 rounded-full p-0.5">
                      <button
                        onClick={() => setBookSortType('traditional')}
                        className={`p-1.5 rounded-full transition-all ${bookSortType === 'traditional'
                          ? 'bg-white shadow-sm'
                          : 'bg-transparent'
                          }`}
                        aria-label="Traditional sort"
                      >
                        <RiSortDesc className={`size-4 ${bookSortType === 'traditional' ? 'text-[var(--color-accent-rose)]' : 'text-[var(--color-text-primary)]/60'
                          }`} />
                      </button>
                      <button
                        onClick={() => setBookSortType('alphabetical')}
                        className={`p-1.5 rounded-full transition-all ${bookSortType === 'alphabetical'
                          ? 'bg-white shadow-sm'
                          : 'bg-transparent'
                          }`}
                        aria-label="Alphabetical sort"
                      >
                        <RiSortAlphabetAsc className={`size-4 ${bookSortType === 'alphabetical' ? 'text-[var(--color-accent-rose)]' : 'text-[var(--color-text-primary)]/60'
                          }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 max-h-[calc(80vh-80px)] px-4 pb-4">
                {isLoadingBooks ? (
                  <BookListSkeleton />
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Old Testament */}
                    <div>
                      <h4 style={{background:"#ffffff"}} className="sticky top-0 text-[var(--color-text-primary)] mb-4 text-xl font-bold z-10 pt-1">Old Testament</h4>
                      <div className="space-y-2">
                        {(bookSortType === 'alphabetical'
                          ? [...bibleBooksState['Old Testament']].sort((a, b) => a.name.localeCompare(b.name))
                          : bibleBooksState['Old Testament']
                        ).map((book: { id: string, name: string }) => (
                          <button
                            key={typeof book === 'string' ? book : book.id}
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setDisplayBookName(book.name);
                              setShowBookSelector(false);
                              setSelectedChapter(1);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBookId === book.id
                              ? 'text-[var(--color-accent-rose)] font-medium'
                              : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                              }`}
                          >
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* New Testament */}
                    <div>
                      <h4 style={{background:"#ffffff"}} className="sticky top-0 text-[var(--color-text-primary)] mb-4 text-xl font-bold z-10 pt-1">New Testament</h4>
                      <div className="space-y-2">
                        {(bookSortType === 'alphabetical'
                          ? [...bibleBooksState['New Testament']].sort((a, b) => a.name.localeCompare(b.name))
                          : bibleBooksState['New Testament']
                        ).map((book: { id: string, name: string }) => (
                          <button
                            key={typeof book === 'string' ? book : book.id}
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setDisplayBookName(book.name);
                              setShowBookSelector(false);
                              setSelectedChapter(1);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBookId === book.id
                              ? 'text-[var(--color-accent-rose)] font-medium'
                              : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                              }`}
                          >
                            {book.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showChapterSelector} onOpenChange={setShowChapterSelector}>
          <DialogContent className="max-w-[360px] max-h-[80vh] p-0 gap-0 overflow-hidden rounded-xl [&>[data-slot=dialog-close]]:hidden">
              {/* Header with Done button */}
              <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
                <div className="w-16"></div> {/* Spacer for centering */}
                <h3 className="text-base font-normal text-[#31393a]">Select chapter</h3>
                <button
                  onClick={() => setShowChapterSelector(false)}
                  className="text-sm text-[#31393a] hover:text-[#d23952] transition-colors px-2"
                >
                  Done
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 max-h-[calc(80vh-80px)] px-4 py-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                    <button
                      key={chapter}
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setShowChapterSelector(false);
                        setShowVerseSelector(true);
                      }}
                      className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${selectedChapter === chapter
                        ? 'bg-[var(--color-accent-rose-lighter)] text-[var(--color-accent-rose)] font-medium'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-gray-200)]'
                        }`}
                    >
                      {chapter.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showVerseSelector} onOpenChange={setShowVerseSelector}>
          <DialogContent className="max-w-[360px] max-h-[80vh] p-0 gap-0 overflow-hidden rounded-xl [&>[data-slot=dialog-close]]:hidden">
              {/* Header with Back and Done buttons */}
              <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
                <button
                  onClick={() => {
                    setShowVerseSelector(false);
                    setShowChapterSelector(true);
                  }}
                  className="flex items-center space-x-1 text-sm text-[#31393a] hover:text-[#d23952] transition-colors"
                >
                  <ChevronLeft className="size-4" />
                  <span>Back</span>
                </button>
                <h3 className="text-base font-normal text-[#31393a]">Select verse</h3>
                <button
                  onClick={() => {
                    setShowVerseSelector(false);
                    setShowChapterSelector(false);
                  }}
                  className="text-sm text-[#31393a] hover:text-[#d23952] transition-colors px-2"
                >
                  Done
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 max-h-[calc(80vh-80px)] px-4 py-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(verse => (
                    <button
                      key={verse}
                      onClick={() => {
                        setSelectedVerse(verse);
                        setShowVerseSelector(false);
                        setShowChapterSelector(false);
                      }}
                      className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${selectedVerse === verse
                        ? 'bg-[var(--color-accent-rose-lighter)] text-[var(--color-accent-rose)] font-medium'
                        : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-gray-200)]'
                        }`}
                    >
                      {verse.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showVersionSelector} onOpenChange={setShowVersionSelector}>
          <DialogContent className="max-w-[360px] max-h-[80vh] p-0 gap-0 overflow-hidden rounded-xl [&>[data-slot=dialog-close]]:hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Bible Versions</h3>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 max-h-[calc(80vh-80px)] px-4 pb-4">
                {isLoadingVersions ? (
                  <VersionListSkeleton />
                ) : (
                  <div className="space-y-3">
                    {/* List versions by language */}
                    {['English', 'Telugu', 'Hindi'].map(lang => (
                      <div key={lang} className="space-y-2">
                        <p className="text-sm text-[#31393a]/60 mb-2">{lang}</p>
                        {bibleVersions.filter(v => v.language === lang).map(version => (
                          <button
                            key={version.name}
                            onClick={() => {
                              if (comparisonMode) {
                                setSecondVersionId(version.id);
                                setDisplaySecondVersionName(version.fullName);
                              } else {
                                setSelectedVersionId(version.id);
                                setDisplayVersionName(version.fullName);
                              }
                              setShowVersionSelector(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 rounded transition-colors ${(comparisonMode ? secondVersionId : selectedVersionId) === version.id
                              ? 'bg-[#fbebee] text-[#d23952]'
                              : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                              }`}
                          >
                            <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                          </button>
                        ))}
                      </div>
                    ))}

                    {/* Any other languages */}
                    {Array.from(new Set(bibleVersions.map(v => v.language)))
                      .filter(lang => !['English', 'Telugu', 'Hindi'].includes(lang))
                      .map(lang => (
                        <div key={lang} className="space-y-2">
                          <p className="text-sm text-[#31393a]/60 mb-2">{lang}</p>
                          {bibleVersions.filter(v => v.language === lang).map(version => (
                            <button
                              key={version.name}
                              onClick={() => {
                                if (comparisonMode) {
                                  setSecondVersionId(version.id);
                                  setDisplaySecondVersionName(version.fullName);
                                } else {
                                  setSelectedVersionId(version.id);
                                  setDisplayVersionName(version.fullName);
                                }
                                setShowVersionSelector(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded transition-colors ${(comparisonMode ? secondVersionId : selectedVersionId) === version.id
                                ? 'bg-[#fbebee] text-[#d23952]'
                                : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                                }`}
                            >
                              <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                            </button>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
          </DialogContent>
        </Dialog>





        {/* More Menu (Three Dots) - Simple menu with options */}
        {showMoreMenu && (() => {
          // Build the refId for the current chapter
          const chapterRefId = selectedBookId && selectedVersionId
            ? `${selectedBookId}_${selectedChapter}_${selectedVersionId}`
            : null;
          const chapterSaved = chapterRefId ? isSaved('bible', chapterRefId) : false;
          const savedDoc = chapterRefId ? getSavedItem('bible', chapterRefId) : undefined;

          const handleSaveChapter = async () => {
            if (!session?.user) {
              setShowMoreMenu(false);
              router.push('/auth/signin');
              return;
            }
            if (!chapterRefId || !selectedBookId || !selectedVersionId) return;
            setShowMoreMenu(false);
            await toggleSave({
              type: 'bible',
              refId: chapterRefId,
              metadata: {
                bookId: selectedBookId,
                bookName: displayBookName,
                chapter: selectedChapter,
                versionId: selectedVersionId,
                versionName: displayVersionName ?? undefined,
              },
            });
          };

          return (
          <Dialog open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <DialogContent className="max-w-[280px] p-0 gap-0 overflow-hidden rounded-xl [&>[data-slot=dialog-close]]:hidden">
              <div className="py-2">
                {/* Save Chapter */}
                <button
                  id="save-chapter-btn"
                  onClick={handleSaveChapter}
                  className="w-full px-4 py-3 text-left text-base hover:bg-gray-100/50 transition-colors flex items-center gap-3"
                >
                  {chapterSaved ? (
                    <BookmarkCheck className="size-5 text-[#41ADB0] flex-shrink-0" />
                  ) : (
                    <Bookmark className="size-5 text-[#31393a]/60 flex-shrink-0" />
                  )}
                  <span className={chapterSaved ? 'text-[#41ADB0] font-medium' : 'text-[#31393a]'}>
                    {chapterSaved ? 'Chapter Saved' : 'Save Chapter'}
                  </span>
                </button>

                <Separator className="mx-4" />

                {/* Fonts & Settings Option */}
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowSettingsMenu(true);
                  }}
                  className="w-full px-4 py-3 text-left text-base text-[#31393a] hover:bg-gray-100/50 transition-colors flex items-center justify-between"
                >
                  <span>Fonts & Settings</span>
                  <ChevronRight className="size-4 text-[#31393a]/40" />
                </button>

                {/* Comparison Mode Toggle */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors">
                  <span className="text-base text-[#31393a]">Comparison Mode</span>
                  <Switch
                    checked={comparisonMode}
                    onCheckedChange={(checked) => {
                      setComparisonMode(checked);
                      if (checked && !secondVersionId) {
                        const defaultV2 = bibleVersions.find(v => v.id !== selectedVersionId) || bibleVersions[0];
                        if (defaultV2) {
                            setSecondVersionId(defaultV2.id);
                            setDisplaySecondVersionName(defaultV2.name);
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                    className="data-[state=checked]:bg-[#006a6f]"
                  />
                </div>

                {/* Hide Footnotes Toggle */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors">
                  <span className="text-base text-[#31393a]">Hide footnotes</span>
                  <Switch
                    checked={hideFootnotes}
                    onCheckedChange={setHideFootnotes}
                    className="data-[state=checked]:bg-[#006a6f]"
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          );
        })()}

        <Sheet open={showSettingsMenu} onOpenChange={setShowSettingsMenu}>
          <SheetContent side="right" className="w-full max-w-[380px] p-0 border-none [&>[data-slot=sheet-close]]:hidden">
            <SheetHeader className="sr-only">
              <SheetTitle>Fonts & Settings</SheetTitle>
              <SheetDescription>Customize your reading experience</SheetDescription>
            </SheetHeader>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="w-12" /> {/* Spacer instead of Back button */}
                <h3 className="text-lg font-bold text-[#0f172a]">Fonts & Settings</h3>
                <button
                  onClick={() => setShowSettingsMenu(false)}
                  className="text-sm font-bold text-[#006a6f] hover:text-[#005a5f] transition-colors"
                >
                  Done
                </button>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
                <div className="px-4 py-6 space-y-6">
                {/* Font Family Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#0f172a]/80 uppercase tracking-wide">Font family</label>
                  <div className="relative">
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 border border-gray-300 rounded-xl text-base font-medium text-[#0f172a] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#006a6f] transition-all"
                    >
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Arial">Arial</option>
                      <option value="Verdana">Verdana</option>
                      <option value="Helvetica">Helvetica</option>
                      <option value="Merriweather">Merriweather</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-[#31393a] pointer-events-none" />
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[#0f172a]/80 uppercase tracking-wide">Font size</label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-[#0f172a]">A</span>
                    <div className="flex-1 relative">
                      <input
                        type="range"
                        min="12"
                        max="24"
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:size-6
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-[#d23952]
                          [&::-webkit-slider-thumb]:border-4
                          [&::-webkit-slider-thumb]:border-[#f1c2c9]
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-moz-range-thumb]:size-6
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-[#d23952]
                          [&::-moz-range-thumb]:border-4
                          [&::-moz-range-thumb]:border-[#f1c2c9]
                          [&::-moz-range-thumb]:cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #d23952 0%, #d23952 ${((fontSize - 12) / 12) * 100}%, #ededed ${((fontSize - 12) / 12) * 100}%, #ededed 100%)`
                        }}
                      />
                    </div>
                    <span className="text-sm text-[#31393a]">A+</span>
                  </div>
                </div>

                {/* Theme Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[#0f172a]/80 uppercase tracking-wide">Theme</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedTheme('light')}
                      className={`size-11 rounded-full border-2 transition-all ${selectedTheme === 'light'
                        ? 'border-[#31393a] scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: '#ffffff' }}
                    />
                    <button
                      onClick={() => setSelectedTheme('sepia')}
                      className={`size-11 rounded-full border-2 transition-all ${selectedTheme === 'sepia'
                        ? 'border-[#31393a] scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: '#f5e6d3' }}
                    />
                    <button
                      onClick={() => setSelectedTheme('cream')}
                      className={`size-11 rounded-full border-2 transition-all ${selectedTheme === 'cream'
                        ? 'border-[#31393a] scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: '#fef3e2' }}
                    />
                    <button
                      onClick={() => setSelectedTheme('dark')}
                      className={`size-11 rounded-full border-2 transition-all ${selectedTheme === 'dark'
                        ? 'border-[#ffffff] scale-110'
                        : 'border-gray-300'
                        }`}
                      style={{ backgroundColor: '#2e3737' }}
                    />
                  </div>
                </div>

                {/* Page Transitions */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-[#0f172a]/80 uppercase tracking-wide">Page transitions</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPageTransition('slide')}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${pageTransition === 'slide'
                        ? 'border-[#31393a] bg-gray-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <ArrowRightLeft className="size-6 text-[#31393a]" />
                      <span className="text-xs text-[#31393a]">Slide</span>
                    </button>
                    <button
                      onClick={() => setPageTransition('curl')}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${pageTransition === 'curl'
                        ? 'border-[#31393a] bg-gray-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <FileText className="size-6 text-[#31393a]" />
                      <span className="text-xs text-[#31393a]">Curl</span>
                    </button>
                    <button
                      onClick={() => setPageTransition('fade')}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${pageTransition === 'fade'
                        ? 'border-[#31393a] bg-gray-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <Zap className="size-6 text-[#31393a]" />
                      <span className="text-xs text-[#31393a]">Fast Fade</span>
                    </button>
                    <button
                      onClick={() => setPageTransition('scroll')}
                      className={`flex flex-col items-center gap-2 px-3 py-3 rounded-lg border-2 transition-all ${pageTransition === 'scroll'
                        ? 'border-[#31393a] bg-gray-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <ScrollText className="size-6 text-[#31393a]" />
                      <span className="text-xs text-[#31393a]">Scroll</span>
                    </button>
                  </div>
                </div>
                </div>
              </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Main Reading Content */}
        <div
          className="transition-colors duration-300 relative overflow-hidden"
          style={{ backgroundColor: currentTheme.bg }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {comparisonMode ? (
            <ComparisonContent
              book={selectedBookId || ''}
              chapter={selectedChapter}
              version1={selectedVersionId || ''}
              version2={secondVersionId || ''}
              theme={currentTheme}
              font={selectedFont}
              fontSize={fontSize}
              onClose={() => setComparisonMode(false)}
              onVersion2Change={() => setShowVersionSelector(true)}
              displayVersionName1={displayVersionName || 'KJV'}
              displayVersionName2={displaySecondVersionName}
            />
          ) : pageTransition === 'slide' && isDragging ? (
            /* Interactive drag mode — show both pages during swipe */
            <>
              {/* Next page (shows when dragging left) */}
              {dragOffset < 0 && (
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(${100 + (dragOffset / window.innerWidth) * 100}%)`,
                    backgroundColor: currentTheme.bg,
                    willChange: 'transform',
                  }}
                >
                  <ChapterContent
                    book={nextChapterInfo.book}
                    chapter={nextChapterInfo.chapter}
                    font={selectedFont}
                    fontSize={fontSize}
                    version={selectedVersionId || undefined}
                    scrollToVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? selectedVerse : undefined}
                    readingVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? currentVerse : null}
                    selectedVerses={selectedVerses}
                    highlights={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? userHighlights : []}
                    notes={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? userNotes : []}
                    onVerseLongPress={handleVerseLongPress}
                    onVerseTap={handleVerseTap}
                    theme={currentTheme}
                  />
                </div>
              )}

              {/* Previous page (shows when dragging right) */}
              {dragOffset > 0 && (
                <div
                  className="absolute inset-0"
                  style={{
                    transform: `translateX(${-100 + (dragOffset / window.innerWidth) * 100}%)`,
                    backgroundColor: currentTheme.bg,
                    willChange: 'transform',
                  }}
                >
                  <ChapterContent
                    book={prevChapterInfo.book}
                    chapter={prevChapterInfo.chapter}
                    font={selectedFont}
                    fontSize={fontSize}
                    version={selectedVersionId || undefined}
                    scrollToVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? selectedVerse : undefined}
                    readingVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? currentVerse : null}
                    selectedVerses={selectedVerses}
                    highlights={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? userHighlights : []}
                    notes={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? userNotes : []}
                    onVerseLongPress={handleVerseLongPress}
                    onVerseTap={handleVerseTap}
                    theme={currentTheme}
                  />
                </div>
              )}

              {/* Current page */}
              <div
                className="relative"
                style={{
                  transform: `translateX(${(dragOffset / window.innerWidth) * 100}%)`,
                  transition: 'none',
                  willChange: 'transform',
                }}
              >
                <ChapterContent
                  book={selectedBookId || ''}
                  chapter={selectedChapter}
                  font={selectedFont}
                  fontSize={fontSize}
                  version={selectedVersionId || undefined}
                  scrollToVerse={selectedVerse}
                  readingVerse={currentVerse}
                  selectedVerses={selectedVerses}
                  highlights={userHighlights}
                  notes={userNotes}
                  onVerseLongPress={handleVerseLongPress}
                  onVerseTap={handleVerseTap}
                  theme={currentTheme}
                />
              </div>
            </>
          ) : pageTransition === 'curl' ? (
            /* Curl — delegated to PageTurnTransition for true 3D page flip */
            <PageTurnTransition
              pageKey={chapterKey}
              direction={transitionDirection === 'next' ? 1 : -1}
              backgroundColor={currentTheme.bg}
            >
              <ChapterContent
                book={selectedBookId || ''}
                chapter={selectedChapter}
                font={selectedFont}
                fontSize={fontSize}
                version={selectedVersionId || undefined}
                scrollToVerse={selectedVerse}
                readingVerse={currentVerse}
                selectedVerses={selectedVerses}
                highlights={userHighlights}
                notes={userNotes}
                onVerseLongPress={handleVerseLongPress}
                onVerseTap={handleVerseTap}
                theme={currentTheme}
              />
            </PageTurnTransition>
          ) : (
            /* Slide, Fade, Scroll — framer-motion AnimatePresence */
            <AnimatePresence
              mode={pageTransition === 'slide' ? 'sync' : 'wait'}
              initial={false}
            >
              <motion.div
                key={chapterKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={getTransitionVariants()}
                style={{ willChange: 'transform, opacity' }}
              >
                <ChapterContent
                  book={selectedBookId || ''}
                  chapter={selectedChapter}
                  font={selectedFont}
                  fontSize={fontSize}
                  version={selectedVersionId || undefined}
                  scrollToVerse={selectedVerse}
                  readingVerse={currentVerse}
                  selectedVerses={selectedVerses}
                  highlights={userHighlights}
                  notes={userNotes}
                  onVerseLongPress={handleVerseLongPress}
                  onVerseTap={handleVerseTap}
                  theme={currentTheme}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>


      {/* ── VERSE ACTION MENU ─────────────────────────────── */}
      <AnimatePresence>
        {selectedVerses.length > 0 && (
          <VerseActionMenu 
            isOpen={selectedVerses.length > 0}
            bookName={displayBookName}
            chapter={selectedChapter}
            selectedVerses={selectedVerses}
            onClose={onVerseMenuClose}
            onHighlight={onVerseMenuHighlight}
            onSave={onVerseMenuSave}
            onNote={onVerseMenuNote}
            onCompare={onVerseMenuCompare}
            onShare={onVerseMenuShare}
          />
        )}
      </AnimatePresence>

      {/* ── TTS SETTINGS POPUP ─────────────────────────────── */}
      {/* ── AUDIO CONTROL PANEL (BOTTOM SHEET) ──────────────── */}
      <AnimatePresence>
        {isControlPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/10"
            onClick={() => setIsControlPanelOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 w-full max-w-2xl mx-auto bg-white rounded-t-[24px] overflow-hidden shadow-[0_-8px_32px_rgba(0,0,0,0.08)] border-t border-gray-100 pb-safe z-[1110] max-h-[25vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header and Verse Info */}
              <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-[#31393a] flex items-center gap-2">
                    {displayBookName} {selectedChapter}
                    <span className="text-[var(--color-primary-teal)] font-medium">
                      {displayVersionName}
                    </span>
                  </h3>
                  {currentVerse && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                      Verse {currentVerse}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsControlPanelOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="size-5 text-gray-400" />
                </button>
              </div>

              <div className="px-6 py-2 space-y-8">
                <div className="flex flex-col gap-4">
                  {/* Progress Bar with Verse Labels */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end px-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Verse {currentVerse || 1}</span>
                    </div>
                    <div 
                      className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden cursor-pointer group relative"
                      onClick={handleProgressBarClick}
                    >
                      <motion.div 
                        className="absolute top-0 left-0 h-full bg-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${((ttsCurrentVerseIndex + 1) / (currentChapterVerses.length || 1)) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                      />
                    </div>
                  </div>

                  {/* Combined Controls Layout */}
                  <div className="flex flex-col gap-4">
                    {/* Primary Controls Row */}
                    <div className="flex items-center justify-between">
                      {/* Chapter Nav Left */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                        className="flex flex-col items-center gap-1 group"
                        title="Previous Chapter"
                      >
                        <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors">
                          <SkipBack className="size-5 text-gray-600" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight text-center">Prev Chap</span>
                      </button>

                      {/* Verse Navigation and Play */}
                      <div className="flex items-center gap-5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrevVerse(); }}
                          className="p-2 text-gray-700 hover:text-[var(--color-primary-teal)] transition-colors active:scale-95"
                          title="Previous Verse"
                        >
                          <SkipBack className="size-6 fill-current" />
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); toggleTTS(); }}
                          className="size-14 rounded-2xl bg-[var(--color-primary-teal)] flex items-center justify-center text-white shadow-lg shadow-[var(--color-primary-teal)]/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          {ttsPlaying && !ttsPaused ? (
                            <Pause className="size-7 fill-current" />
                          ) : (
                            <Play className="size-7 fill-current translate-x-0.5" />
                          )}
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); handleNextVerse(); }}
                          className="p-2 text-gray-700 hover:text-[var(--color-primary-teal)] transition-colors active:scale-95"
                          title="Next Verse"
                        >
                          <SkipForward className="size-6 fill-current" />
                        </button>
                      </div>

                      {/* Chapter Nav Right */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="flex flex-col items-center gap-1 group"
                        title="Next Chapter"
                      >
                        <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-gray-100 transition-colors">
                          <SkipForward className="size-5 text-gray-600" />
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight text-center">Next Chap</span>
                      </button>
                    </div>

                    {/* Secondary Controls Row (Repeat + Volume slider + Speed toggle + Download) */}
                    <div className="flex items-center gap-3 bg-gray-50/50 rounded-xl p-2">
                      {/* Repeat Mode */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRepeatMode();
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border shadow-sm text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all ${
                          repeatMode !== 'none'
                            ? 'bg-[var(--color-primary-teal)] text-white border-[var(--color-primary-teal)]'
                            : 'bg-white text-gray-500 border-gray-200'
                        }`}
                        title={`Repeat: ${repeatMode}`}
                      >
                        {repeatMode === 'verse' ? (
                          <Repeat1 className="size-3.5" />
                        ) : (
                          <Repeat className="size-3.5" />
                        )}
                        {repeatMode === 'none' ? 'Off' : repeatMode === 'verse' ? '1' : 'Ch'}
                      </button>

                      <div className="w-px h-6 bg-gray-200" />

                      {/* Volume */}
                      <div className="flex-1 flex items-center gap-2 px-1">
                        <Volume2 className="size-4 text-gray-400 flex-shrink-0" />
                        <input
                          type="range"
                          min="0" max="1" step="0.05"
                          value={ttsVolume}
                          onChange={(e) => setTtsVolume(Number(e.target.value))}
                          className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary-teal)] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md"
                          style={{ background: `linear-gradient(to right, var(--color-primary-teal) ${ttsVolume*100}%, #e5e7e7 ${ttsVolume*100}%)` }}
                        />
                      </div>

                      <div className="w-px h-6 bg-gray-200" />

                      {/* Speed */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const speeds = [0.25, 0.5, 1, 1.25, 1.5, 2];
                          const currentIndex = speeds.indexOf(ttsRate);
                          const nextIndex = (currentIndex + 1) % speeds.length;
                          setTtsRate(speeds[nextIndex]);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-[11px] font-bold text-[var(--color-primary-teal)] flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Zap className="size-3.5" />
                        {ttsRate}x
                      </button>

                      <div className="w-px h-6 bg-gray-200" />

                      {/* Download placeholder */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Download functionality placeholder
                          alert('Download feature coming soon!');
                        }}
                        className="p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-[var(--color-primary-teal)] active:scale-95 transition-all"
                        title="Download"
                      >
                        <Download className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-4" /> {/* Bottom safe padding */}

                <div className="h-6" /> {/* Bottom safe padding */}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NARRATION CONTROLS (Hidden when bottom sheet is open) ─────────────── */}
      {!isControlPanelOpen && (
      <div
        className="fixed left-0 right-0 z-[1200] pointer-events-none"
        style={{ bottom: showBottomNav ? '88px' : '10px' }}
      >
        <div className="max-w-3xl mx-auto px-6 relative h-16 flex items-center justify-center">

          {/* Previous Chapter Button */}
          {(!isFirstChapterOfBible) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={(e) => { e.preventDefault(); handlePrevious(); }}
              className="absolute left-6 pointer-events-auto size-14 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#31393a] hover:scale-105 active:scale-95 transition-all"
              title="Previous Chapter"
            >
              <ChevronLeft className="size-7" />
            </motion.button>
          )}

          {/* Center: Single Play Button */}
          <div className="pointer-events-auto relative flex flex-col items-center gap-0">
            <div className="relative flex items-center gap-3">
              {/* Main play/pause circle button */}
              <button
                type="button"
                onMouseDown={handlePlaybackMouseDown}
                onMouseUp={handlePlaybackMouseUp}
                onMouseLeave={handlePlaybackPressCancel}
                onTouchStart={handlePlaybackTouchStart}
                onTouchEnd={handlePlaybackTouchEnd}
                onTouchCancel={handlePlaybackPressCancel}
                onContextMenu={(e) => e.preventDefault()}
                className="relative size-16 group pointer-events-auto select-none touch-manipulation"
                title="Tap to Play/Pause, Hold for Controls"
              >
                <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
                  <circle cx="32" cy="32" r="30" fill="white" className="shadow-[0_4px_12px_rgba(0,0,0,0.1)]" />
                  <motion.circle
                    cx="32" cy="32" r="30"
                    fill="transparent"
                    stroke="var(--color-primary-teal)"
                    strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 30}
                    animate={{
                      strokeDashoffset: 2 * Math.PI * 30 * (1 - ((ttsPlaying || ttsPaused) ? (ttsCurrentVerseIndex + 1) / (currentChapterVerses.length || 1) : 0))
                    }}
                    transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="size-12 flex items-center justify-center transition-transform group-hover:scale-110 pointer-events-none">
                    {ttsPlaying && !ttsPaused ? (
                      <Pause className="size-6 text-[var(--color-primary-teal)] fill-current pointer-events-none" />
                    ) : (
                      <Play className="size-6 text-[var(--color-primary-teal)] fill-current translate-x-0.5 pointer-events-none" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Next Chapter Button */}
          {(!isLastChapterOfBible) && (
            <motion.button
              type="button"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={(e) => { e.preventDefault(); handleNext(); }}
              className="absolute right-6 pointer-events-auto size-14 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center text-[#31393a] hover:scale-105 active:scale-95 transition-all"
              title="Next Chapter"
            >
              <ChevronRight className="size-7" />
            </motion.button>
          )}
        </div>
      </div>
      )}

      {/* Side Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-white/5 z-[100] backdrop-blur-sm shadow-2xl"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 glass-ios shadow-2xl p-6 border-l border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[#006a6f] mb-6">Settings</h2>
            <div className="space-y-4">
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Account Settings
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Bible Versions
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Reading Settings
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Notifications
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors">
                Privacy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bible Search Modal */}
      {/* <BibleSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        selectedVersionId={selectedVersionId}
        onNavigateToVerse={handleNavigateToVerse}
      /> */}
    </div>
  );
}
