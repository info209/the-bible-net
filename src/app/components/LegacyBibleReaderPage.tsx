"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown, Home, Compass, Play, Pause, Music, MoreVertical, X,
  ChevronLeft, ChevronRight, Check, Repeat, Repeat1, Shuffle,
  List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText,
  Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download,
  Gauge, Timer, Circle, Activity, Music2, Columns2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSavedItems } from '@/lib/useSavedItems';
import { RiSortDesc, RiSortAlphabetAsc, RiEqualizer3Fill } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { MdOutlineLibraryBooks } from 'react-icons/md';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import BibleSkeleton, { BookListSkeleton, VersionListSkeleton, ComparisonSkeleton } from './BibleSkeleton';
import AppHeader from './AppHeader';
import PageTurnTransition from './PageTurnTransition';
import EqualizerIcon from './EqualizerIcon';
import BibleSearch from './BibleSearch';
import CompareVersionsModal from './CompareVersionsModal';
import CompareMenu from './CompareMenu';
import CompareView from './CompareView';

import { useMediaStore } from '@/lib/mediaStore';
import ChapterContent, { mockBibleContent } from './ChapterContent';
import ComparisonContent from './ComparisonContent';
import VerseActionMenu from './VerseActionMenu';
import AudioControlPanel from './AudioControlPanel';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { teluguBible, hindiBible } from './BibleData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Separator as RadixSeparator } from '@radix-ui/react-separator';

