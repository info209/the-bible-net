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
import BibleReaderPage from './BibleReaderPage';

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

const isBibleReadingRoute = (path?: string | null) => path === '/bible' || path?.startsWith('/bible/') || false;

export default function BibleReaderPageContainer({ onNavigate }: BibleReaderPageProps) {
  const { currentVerse, setCurrentVerse, setCurrentChapter: setStoreChapter } = useMediaStore();
  const { updateProgress, latestProgress } = useReadingProgress();
  const { data: session } = useSession();
  const router = useRouter();
  const { isSaved, getSavedItem, toggleSave, saveItem, unsaveItem } = useSavedItems();

  // determine whether we are on bible page; if not, render only nav bar
  const pathname = usePathname();
  const isBiblePage = isBibleReadingRoute(pathname);

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
  const [isSliderDragging, setIsSliderDragging] = useState(false);

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
      if (labels.length === 0) {
        // If no labels, check if we should unsave
        const existing = getSavedItem('bible', refId);
        if (existing) {
          await unsaveItem(existing._id);
        }
      } else {
        await saveItem({
          type: 'bible',
          refId,
          metadata: {
            bookId: selectedBookId || undefined,
            bookName: displayBookName || undefined,
            chapter: selectedChapter,
            verse: verseNum,
            versionId: selectedVersionId || undefined,
            versionName: displayVersionName || undefined,
            labels
          }
        });
      }
    }
    setSelectedVerses([]);
  };

  const onVerseMenuNote = async (note: string) => {
    if (!session?.user || selectedVerses.length === 0) return;
    const refId = `${selectedBookId}_${selectedChapter}_${selectedVerses.join('-')}_${selectedVersionId}`;
    await saveItem({
      type: 'note',
      refId,
      metadata: {
        bookId: selectedBookId || undefined,
        bookName: displayBookName || undefined,
        chapter: selectedChapter,
        verses: selectedVerses,
        versionId: selectedVersionId || undefined,
        versionName: displayVersionName || undefined,
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
    if (!isBibleReadingRoute(pathname)) return;

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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAnyPopupOpen]);

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
          const targetScroll = currentScroll + elementTop - containerTop - 180;

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
      
      // Some browsers (like Chrome or mobile Safari/Samsung Browser) might not apply
      // changes to an ALREADY SPEAKING utterance. We may need to restart if it's playing.
      // But first, let's try updating directly.
      if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
         // Force update for browsers that support it
      }
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

  const handlePlaybackTouchStart = useCallback(() => {
    isTouchRef.current = true;
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setAudioControlExpanded(true);
    }, 500); // UI says 1500, but user requested 500ms stabilization
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
    if (isTouchRef.current) return;
    isLongPressRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setAudioControlExpanded(true);
    }, 500);
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

    if (ttsPaused) {
      ttsIndexRef.current = newVerseIndex;
      setTtsCurrentVerseIndex(newVerseIndex);
      setCurrentVerse(currentChapterVerses[newVerseIndex]?.number || null);
      return;
    }

    // Stop and restart from new index
    stopTTS();
    setTimeout(() => startTTS(newVerseIndex), 10);
  }, [currentChapterVerses, ttsPaused, stopTTS, startTTS]);

  // TTS Control additions
  const handlePrevVerse = useCallback(() => {
    if (ttsCurrentVerseIndex > 0) {
      const newIndex = ttsCurrentVerseIndex - 1;
      if (ttsPaused) {
        ttsIndexRef.current = newIndex;
        setTtsCurrentVerseIndex(newIndex);
        setCurrentVerse(currentChapterVerses?.[newIndex]?.number || null);
      } else {
        stopTTS();
        setTimeout(() => startTTS(newIndex), 50);
      }
    }
  }, [ttsCurrentVerseIndex, ttsPaused, currentChapterVerses, stopTTS, startTTS]);

  const handleNextVerse = useCallback(() => {
    if (currentChapterVerses && ttsCurrentVerseIndex < currentChapterVerses.length - 1) {
      const newIndex = ttsCurrentVerseIndex + 1;
      if (ttsPaused) {
        ttsIndexRef.current = newIndex;
        setTtsCurrentVerseIndex(newIndex);
        setCurrentVerse(currentChapterVerses[newIndex]?.number || null);
      } else {
        stopTTS();
        setTimeout(() => startTTS(newIndex), 50);
      }
    }
  }, [ttsCurrentVerseIndex, currentChapterVerses, ttsPaused, stopTTS, startTTS]);

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

  // Throttled Scroll logic for Reading Mode
  useEffect(() => {
    let lastKnownScrollY = window.scrollY;
    let ticking = false;
    const threshold = 15; // Minimum scroll to trigger state change

    const updateScrollState = () => {
      const currentScrollY = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrolledToBottom = scrollHeight - currentScrollY - clientHeight < 50;
      const deltaY = currentScrollY - lastKnownScrollY;

      // Progress Tracking
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

      // READING MODE TOGGLE - With stabilization
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0 && currentScrollY > 80) {
          // Scrolling down — enter reading mode but keep audio controls visible
          setIsReadingMode(prev => prev ? prev : true);
        } else if (deltaY < -threshold) {
          // Scrolling up — exit reading mode
          setIsReadingMode(prev => !prev ? prev : false);
        }
        lastKnownScrollY = currentScrollY;
      }
      
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollState);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
    <BibleReaderPage
      isReadingMode={isReadingMode}
      showAudioControls={isBiblePage && showAudioControls}
      apiVersions={bibleVersions}
      books={bibleBooksState}
      onNavigate={onNavigate}
      verses={currentChapterVerses}
      chapter={selectedChapter}
      version={displayVersionName || 'KJV'}
      book={displayBookName || 'Genesis'}
      onChapterChange={setSelectedChapter}
      onBookChange={(bId: string) => {
        const bookObj = [...bibleBooksState['Old Testament'], ...bibleBooksState['New Testament']].find(b => b.id === bId || b.name === bId);
        if (bookObj) {
          setSelectedBookId(bookObj.id);
          setDisplayBookName(bookObj.name);
        }
      }}
      onVersionChange={(vId: string) => {
        const matchingVer = bibleVersions.find(v => v.id === vId || v.name === vId);
        if (matchingVer) {
          setSelectedVersionId(matchingVer.id);
          setDisplayVersionName(matchingVer.name);
        }
      }}
      onSaveHighlight={(verses: number[], color: string) => {
        if (!session?.user) return;
        const processHighlights = async () => {
          for (const verseNum of verses) {
            const refId = `${selectedBookId}_${selectedChapter}_${verseNum}_${selectedVersionId}`;
            if (color === 'none') {
              // Remove highlight
              const existing = userHighlights.find(h => h.metadata?.verse === verseNum);
              if (existing && existing._id) {
                await unsaveItem(existing._id);
              }
              // Remove from local state immediately
              setUserHighlights(prev => prev.filter(h => h.metadata?.verse !== verseNum));
            } else {
              await saveItem({
                type: 'highlight',
                refId,
                metadata: {
                  bookId: selectedBookId || undefined,
                  bookName: displayBookName || undefined,
                  chapter: selectedChapter,
                  verse: verseNum,
                  versionId: selectedVersionId || undefined,
                  versionName: displayVersionName || undefined,
                  color
                }
              });
              // Update local state immediately so verse color shows without re-fetch
              setUserHighlights(prev => {
                const existing = prev.find(h => h.metadata?.verse === verseNum);
                if (existing) {
                  return prev.map(h =>
                    h.metadata?.verse === verseNum
                      ? { ...h, metadata: { ...h.metadata, color } }
                      : h
                  );
                }
                return [...prev, { refId, metadata: { bookId: selectedBookId, bookName: displayBookName, chapter: selectedChapter, verse: verseNum, versionId: selectedVersionId, versionName: displayVersionName, color } }];
              });
            }
          }
        };
        processHighlights();
      }}
      onSaveNote={(verses: number[], note: string) => {
        if (!session?.user || verses.length === 0) return;
        const processNotes = async () => {
          const refId = `${selectedBookId}_${selectedChapter}_${verses.join('-')}_${selectedVersionId}`;
          if (!note.trim()) {
            const existing = userNotes.find(n => n.refId === refId);
            if (existing && existing._id) {
              await unsaveItem(existing._id);
              setUserNotes(prev => prev.filter(n => n._id !== existing._id));
            }
          } else {
            await saveItem({
              type: 'note',
              refId,
              metadata: {
                bookId: selectedBookId || undefined,
                bookName: displayBookName || undefined,
                chapter: selectedChapter,
                verses: verses,
                versionId: selectedVersionId || undefined,
                versionName: displayVersionName || undefined,
                content: note
              }
            });
            // Update local state
            setUserNotes(prev => {
              const existing = prev.find(n => n.refId === refId);
              if (existing) {
                return prev.map(n => n.refId === refId ? { ...n, metadata: { ...n.metadata, content: note } } : n);
              }
              return [...prev, { refId, metadata: { bookId: selectedBookId, bookName: displayBookName, chapter: selectedChapter, verses, versionId: selectedVersionId, versionName: displayVersionName, content: note } }];
            });
          }
        };
        processNotes();
      }}
      selectedVerses={selectedVerses}
      userHighlights={userHighlights}
      userNotes={userNotes}
      onVerseLongPress={handleVerseLongPress}
      onVerseTap={(v) => {
        if (v === 0) onVerseMenuClose();
        else handleVerseTap(v);
      }}
      onSaveVerses={onVerseMenuSave}
      onCompareVerses={onVerseMenuCompare}
      onShareVerses={onVerseMenuShare}
      onPlayAudio={() => startTTS(0)}
      onPauseAudio={() => pauseTTS()}
      isSliderDragging={isSliderDragging}
      onSliderDragStart={() => setIsSliderDragging(true)}
      onSliderDragEnd={() => setIsSliderDragging(false)}
      isLoggedIn={!!session?.user}
    />
  );
}