const VERSE_ACTION_MENU_OPEN_DELAY = 800;

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
  const [audioControlExpanded, setAudioControlExpanded] = useState(false);
  const [showAudioSheet, setShowAudioSheet] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>('none');
  const [musicLoopMode, setMusicLoopMode] = useState<'shuffle' | 'repeat-all' | 'repeat-one'>('shuffle');
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState<'stop' | 'end-chapter' | '10-mins' | '15-mins' | '30-mins' | '1-hr' | '2-hrs'>('stop');
  const [showCompareMenu, setShowCompareMenu] = useState(false);

  // Music tracks
  const musicTracks = [
    { id: 'none', name: 'None', thumbnail: null },
    { id: 'music1', name: 'Music 1', thumbnail: 'https://images.unsplash.com/photo-1686109616991-1acaf4fa7199?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHJpc3RpYW4lMjBjcm9zcyUyMGdvbGRlbnxlbnwxfHx8fDE3NzAwMzE3ODV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music2', name: 'Music 2', thumbnail: 'https://images.unsplash.com/photo-1507126882445-434b04530d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGRvdmUlMjBmbHlpbmd8ZW58MXx8fHwxNzcwMDMxNzg2fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music3', name: 'Music 3', thumbnail: 'https://images.unsplash.com/photo-1605238721408-3876d8fd3942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWJsZSUyMG9wZW4lMjBsaWdodHxlbnwxfHx8fDE3Njk5MjA2OTV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
  ];

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
    if (verseNum === 0) {
      setSelectedVerses([]);
      return;
    }
    setSelectedVerses(prev => {
      if (prev.length === 0) return prev;
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
    setComparisonVersionIds(prev => {
      if (selectedVersionId && !prev.includes(selectedVersionId)) {
        return [...prev, selectedVersionId];
      }
      return prev;
    });
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
  const handleNextRef = useRef<() => void>(() => { }); // Stable ref for TTS auto-advance
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [fontSize, setFontSize] = useState(18);
  const [pageTransition, setPageTransition] = useState<'slide' | 'curl' | 'fade' | 'scroll'>('slide');
  const chapterKey = `${selectedBookId}-${selectedChapter}-${selectedVersionId}`;
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
  const isTransitioningRef = useRef(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [bookSortType, setBookSortType] = useState<'traditional' | 'alphabetical'>('traditional');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonVersionIds, setComparisonVersionIds] = useState<string[]>([]);
  const [showCompareSelector, setShowCompareSelector] = useState(false);
  const [tempComparisonIds, setTempComparisonIds] = useState<string[]>([]);
  const [showVerseActionMenu, setShowVerseActionMenu] = useState(false);

  // Compare mode handlers
  const handleToggleCompareVersion = (vId: string) => {
    setTempComparisonIds(prev => {
      const isSelected = prev.includes(vId);
      if (isSelected) {
        return prev.filter(id => id !== vId);
      } else {
        if (prev.length < 4) {
          return [...prev, vId];
        }
        return prev;
      }
    });
  };

  const handleStartCompare = () => {
    setComparisonVersionIds(tempComparisonIds);
    setComparisonMode(true);
    setShowCompareSelector(false);
  };

  const handleExitCompare = () => {
    setComparisonMode(false);
    setComparisonVersionIds([]);
  };

  const handleAddCompareVersion = (vId: string) => {
    setComparisonVersionIds(prev => [...prev, vId]);
  };

  const handleRemoveCompareVersion = (vId: string) => {
    setComparisonVersionIds(prev => prev.filter(id => id !== vId));
  };

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
          setDisplayVersionName(matchingVer.name);
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

  const isAnyPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMoreMenu ||
    showSearch || showVerseSelector || selectedVerses.length > 0;

  // ESC key closes any open popup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showBookSelector) setShowBookSelector(false);
      else if (showChapterSelector) setShowChapterSelector(false);
      else if (showVerseSelector) setShowVerseSelector(false);
      else if (showVersionSelector) setShowVersionSelector(false);
      else if (showMoreMenu) setShowMoreMenu(false);
      else if (showSearch) setShowSearch(false);
      else if (showSettingsModal) setShowSettingsModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBookSelector, showChapterSelector, showVerseSelector, showVersionSelector, showMoreMenu, showSearch, showSettingsModal]);

  // Lock background scroll when any popup is open
  useEffect(() => {
    if (isAnyPopupOpen) {
      if (scrollContainerRef.current) scrollContainerRef.current.style.overflow = 'hidden';
    } else {
      if (scrollContainerRef.current) scrollContainerRef.current.style.overflow = '';
    }
  }, [isAnyPopupOpen]);

  useEffect(() => {
    if (selectedVerses.length === 0) {
      setShowVerseActionMenu(false);
      return;
    }

    setShowVerseActionMenu(false);
    const timer = window.setTimeout(() => {
      setShowVerseActionMenu(true);
    }, VERSE_ACTION_MENU_OPEN_DELAY);

    return () => window.clearTimeout(timer);
  }, [selectedVerses]);

  // Debounced Bible search
  useEffect(() => {
    if (!showSearch) { setSearchResults([]); setSearchTotal(0); return; }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery || searchQuery.trim().length < 2) { setSearchResults([]); setSearchTotal(0); return; }
    searchDebounceRef.current = setTimeout(async () => {
      if (!selectedVersionId) return;
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/v1/bible/search?q=${encodeURIComponent(searchQuery.trim())}&versionId=${selectedVersionId}&limit=30`);
        const data = await res.json();
        if (data.success) { setSearchResults(data.data.results); setSearchTotal(data.data.total); }
      } catch (e) { console.error('Search failed:', e); }
      finally { setSearchLoading(false); }
    }, 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, showSearch, selectedVersionId]);

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
            setDisplayVersionName(kjvVersion.name);
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
          setDisplayVersionName(matchingVer.name);
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

  // Reading Mode & Scroll detection state
  const [isReadingMode, setIsReadingMode] = useState(false);
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
  const handleSearchNavigation: (bookName: string, chapter: number, verse: number) => void = (bookName, chapter, verse) => {
    // find book by name
    const targetBook = allBooks.find(b => b.name === bookName);
    if (targetBook) {
      setSelectedBookId(targetBook.id);
      setDisplayBookName(targetBook.name);
      setSelectedChapter(chapter);
      setSelectedVerse(verse);
      setShowSearch(false);

      // Scroll to the verse after a short delay to allow state to update
      setTimeout(() => {
        const verseElement = document.getElementById(`verse-${targetBook.id}-${chapter}-${verse}`);
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
    }
  };

  const handlePrevious = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const lockDuration = pageTransition === 'curl' ? 900 : pageTransition === 'slide' ? 550 : pageTransition === 'fade' ? 450 : 650;
    setTimeout(() => { isTransitioningRef.current = false; }, lockDuration);

    setTransitionDirection('prev');

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
    }, 350);
  };

  const handleNext = () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    const lockDuration = pageTransition === 'curl' ? 900 : pageTransition === 'slide' ? 550 : pageTransition === 'fade' ? 450 : 650;
    setTimeout(() => { isTransitioningRef.current = false; }, lockDuration);

    setTransitionDirection('next');

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
  // Sync volume/rate changes with active utterance instantly
  // (Removed redundant cancel-and-restart effect for volume changes)

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
      setAudioControlExpanded(true);
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
      setAudioControlExpanded(true);
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
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX; // Initialize endX to startX
    gestureDetected.current = 'none';
    
    if (pageTransition !== 'slide') return;
    // Don't set isDragging yet - wait to detect gesture direction
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;

    if (pageTransition !== 'slide') return;

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
      const swipeThreshold = 50; // Lowered for better sensitivity
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
    touchEndX.current = touchStartX.current; // Reset for next interaction
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
    curl: { duration: 0.8, ease: [0.4, 0, 0.2, 1] },
    fade: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
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

  // Scroll detection logic - True Fullscreen-Like Reading Mode
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    let animationFrame: number | null = null;
    let lastScrollYValue = 0;

    const executeScrollLogic = () => {
      if (!scrollContainer) return;

      const currentScrollY = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const scrolledToBottom = scrollHeight - currentScrollY - clientHeight < 50;
      const deltaY = currentScrollY - lastScrollYValue;
      const direction = deltaY > 0 ? 'down' : deltaY < 0 ? 'up' : scrollDirectionRef.current;

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

      if (direction === 'down' && deltaY > 15 && currentScrollY > 80) {
        setIsReadingMode(true);
        setShowAudioControls(false);
      } else if (direction === 'up' && deltaY < -10) {
        setIsReadingMode(false);
        setShowAudioControls(true);
      }

      lastScrollYValue = currentScrollY;
      scrollDirectionRef.current = direction;
    };

    const handleScroll = () => {
      if (animationFrame !== null) return;
      animationFrame = window.requestAnimationFrame(() => {
        executeScrollLogic();
        animationFrame = null;
      });
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      };
    }
  }, [selectedBookId, selectedChapter, selectedVersionId, displayBookName, displayVersionName, updateProgress]);

  useEffect(() => {
    const isImmersive = isReadingMode && !isAnyPopupOpen && !audioControlExpanded;

    // We do not use docEl.requestFullscreen() here because modern browsers 
    // restrict fullscreen API to explicit user gestures.

    window.dispatchEvent(
      new CustomEvent('bible-reading-mode', { detail: { isReadingMode: isImmersive } })
    );
  }, [isReadingMode, isAnyPopupOpen, audioControlExpanded]);

  // Safari-specific fix: Trigger minimal scroll when entering Reading Mode to encourage address bar hide
  useEffect(() => {
    if (isReadingMode) {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer && scrollContainer.scrollTop === 0) {
        scrollContainer.scrollTo({ top: 1, behavior: 'auto' });
      }
      if (typeof window !== 'undefined' && window.scrollY === 0) {
        window.scrollTo(0, 1);
      }
    }
  }, [isReadingMode]);

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
    <div className="fixed inset-0 h-[100dvh] bg-[var(--color-bg-primary)] flex flex-col z-[100] overflow-hidden">
      {/* Scrollable Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pb-24 h-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header Section Grouped for Reading Mode - STICKY CONTAINER */}
        <div
          className="sticky top-0 z-[60] transition-all duration-300 ease-in-out"
          style={{
            transform: isReadingMode ? 'translateY(-100%)' : 'translateY(0)',
            opacity: isReadingMode ? 0 : 1,
            pointerEvents: isReadingMode ? 'none' : 'auto'
          }}
        >
          {/* Main Header/Navbar - SCROLLS AWAY (Hides) */}
          <div className="h-16 w-full">
            <AppHeader onMenuOpen={() => setShowMoreMenu(true)} className="!static" />
          </div>
        </div>

        {/* Sub Navigation Bar - BECOMES STICKY */}
        <div className="sticky top-0 z-[55] glass-light border-b border-white/20">
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
                  className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors min-w-0"
                >
                  <span className="text-sm font-normal truncate max-w-[60px] xs:max-w-none">
                    {displayBookName}
                  </span>
                  <ChevronDown className="size-3 flex-shrink-0" />
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

                {comparisonMode ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-[var(--color-text-primary)]/40 text-sm">|</span>
                    <button
                      onClick={() => {
                        setTempComparisonIds(comparisonVersionIds);
                        setShowCompareMenu(true);
                      }}
                      className="text-sm font-normal text-[var(--color-accent-rose)] hover:opacity-80 transition-all flex items-center gap-1"
                    >
                      Comparing
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowVersionSelector(!showVersionSelector);
                      setShowBookSelector(false);
                      setShowChapterSelector(false);
                    }}
                    className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors min-w-0"
                  >
                    <span className="text-sm font-normal truncate max-w-[40px] xs:max-w-none">
                      {displayVersionName || 'KJV'}
                    </span>
                    <ChevronDown className="size-3 flex-shrink-0" />
                  </button>
                )}
              </div>

              {/* Right side tools with better mobile spacing */}
              <div className="flex items-center -space-x-1 ml-auto mr-3 flex-shrink-0">
                <button
                  onClick={() => {
                    if (comparisonMode) {
                      setShowCompareMenu(true);
                    } else {
                      setTempComparisonIds(selectedVersionId ? [selectedVersionId] : []);
                      setShowCompareSelector(true);
                    }
                  }}
                  className="p-2 rounded-full transition-all hover:bg-gray-100/50"
                  title="Compare Versions"
                >
                  <MdOutlineLibraryBooks
                    className={`size-5 transition-colors ${comparisonMode
                      ? 'text-[var(--color-accent-rose)]'
                      : 'text-[var(--color-gray-900)]'
                      }`}
                  />
                </button>
                <button
                  onClick={() => setShowMusicSelector(true)}
                  className="p-2 hover:bg-gray-100/50 rounded-full transition-colors text-[var(--color-gray-900)]"
                  title="Ambient Music"
                >
                  <Music className="size-5" />
                </button>
                <button
                  onClick={() => { setShowSearch(true); setSearchQuery(''); }}
                  className="p-2 hover:bg-gray-100/50 rounded-full transition-colors text-[var(--color-gray-900)]"
                  title="Search"
                >
                  <FiSearch className="size-5" />
                </button>
                {/* Refactor to hold position for the popup */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoreMenu(true)}
                    className="p-2 hover:bg-gray-100/50 rounded-full transition-colors text-[var(--color-gray-900)]"
                    title="More options"
                  >
                    <MoreVertical className="size-5" />
                  </button>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setShowMoreMenu(false)}></div>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-[101] overflow-hidden">
                        <button
                          onClick={() => { setShowMoreMenu(false); setShowSettingsModal(true); }}
                          className="w-full text-left px-4 py-3 text-sm text-[var(--color-text-primary)] hover:bg-gray-50 flex items-center gap-2"
                        >
                          <span>Fonts and Settings</span>
                        </button>
                        <div className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={() => setHideFootnotes(!hideFootnotes)}>
                          <span className="text-sm text-[var(--color-text-primary)]">Hide footnotes</span>
                          <Switch checked={hideFootnotes} onCheckedChange={setHideFootnotes} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector panels */}
        {showBookSelector && (
          <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowBookSelector(false)}>
            <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-2xl rounded-lg w-[92vw] max-w-[360px] max-h-[calc(100dvh-160px)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Books</h3>

                <div className="flex items-center gap-3">
                  {/* Sort Toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--color-text-primary)] font-medium">
                      {bookSortType === 'traditional' ? 'Trad' : 'Alpha'}
                    </span>
                    <div className="flex bg-gray-200/80 rounded-full p-0.5">
                      <button
                        onClick={() => setBookSortType('traditional')}
                        className={`p-1.5 rounded-full transition-all ${bookSortType === 'traditional' ? 'bg-white shadow-sm' : 'bg-transparent'
                          }`}
                      >
                        <RiSortDesc className={`size-4 ${bookSortType === 'traditional' ? 'text-[var(--color-accent-rose)]' : 'text-[var(--color-text-primary)]/60'}`} />
                      </button>
                      <button
                        onClick={() => setBookSortType('alphabetical')}
                        className={`p-1.5 rounded-full transition-all ${bookSortType === 'alphabetical' ? 'bg-white shadow-sm' : 'bg-transparent'
                          }`}
                      >
                        <RiSortAlphabetAsc className={`size-4 ${bookSortType === 'alphabetical' ? 'text-[var(--color-accent-rose)]' : 'text-[var(--color-text-primary)]/60'}`} />
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setShowBookSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="size-6 text-[var(--color-text-primary)]/60" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                <div className="grid grid-cols-2 gap-8">
                  {/* Old Testament */}
                  <div>
                    <h4 className="sticky top-0 bg-white/20 backdrop-blur-sm text-[var(--color-text-primary)] mb-3 pb-2 text-sm font-semibold z-10">Old Testament</h4>
                    <div className="space-y-2">
                      {(bookSortType === 'alphabetical'
                        ? [...bibleBooksState['Old Testament']].sort((a, b) => a.name.localeCompare(b.name))
                        : bibleBooksState['Old Testament']
                      ).map(book => (
                        <button
                          key={book.id}
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setDisplayBookName(book.name);
                            setShowBookSelector(false);
                            setSelectedChapter(1);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBookId === book.id ? 'text-[var(--color-accent-rose)] font-medium' : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                            }`}
                        >
                          {book.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* New Testament */}
                  <div>
                    <h4 className="sticky top-0 bg-white/20 backdrop-blur-sm text-[var(--color-text-primary)] mb-3 pb-2 text-sm font-semibold z-10">New Testament</h4>
                    <div className="space-y-2">
                      {(bookSortType === 'alphabetical'
                        ? [...bibleBooksState['New Testament']].sort((a, b) => a.name.localeCompare(b.name))
                        : bibleBooksState['New Testament']
                      ).map(book => (
                        <button
                          key={book.id}
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setDisplayBookName(book.name);
                            setShowBookSelector(false);
                            setSelectedChapter(1);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBookId === book.id ? 'text-[var(--color-accent-rose)] font-medium' : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                            }`}
                        >
                          {book.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showChapterSelector && (
          <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowChapterSelector(false)}>
            <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-2xl rounded-lg w-[92vw] max-w-[360px] max-h-[calc(100dvh-160px)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
                <div className="w-16"></div>
                <h3 className="text-base font-normal text-[#31393a]">Select chapter</h3>
                <button onClick={() => setShowChapterSelector(false)} className="text-sm text-[#31393a] hover:text-[#d23952] transition-colors px-2">Done</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chapter => (
                    <button
                      key={chapter}
                      onClick={() => {
                        setSelectedChapter(chapter);
                        setShowChapterSelector(false);
                        setShowVerseSelector(true);
                      }}
                      className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${selectedChapter === chapter ? 'bg-[var(--color-accent-rose-lighter)] text-[var(--color-accent-rose)] font-medium' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-gray-200)]'
                        }`}
                    >
                      {chapter.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showVerseSelector && (
          <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowVerseSelector(false)}>
            <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-2xl rounded-lg w-[92vw] max-w-[360px] max-h-[calc(100dvh-160px)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
                <button onClick={() => { setShowVerseSelector(false); setShowChapterSelector(true); }} className="flex items-center space-x-1 text-sm text-[#31393a] hover:text-[#d23952] transition-colors">
                  <ChevronLeft className="size-4" />
                  <span>Back</span>
                </button>
                <h3 className="text-base font-normal text-[#31393a]">Select verse</h3>
                <button onClick={() => { setShowVerseSelector(false); setShowChapterSelector(false); }} className="text-sm text-[#31393a] hover:text-[#d23952] transition-colors px-2">Done</button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(verse => (
                    <button
                      key={verse}
                      onClick={() => {
                        setSelectedVerse(verse);
                        setSelectedVerses([verse]);
                        setShowVerseSelector(false);
                        setShowChapterSelector(false);
                      }}
                      className={`aspect-square flex items-center justify-center rounded text-sm transition-colors ${selectedVerse === verse ? 'bg-[var(--color-accent-rose-lighter)] text-[var(--color-accent-rose)] font-medium' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-gray-200)]'
                        }`}
                    >
                      {verse.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showVersionSelector && (
          <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowVersionSelector(false)}>
            <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-2xl rounded-lg w-[92vw] max-w-[360px] max-h-[calc(100dvh-160px)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end p-4">
                <button onClick={() => setShowVersionSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="size-6 text-[#31393a]/60" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4">
                <h4 className="font-bold text-[var(--color-accent-rose)] mb-4 text-sm">Bible Versions</h4>
                <div className="space-y-4">
                  {['English', 'Telugu', 'Hindi'].map(lang => (
                    <div key={lang} className="space-y-2">
                      <p className="text-sm text-[#31393a]/60 font-medium">{lang}</p>
                      {bibleVersions.filter(v => v.language === lang).map(version => (
                        <button
                          key={version.id}
                          onClick={() => {
                            setSelectedVersionId(version.id);
                            setDisplayVersionName(version.name);
                            setShowVersionSelector(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded transition-colors ${selectedVersionId === version.id ? 'bg-[var(--color-accent-rose-lighter)] text-[var(--color-accent-rose)]' : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                            }`}
                        >
                          <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCompareSelector && (
          <CompareVersionsModal
            isOpen={showCompareSelector}
            onClose={() => setShowCompareSelector(false)}
            versions={bibleVersions}
            selectedVersions={tempComparisonIds}
            onToggleVersion={handleToggleCompareVersion}
            onStartCompare={handleStartCompare}
          />
        )}

        {showCompareMenu && (
          <CompareMenu
            isOpen={showCompareMenu}
            onClose={() => setShowCompareMenu(false)}
            versions={bibleVersions}
            selectedVersions={comparisonVersionIds}
            onRemoveVersion={handleRemoveCompareVersion}
            onAddVersion={handleAddCompareVersion}
            onExitCompare={handleExitCompare}
          />
        )}

        {showMusicSelector && (
          <div className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-sm" onClick={() => setShowMusicSelector(false)}>
            <div className="absolute top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-2xl rounded-lg sm:w-full sm:max-w-[400px] max-h-[calc(100dvh-160px)] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="w-10"></div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => {
                    const modes: Array<'shuffle' | 'repeat-all' | 'repeat-one'> = ['shuffle', 'repeat-all', 'repeat-one'];
                    setMusicLoopMode(modes[(modes.indexOf(musicLoopMode) + 1) % modes.length]);
                  }} className="flex items-center space-x-1.5 px-3 py-2 hover:bg-gray-100 rounded-full transition-colors text-[#31393a]">
                    {musicLoopMode === 'shuffle' ? <><Shuffle className="size-5" /><span>Shuffle</span></> :
                      musicLoopMode === 'repeat-all' ? <><Repeat className="size-5" /><span>Repeat All</span></> :
                        <><Repeat1 className="size-5" /><span>Repeat One</span></>}
                  </button>
                  <button onClick={() => setShowMusicSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#31393a]/60">
                    <X className="size-6" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto custom-scrollbar px-4 pb-4">
                <div className="space-y-3">
                  {musicTracks.map((track) => (
                    <button key={track.id} onClick={() => setSelectedMusic(track.id)} className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedMusic === track.id ? 'bg-[#fde8ea]' : 'hover:bg-gray-100/50'}`}>
                      <div className="flex items-center space-x-3">
                        <div className="size-12 rounded-full overflow-hidden bg-black flex-shrink-0 relative">
                          {track.thumbnail ? <img src={track.thumbnail} alt={track.name} className="size-full object-cover" /> : <div className="size-full bg-black/10" />}
                          {selectedMusic === track.id && track.id !== 'none' && <div className="absolute inset-0 flex items-center justify-center bg-black/30"><Play className="size-5 text-white fill-current" /></div>}
                        </div>
                        <span className={`text-base ${selectedMusic === track.id ? 'text-[var(--color-accent-rose)] font-medium' : 'text-[#31393a]'}`}>{track.name}</span>
                      </div>
                      {selectedMusic === track.id && track.id !== 'none' && <EqualizerIcon className="text-[var(--color-accent-rose)] h-5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Reading Content */}
        <div
          className="transition-colors duration-300 relative overflow-hidden flex-1"
          style={{
            backgroundColor: currentTheme.bg,
            ...(pageTransition === 'curl' && {
              perspective: '1200px',
              transformStyle: 'preserve-3d' as const
            })
          }}
        >
          <AnimatePresence mode="wait">
            {pageTransition === 'slide' && isDragging ? (
              /* Interactive slide mode - show both pages */
              <>
                {/* Next page (shows when dragging left) */}
                {dragOffset < 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      transform: `translateX(${100 + (dragOffset / window.innerWidth) * 100}%)`,
                      backgroundColor: currentTheme.bg
                    }}
                  >
                    <ChapterContent
                      book={nextChapterInfo.book}
                      chapter={nextChapterInfo.chapter}
                      font={selectedFont}
                      fontSize={fontSize}
                      version={displayVersionName || 'KJV'}
                      scrollToVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === displayBookName ? selectedVerse : undefined}
                      readingVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === displayBookName ? currentVerse : null}
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
                      backgroundColor: currentTheme.bg
                    }}
                  >
                    <ChapterContent
                      book={prevChapterInfo.book}
                      chapter={prevChapterInfo.chapter}
                      font={selectedFont}
                      fontSize={fontSize}
                      version={displayVersionName || 'KJV'}
                      scrollToVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === displayBookName ? selectedVerse : undefined}
                      readingVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === displayBookName ? currentVerse : null}
                      theme={currentTheme}
                    />
                  </div>
                )}

                {/* Current page */}
                <div
                  className="relative"
                  style={{
                    transform: `translateX(${(dragOffset / window.innerWidth) * 100}%)`,
                    transition: 'none'
                  }}
                >
                  {comparisonMode ? (
                    <ComparisonContent
                      book={selectedBookId || ''}
                      chapter={selectedChapter}
                      versionIds={comparisonVersionIds}
                      bibleVersions={bibleVersions}
                      theme={currentTheme}
                      font={selectedFont}
                      fontSize={fontSize}
                      onClose={handleExitCompare}
                      onManageClick={() => setShowCompareSelector(true)}
                      onVersionRemove={handleRemoveCompareVersion}
                    />
                  ) : (
                    <ChapterContent
                      book={displayBookName}
                      chapter={selectedChapter}
                      font={selectedFont}
                      fontSize={fontSize}
                      version={displayVersionName || 'KJV'}
                      scrollToVerse={selectedVerse}
                      readingVerse={currentVerse}
                      theme={currentTheme}
                      selectedVerses={selectedVerses}
                      onVerseLongPress={handleVerseLongPress}
                      onVerseTap={handleVerseTap}
                      highlights={userHighlights}
                      notes={userNotes}
                    />
                  )}
                </div>
              </>
            ) : pageTransition === 'curl' ? (
              /* 3D Page Turn Transition */
              <PageTurnTransition
                pageKey={chapterKey}
                direction={transitionDirection === 'next' ? 1 : -1}
                backgroundColor={currentTheme.bg}
                className="w-full h-full"
              >
                {comparisonMode ? (
                  <ComparisonContent
                    book={selectedBookId || ''}
                    chapter={selectedChapter}
                    versionIds={comparisonVersionIds}
                    bibleVersions={bibleVersions}
                    theme={currentTheme}
                    font={selectedFont}
                    fontSize={fontSize}
                    onClose={handleExitCompare}
                    onManageClick={() => setShowCompareSelector(true)}
                    onVersionRemove={handleRemoveCompareVersion}
                  />
                ) : (
                  <ChapterContent
                    book={displayBookName}
                    chapter={selectedChapter}
                    font={selectedFont}
                    fontSize={fontSize}
                    version={displayVersionName || 'KJV'}
                    scrollToVerse={selectedVerse}
                    readingVerse={currentVerse}
                    theme={currentTheme}
                    selectedVerses={selectedVerses}
                    onVerseLongPress={handleVerseLongPress}
                    onVerseTap={handleVerseTap}
                    highlights={userHighlights}
                    notes={userNotes}
                  />
                )}
              </PageTurnTransition>
            ) : (
              /* Normal transition modes: slide, fade, scroll */
              <AnimatePresence mode="wait" initial={false}>
                {(() => {
                  const variants = getTransitionVariants();
                  return (
                    <motion.div
                      key={chapterKey}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={variants}
                      transition={transitionConfig[pageTransition]}
                      style={{ backgroundColor: currentTheme.bg }}
                    >
                      {comparisonMode ? (
                        <ComparisonContent
                          book={selectedBookId || ''}
                          chapter={selectedChapter}
                          versionIds={comparisonVersionIds}
                          bibleVersions={bibleVersions}
                          theme={currentTheme}
                          font={selectedFont}
                          fontSize={fontSize}
                          onClose={handleExitCompare}
                          onManageClick={() => setShowCompareSelector(true)}
                          onVersionRemove={handleRemoveCompareVersion}
                        />
                      ) : (
                        <ChapterContent
                          book={displayBookName}
                          chapter={selectedChapter}
                          font={selectedFont}
                          fontSize={fontSize}
                          version={displayVersionName || 'KJV'}
                          scrollToVerse={selectedVerse}
                          readingVerse={currentVerse}
                          theme={currentTheme}
                          selectedVerses={selectedVerses}
                          onVerseLongPress={handleVerseLongPress}
                          onVerseTap={handleVerseTap}
                          highlights={userHighlights}
                          notes={userNotes}
                        />
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Audio Controls - MOVES UP/DOWN WITH SCROLL */}
      <div
        className={`fixed left-0 right-0 z-30 pointer-events-none transition-all duration-700 ease-in-out ${showAudioControls ? 'bottom-[90px]' : 'bottom-4'
          }`}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="flex items-center justify-between pointer-events-auto">
            {/* Previous Button - Left side */}
            {!isFirstChapterOfBible && (
              <button
                onClick={handlePrevious}
                className="ml-[7px] p-3 rounded-full transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <ChevronLeft className="size-5 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
              </button>
            )}

            {/* Spacer for alignment when left button is hidden */}
            {isFirstChapterOfBible && <div className="w-[52px]" />}

            {/* Play/Pause Button - Center - Expandable */}
            <AnimatePresence mode="wait">
              {audioControlExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ width: 56, opacity: 0, scale: 0.95 }}
                  animate={{ width: 'auto', opacity: 1, scale: 1 }}
                  exit={{ width: 56, opacity: 0, scale: 0.95 }}
                  transition={{
                    width: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
                    opacity: { duration: 0.3, ease: 'easeInOut' },
                    scale: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }
                  }}
                  className="rounded-full px-1.5 py-0.5 flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%)',
                    backdropFilter: 'blur(40px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  {/* Equalizer Icon - Left */}
                  <button
                    onClick={() => setShowAudioSheet(true)}
                    className="p-0.5 rounded-full hover:bg-white/40 transition-colors flex-shrink-0"
                  >
                    <RiEqualizer3Fill className="size-4 text-[var(--color-primary-teal)]/85" />
                  </button>

                  {/* Play/Pause Button with Progress Circle - Center */}
                  <button
                    onClick={toggleTTS}
                    className="relative flex-shrink-0 w-[40px] h-[40px]"
                  >
                    {/* Progress Circle */}
                    <svg className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="20" cy="20" r="18" fill="none" stroke="var(--color-primary-teal)" strokeWidth="2" opacity="0.1" />
                      <circle
                        cx="20" cy="20" r="18" fill="none" stroke="var(--color-primary-teal)" strokeWidth="2"
                        strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - (ttsCurrentVerseIndex + 1) / (currentChapterVerses.length || 1))}`}
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                    </svg>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/30 rounded-full w-[32px] h-[32px] flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {ttsPlaying && !ttsPaused ? (
                          <motion.div key="pause" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Pause className="size-4 text-[var(--color-primary-teal)]/85 fill-current" strokeWidth={0} />
                          </motion.div>
                        ) : (
                          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Play className="size-4 text-[var(--color-primary-teal)]/85 fill-current translate-x-[0.5px]" strokeWidth={0} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setAudioControlExpanded(false);
                      stopTTS();
                    }}
                    className="p-0.5 rounded-full hover:bg-white/40 transition-colors flex-shrink-0"
                  >
                    <X className="size-4 text-[var(--color-primary-teal)]/85" strokeWidth={2.5} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="collapsed"
                  initial={{ scale: 0.8, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: 8 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setAudioControlExpanded(true)}
                  className="relative p-4 rounded-full transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%)',
                    backdropFilter: 'blur(40px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    border: '1px solid rgba(255, 255, 255, 0.7)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <Play className="size-6 text-[var(--color-primary-teal)] fill-current relative z-10" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Next Button - Right side */}
            {!isLastChapterOfBible && (
              <button
                onClick={handleNext}
                className="mr-[7px] p-3 rounded-full transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.25) 100%)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15), 0 2px 8px 0 rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.8), inset 0 -1px 0 0 rgba(255, 255, 255, 0.2)'
                }}
              >
                <ChevronRight className="size-5 text-[var(--color-primary-teal)]" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--color-bg-primary)] border-t border-black/10 transition-all duration-300 ease-in-out pb-safe"
        style={{
          transform: isReadingMode ? 'translateY(100%)' : 'translateY(0)',
          opacity: isReadingMode ? 0 : 1,
          pointerEvents: isReadingMode ? 'none' : 'auto'
        }}
      >
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            <button onClick={() => onNavigate?.('home')} className="flex flex-col items-center gap-1 transition-colors min-w-[60px]">
              <Home className="size-6 text-gray-500" />
              <span className="text-[10px] text-gray-500">Home</span>
            </button>
            <button onClick={() => onNavigate?.('bible')} className="flex flex-col items-center gap-1 transition-colors min-w-[60px]">
              <div className="p-1 rounded-full bg-[var(--color-primary-teal)]/10">
                <BiBible className="size-6 text-[var(--color-primary-teal)]" />
              </div>
              <span className="text-[10px] text-[var(--color-primary-teal)] font-medium">Bible</span>
            </button>
            <button onClick={() => onNavigate?.('library')} className="flex flex-col items-center gap-1 transition-colors min-w-[60px]">
              <LuLibraryBig className="size-6 text-gray-500" />
              <span className="text-[10px] text-gray-400">Library</span>
            </button>
            <button onClick={() => onNavigate?.('explore')} className="flex flex-col items-center gap-1 transition-colors min-w-[60px]">
              <Compass className="size-6 text-gray-400" />
              <span className="text-[10px] text-gray-400">Explore</span>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div
            className="fixed inset-0 bg-black/20 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-[#f9f9f9] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-160px)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
                <div className="w-12"></div>
                <h2 className="text-lg font-semibold text-[#31393a]">Fonts & Settings</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-12 text-right text-sm font-medium text-gray-400 hover:text-gray-800 transition-colors"
                >
                  Done
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 space-y-8 bg-[#f9f9f9] overflow-y-auto custom-scrollbar">
                {/* Font Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Font family</label>
                  <div className="relative">
                    <select
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#31393a] font-medium focus:outline-none focus:ring-2 focus:ring-[#31393a]/20"
                    >
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Outfit">Outfit</option>
                      <option value="Serif">Serif</option>
                      <option value="Playfair">Playfair</option>
                      <option value="Inter">Inter</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Font size</label>
                  <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    <span className="text-xs font-medium text-gray-400">A-</span>
                    <input
                      type="range" min="14" max="32" value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="flex-1 accent-[#ff6b85]"
                    />
                    <span className="text-sm font-medium text-gray-400">A+</span>
                  </div>
                </div>

                {/* Theme Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Theme</label>
                  <div className="flex items-center gap-4">
                    {Object.keys(themeConfig).map((theme) => (
                      <button
                        key={theme}
                        onClick={() => setSelectedTheme(theme as any)}
                        className={`size-12 rounded-full border-2 transition-all shadow-sm ${selectedTheme === theme ? 'border-gray-400 ring-4 ring-gray-100' : 'border-gray-200'
                          }`}
                        style={{ backgroundColor: themeConfig[theme as keyof typeof themeConfig].bg }}
                      />
                    ))}
                  </div>
                </div>

                {/* Navigation Style */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Page transitions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'slide', label: 'Slide', icon: ArrowRightLeft },
                      { id: 'curl', label: 'Curl', icon: FileText },
                      { id: 'fade', label: 'Fast Fade', icon: Zap },
                      { id: 'scroll', label: 'Scroll', icon: ScrollText }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setPageTransition(mode.id as any)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${pageTransition === mode.id ? 'border-[#31393a] bg-white shadow-sm' : 'border-gray-200 bg-white/50 text-gray-400'
                          }`}
                      >
                        <mode.icon className={`size-6 ${pageTransition === mode.id ? 'text-[#31393a]' : 'text-gray-400'}`} />
                        <span className={`text-[11px] font-semibold ${pageTransition === mode.id ? 'text-[#31393a]' : 'text-gray-400'}`}>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BibleSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        selectedVersion={selectedVersionId || ''}
        onNavigateToVerse={handleSearchNavigation}
      />

      {/* Verse Action Menu (Selection) */}
      {showVerseActionMenu && selectedVerses.length > 0 && (
        <VerseActionMenu
          isOpen={selectedVerses.length > 0}
          bookName={displayBookName}
          chapter={selectedChapter}
          selectedVerses={selectedVerses}
          onClose={onVerseMenuClose}
          onHighlight={onVerseMenuHighlight}
          onSave={onVerseMenuSave}
          onNote={onVerseMenuNote}
          onShare={onVerseMenuShare}
          isLoggedIn={!!session?.user}
        />
      )}

      {/* Audio Control Panel */}
      <AudioControlPanel
        isOpen={showAudioSheet}
        onClose={() => setShowAudioSheet(false)}
        selectedVerse={selectedVerse || (ttsCurrentVerseIndex + 1) || 1}
        totalVerses={currentChapterVerses.length || 1}
        audioCurrentTime={(ttsCurrentVerseIndex + 1) || 1}
        audioDuration={currentChapterVerses.length || 1}
        audioPlaying={ttsPlaying && !ttsPaused}
        playbackSpeed={ttsRate}
        onVerseChange={(v) => { stopTTS(); startTTS(v - 1); }}
        onTimeChange={(val) => { stopTTS(); startTTS(val - 1); }}
        onPlayPauseToggle={toggleTTS}
        onSpeedChange={setTtsRate}
        onTimerClick={() => setShowTimerMenu(true)}
        ttsVolume={ttsVolume}
        onVolumeChange={setTtsVolume}
        repeatMode={repeatMode}
        onRepeatModeToggle={() => setRepeatMode(prev => prev === 'none' ? 'chapter' : prev === 'chapter' ? 'verse' : 'none')}
        selectedChapter={selectedChapter}
        selectedBook={displayBookName}
      />
    </div>
  );
}
