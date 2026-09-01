"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronDown, Home, Compass, Play, Pause, Music, MoreVertical, X,
  ChevronLeft, ChevronRight, Check, Repeat, Repeat1, Shuffle,
  List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText,
  Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download,
  Gauge, Timer, Circle, Activity, Music2, Columns2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSavedItems } from '@/lib/useSavedItems';
import { useSavedVerses, buildVerseRangeText } from '@/lib/useSavedVerses';
import { shareVerse, formatCopyVerseText } from '@/utils/verseFormatter';
import { RiSortDesc, RiSortAlphabetAsc, RiEqualizer3Fill } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { MdOutlineLibraryBooks } from 'react-icons/md';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import BibleSkeleton, { BookListSkeleton, VersionListSkeleton, ComparisonSkeleton, BibleReaderSkeleton } from './BibleSkeleton';
import AppHeader from './AppHeader';
import PageTurnTransition from './PageTurnTransition';
import EqualizerIcon from './EqualizerIcon';
import BibleSearch from './BibleSearch';
import CompareVersionsModal from './CompareVersionsModal';
import CompareMenu from './CompareMenu';
import CompareView from './CompareView';

import { useMediaStore } from '@/lib/mediaStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import ChapterContent, { fetchChapterContent } from './ChapterContent';
import { fetchWithOfflineCache } from '@/lib/offline';
import ComparisonContent from './ComparisonContent';
import VerseActionMenu from './VerseActionMenu';
import AudioControlPanel from './AudioControlPanel';
import { useReadingProgress } from '@/lib/useReadingProgress';
import { BIBLE_BOOKS, TELUGU_BOOK_NAMES, HINDI_BOOK_NAMES, findCanonicalBookOrder, findCanonicalBookName } from '@/utils/bibleBooks';
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
import { toast } from '@/context/ToastContext';

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

function findBookInList(allBooksList: any[], identifier: string | number | undefined | null, fallbackOrder?: number | null) {
  if (!allBooksList || allBooksList.length === 0) return null;

  // 1. Direct ID match
  if (identifier && typeof identifier === 'string') {
    const byId = allBooksList.find(b => b.id === identifier || b._id === identifier);
    if (byId) return byId;
  }

  // 2. Canonical order match
  const order = fallbackOrder || findCanonicalBookOrder(identifier);
  if (order !== null) {
    const byOrder = allBooksList.find(b => b.order === order);
    if (byOrder) return byOrder;

    const canonicalEng = BIBLE_BOOKS.find(bb => bb.order === order)?.name;
    if (canonicalEng) {
      const byEng = allBooksList.find(b =>
        b.englishName?.toLowerCase() === canonicalEng.toLowerCase() ||
        b.name?.toLowerCase() === canonicalEng.toLowerCase()
      );
      if (byEng) return byEng;
    }
  }

  // 3. Name or abbreviation match
  if (identifier && typeof identifier === 'string') {
    const norm = identifier.toLowerCase().trim();
    const byName = allBooksList.find(b =>
      b.name?.toLowerCase().trim() === norm ||
      b.englishName?.toLowerCase().trim() === norm ||
      b.abbreviation?.toLowerCase().trim() === norm
    );
    if (byName) return byName;
  }

  return null;
}

interface BibleReaderPageProps {
  onNavigate?: (page: 'home' | 'bible' | 'library' | 'explore') => void;
}

const isBibleReadingRoute = (path?: string | null) => path === '/bible' || path?.startsWith('/bible/') || false;

export default function BibleReaderPageContainer({ onNavigate }: BibleReaderPageProps) {
  const queryClient = useQueryClient();
  const { currentVerse, setCurrentVerse, setCurrentChapter: setStoreChapter } = useMediaStore();
  const { updateProgress, latestProgress } = useReadingProgress();
  const { data: session } = useSession();
  const router = useRouter();
  const { savedItems, isSaved, getSavedItem, toggleSave, saveItem, unsaveItem } = useSavedItems();
  const {
    savedVerses,
    userLabels,
    getSavedVerse,
    savedVerseIdsForChapter,
    saveVerse,
    deleteSavedVerse,
    addUserLabel,
  } = useSavedVerses();

  // determine whether we are on bible page; if not, render only nav bar
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isBiblePage = isBibleReadingRoute(pathname);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [displayBookName, setDisplayBookName] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [displayVersionName, setDisplayVersionName] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);

  // Hydration guard: tracks whether the active version has already been resolved
  // from a canonical source (localStorage, URL params, or latestProgress).
  // Prevents subsequent API responses from overriding the user's persisted preference.
  const versionHydrated = useRef(false);

  // Pending deep-link parameters to consume once on arrival from Highlights, Notes, Saves, etc.
  const pendingDeepLinkRef = useRef<{
    version?: string | null;
    book?: string | null;
    chapter?: number | null;
    verse?: number | null;
  } | null>(null);

  // Tracks the last processed searchParams query string to detect fresh incoming navigations
  const lastProcessedQueryRef = useRef<string | null>(null);

  // Tracks pending highlight updates per verse for optimistic state and request sequencing/rollback
  const pendingHighlightUpdatesRef = useRef<Map<number, {
    targetColor: string;
    originalItem: any | null;
    timer: NodeJS.Timeout | null;
    isProcessing: boolean;
  }>>(new Map());
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hideFootnotes, setHideFootnotes] = useState(false);
  const [showVerseSelector, setShowVerseSelector] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  // Holds a user-facing error message when TTS cannot start (e.g. no Telugu voice installed)
  const [ttsVoiceError, setTtsVoiceError] = useState<string | null>(null);

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

  // Selection State
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);


  const handleVerseDoubleTap = useCallback((verseNum: number, e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) return prev;
      return [...prev, verseNum];
    });
  }, []);

  const handleVerseTap = useCallback((verseNum: number, e?: React.PointerEvent) => {
    if (e) e.stopPropagation();
    if (verseNum === 0) {
      setSelectedVerses([]);
      return;
    }
    setSelectedVerses(prev => {
      if (prev.includes(verseNum)) {
        return prev.filter(v => v !== verseNum);
      }
      return [...prev, verseNum];
    });
  }, []);

  // Handlers for menu actions
  const onVerseMenuClose = () => setSelectedVerses([]);
  const onVerseMenuHighlight = async (color: string) => {
    if (!session?.user || selectedVerses.length === 0 || typeof selectedChapter !== 'number') return;

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

  const onVerseMenuSave = async (labels: string[], note: string, isPrivate: boolean) => {
    if (!session?.user || selectedVerses.length === 0 || typeof selectedChapter !== 'number') return;

    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const verseRangeText = buildVerseRangeText(displayBookName || '', selectedChapter, sortedVerses);

    await saveVerse({
      bookId: selectedBookId || '',
      bookName: displayBookName || '',
      chapter: selectedChapter,
      verses: sortedVerses,
      verseRangeText,
      labels,
      note,
      version: displayVersionName || undefined,
      isPrivate,
    });
    setSelectedVerses([]);
  };

  const onVerseMenuDelete = async () => {
    if (!session?.user || selectedVerses.length === 0 || typeof selectedChapter !== 'number') return;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const existing = selectedBookId
      ? getSavedVerse(selectedBookId, selectedChapter, sortedVerses)
      : undefined;
    if (existing) await deleteSavedVerse(existing._id);
    setSelectedVerses([]);
  };

  const onVerseMenuNote = async (note: string) => {
    if (!session?.user || selectedVerses.length === 0 || typeof selectedChapter !== 'number') return;
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

  const onVerseMenuShare = async () => {
    if (selectedVerses.length === 0) return;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);

    const selectedObjs = sortedVerses.map(vNum => {
      const vObj = currentChapterVerses.find((v: any) => (v.number === vNum || v.verse === vNum));
      return {
        number: vNum,
        text: vObj?.text || ''
      };
    });

    let verseText = '';
    if (selectedObjs.length > 1) {
      verseText = selectedObjs.map(v => `${v.number} ${v.text}`).join(' ');
    } else if (selectedObjs.length === 1) {
      verseText = selectedObjs[0].text;
    }

    const reference = buildVerseRangeText(displayBookName || selectedBookId || '', selectedChapter || 1, sortedVerses);
    const version = displayVersionName || selectedVersionId || 'KJV';

    await shareVerse({
      verseText,
      reference,
      version,
      book: selectedBookId || displayBookName,
      chapter: selectedChapter,
      verses: sortedVerses,
    });

    setSelectedVerses([]);
  };

  const onVerseMenuCopy = () => {
    if (selectedVerses.length === 0) return;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);

    const selectedObjs = sortedVerses.map(vNum => {
      const vObj = currentChapterVerses.find((v: any) => (v.number === vNum || v.verse === vNum));
      return {
        number: vNum,
        text: vObj?.text || ''
      };
    });

    let verseText = '';
    if (selectedObjs.length > 1) {
      verseText = selectedObjs.map(v => `${v.number} ${v.text}`).join(' ');
    } else if (selectedObjs.length === 1) {
      verseText = selectedObjs[0].text;
    }

    const reference = buildVerseRangeText(displayBookName || selectedBookId || '', selectedChapter || 1, sortedVerses);
    const version = displayVersionName || selectedVersionId || 'KJV';

    const textToCopy = formatCopyVerseText({
      verseText,
      verseReference: reference,
      version,
    });

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => toast.success('Verse copied to the clipboard'))
        .catch((err) => {
          console.error('Failed to copy text:', err);
          toast.error('Failed to copy text.');
        });
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

  // Load non-domain preferences from localStorage on mount in Container
  useEffect(() => {
    const cachedTheme = localStorage.getItem('bible-reader-theme');
    const cachedFont = localStorage.getItem('bible-reader-font');
    const cachedSize = localStorage.getItem('bible-reader-font-size');
    const cachedTransition = localStorage.getItem('bible-reader-page-transition');

    if (cachedTheme) setSelectedTheme(cachedTheme as any);
    if (cachedFont) setSelectedFont(cachedFont);
    if (cachedSize) setFontSize(parseInt(cachedSize, 10) || 18);
    if (cachedTransition) setPageTransition(cachedTransition as any);
  }, []);

  // Save selectors to localStorage when they change
  useEffect(() => {
    if (selectedVersionId) localStorage.setItem('bible-reader-version-id', selectedVersionId);
  }, [selectedVersionId]);

  useEffect(() => {
    if (displayVersionName) localStorage.setItem('bible-reader-version-name', displayVersionName);
  }, [displayVersionName]);

  useEffect(() => {
    if (selectedBookId) localStorage.setItem('bible-reader-book-id', selectedBookId);
  }, [selectedBookId]);

  useEffect(() => {
    if (displayBookName) localStorage.setItem('bible-reader-book-name', displayBookName);
  }, [displayBookName]);

  useEffect(() => {
    if (selectedChapter) localStorage.setItem('bible-reader-chapter', selectedChapter.toString());
  }, [selectedChapter]);

  useEffect(() => {
    if (selectedTheme) {
      localStorage.setItem('bible-reader-theme', selectedTheme);
      window.dispatchEvent(new CustomEvent('bible-theme-change', { detail: { theme: selectedTheme } }));
    }
  }, [selectedTheme]);

  useEffect(() => {
    if (selectedFont) localStorage.setItem('bible-reader-font', selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    if (fontSize) localStorage.setItem('bible-reader-font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    if (pageTransition) localStorage.setItem('bible-reader-page-transition', pageTransition);
  }, [pageTransition]);

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

  // ── 1. Fetch Bible Versions ───────────────────────────────────────────
  const {
    data: bibleVersions,
    isLoading: isLoadingVersions,
    isError: isErrorVersions,
    refetch: refetchVersions,
  } = useQuery<Array<{ id: string; name: string; fullName: string; language: string }>>({
    queryKey: ['bible-versions'],
    queryFn: () =>
      fetchWithOfflineCache('bible_versions', async () => {
        const response = await fetch('/api/v1/bible/versions');
        const result = await response.json();
        if (!result.success) throw new Error('Failed to fetch versions');
        return result.data.map((v: any) => ({
          id: v._id,
          name: v.abbreviation,
          fullName: v.name,
          language: v.language === 'en' ? 'English' : v.language === 'te' ? 'Telugu' : v.language === 'hi' ? 'Hindi' : v.language,
        }));
      }),
    enabled: isBiblePage,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // ── Deep-Link Detection (one-time consumption on arrival / external route push) ──
  useEffect(() => {
    if (!isBiblePage) return;

    const currentQuery = searchParams?.toString() || '';
    if (currentQuery && currentQuery !== lastProcessedQueryRef.current) {
      const qVersion = searchParams.get('version');
      const qBook = searchParams.get('book');
      const qChapter = searchParams.get('chapter');
      const qVerse = searchParams.get('verse') || searchParams.get('v');

      if (qVersion || qBook || qChapter || qVerse) {
        lastProcessedQueryRef.current = currentQuery;
        pendingDeepLinkRef.current = {
          version: qVersion,
          book: qBook,
          chapter: qChapter ? parseInt(qChapter, 10) : null,
          verse: qVerse ? (parseInt(qVerse.includes(':') ? qVerse.split(':')[1] : qVerse, 10) || null) : null,
        };

        // Clean query parameters from URL history so they do not linger or re-trigger on subsequent re-renders
        try {
          window.history.replaceState(null, '', pathname);
        } catch (e) {}
      }
    }
  }, [isBiblePage, searchParams, pathname]);

  // ── 2. Resolve Active Version when bibleVersions is available ───────────
  useEffect(() => {
    if (!isBiblePage || !bibleVersions || bibleVersions.length === 0) return;

    // 1. If deep link version is pending, apply it
    const deepVersion = pendingDeepLinkRef.current?.version;
    if (deepVersion && deepVersion !== 'undefined') {
      const matched = bibleVersions.find(
        (v: any) =>
          v.name?.toLowerCase() === deepVersion.toLowerCase() ||
          v.id?.toLowerCase() === deepVersion.toLowerCase() ||
          v.fullName?.toLowerCase() === deepVersion.toLowerCase()
      );
      if (matched) {
        setSelectedVersionId(matched.id);
        setDisplayVersionName(matched.name);
        versionHydrated.current = true;
        if (pendingDeepLinkRef.current) {
          pendingDeepLinkRef.current.version = null;
        }
        return;
      }
    }

    // 2. If version is already set and hydrated, do not overwrite manual selections!
    if (selectedVersionId && versionHydrated.current) {
      return;
    }

    // 3. Fallback to localStorage / user profile preference / KJV default
    const cachedVersionId = localStorage.getItem('bible-reader-version-id');
    const cachedVersionName = localStorage.getItem('bible-reader-version-name');
    const preferred = (session?.user as any)?.preferredBibleVersion;

    let matchedVersion = null;
    if (cachedVersionId || cachedVersionName) {
      matchedVersion = bibleVersions.find(
        (v: any) =>
          v.id === cachedVersionId ||
          v.name?.toLowerCase() === cachedVersionName?.toLowerCase()
      );
    }

    if (!matchedVersion && preferred) {
      matchedVersion = bibleVersions.find(
        (v: any) =>
          v.name?.toLowerCase() === preferred.toLowerCase() ||
          v.id === preferred
      );
    }

    const defaultVersion =
      matchedVersion ||
      bibleVersions.find((v: any) => v.name === 'KJV' || v.name === 'KJV-BSI') ||
      bibleVersions[0];

    if (defaultVersion) {
      setSelectedVersionId(defaultVersion.id);
      setDisplayVersionName(defaultVersion.name);
      versionHydrated.current = true;
    }
  }, [isBiblePage, bibleVersions, session, selectedVersionId]);

  // ── 3. Fetch Books for Resolved Version ────────────────────────────────
  const {
    data: bibleBooksState,
    isLoading: isLoadingBooks,
    isError: isErrorBooks,
  } = useQuery<{
    'Old Testament': Array<{ id: string; name: string; englishName?: string; abbreviation?: string; order: number }>;
    'New Testament': Array<{ id: string; name: string; englishName?: string; abbreviation?: string; order: number }>;
  }>({
    queryKey: ['bible-books', selectedVersionId],
    queryFn: () =>
      fetchWithOfflineCache(`bible_books_${selectedVersionId}`, async () => {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/books`);
        const result = await response.json();
        if (!result.success) throw new Error('Failed to fetch books');

        const books = result.data;
        const selectedVerObj = bibleVersions?.find((v: any) => v.id === selectedVersionId);
        const isTeluguVersion = selectedVerObj?.language === 'Telugu';

        const resolveDisplayName = (b: any): string => {
          if (!isTeluguVersion) return b.name;
          const canonical = BIBLE_BOOKS.find(bb => bb.order === b.order);
          if (canonical && TELUGU_BOOK_NAMES[canonical.name]) {
            return TELUGU_BOOK_NAMES[canonical.name];
          }
          if (TELUGU_BOOK_NAMES[b.name]) return TELUGU_BOOK_NAMES[b.name];
          return b.name;
        };

        const getBookOrder = (b: any): number => {
          if (typeof b.order === 'number' && b.order >= 1 && b.order <= 66) return b.order;
          const canonicalOrder = findCanonicalBookOrder(b.englishName || b.name || b.abbreviation);
          return canonicalOrder ?? 1;
        };

        const ot = books.filter((b: any) => {
          if (b.testament) return b.testament === 'OT';
          const order = getBookOrder(b);
          return order <= 39;
        }).map((b: any) => ({
          id: b._id,
          name: resolveDisplayName(b),
          englishName: b.name,
          abbreviation: b.abbreviation,
          order: getBookOrder(b),
        }));

        const nt = books.filter((b: any) => {
          if (b.testament) return b.testament === 'NT';
          const order = getBookOrder(b);
          return order > 39;
        }).map((b: any) => ({
          id: b._id,
          name: resolveDisplayName(b),
          englishName: b.name,
          abbreviation: b.abbreviation,
          order: getBookOrder(b),
        }));

        return {
          'Old Testament': ot,
          'New Testament': nt,
        };
      }),
    enabled: isBiblePage && !!selectedVersionId && !!bibleVersions && bibleVersions.length > 0,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  // ── 4. Resolve Active Book & Chapter when bibleBooksState is available ──
  useEffect(() => {
    if (!isBiblePage || !bibleBooksState) return;

    const ot = bibleBooksState['Old Testament'] || [];
    const nt = bibleBooksState['New Testament'] || [];
    const allBooksList = [...ot, ...nt];
    if (allBooksList.length === 0) return;

    // 1. Check if there is a pending deep link to apply
    const deepLink = pendingDeepLinkRef.current;
    if (deepLink?.book) {
      const matchedBook = findBookInList(allBooksList, deepLink.book);
      if (matchedBook) {
        setSelectedBookId(matchedBook.id);
        setDisplayBookName(matchedBook.name);

        if (deepLink.chapter && !isNaN(deepLink.chapter) && deepLink.chapter >= 1) {
          setSelectedChapter(deepLink.chapter);
        } else {
          setSelectedChapter(1);
        }

        if (deepLink.verse && !isNaN(deepLink.verse) && deepLink.verse > 0) {
          setSelectedVerse(deepLink.verse);
        }

        pendingDeepLinkRef.current = null;
        return;
      }
    }

    // 2. Existing selection / version-switch canonical reconciliation
    if (selectedBookId || displayBookName) {
      const existingInCurrentList = allBooksList.find(b => b.id === selectedBookId);
      if (existingInCurrentList) {
        if (displayBookName !== existingInCurrentList.name) {
          setDisplayBookName(existingInCurrentList.name);
        }
        return;
      }

      // Version switched: find canonical equivalent in the newly active version
      const prevOrder = findCanonicalBookOrder(displayBookName) || findCanonicalBookOrder(selectedBookId);
      const equivalentBook = findBookInList(allBooksList, displayBookName, prevOrder);
      if (equivalentBook) {
        setSelectedBookId(equivalentBook.id);
        setDisplayBookName(equivalentBook.name);
        return;
      }
    }

    // 3. Fallback on initial load (no deep link, no prior selection)
    const cachedBookId = localStorage.getItem('bible-reader-book-id');
    const cachedBookName = localStorage.getItem('bible-reader-book-name');
    let fallbackBook = null;
    if (cachedBookId || cachedBookName) {
      fallbackBook = findBookInList(allBooksList, cachedBookName || cachedBookId);
    }
    if (!fallbackBook) {
      fallbackBook = allBooksList.find(b => b.order === 1) || allBooksList[0];
    }

    if (fallbackBook) {
      setSelectedBookId(fallbackBook.id);
      setDisplayBookName(fallbackBook.name);
    }

    if (selectedChapter === null) {
      const cachedChapter = localStorage.getItem('bible-reader-chapter');
      const parsedCh = cachedChapter ? parseInt(cachedChapter, 10) : 1;
      setSelectedChapter(!isNaN(parsedCh) && parsedCh >= 1 ? parsedCh : 1);
    }
  }, [isBiblePage, bibleBooksState, selectedBookId, displayBookName, selectedChapter]);

  // ── 5. Chapter Count & Verses Queries ─────────────────────────────────
  const { data: currentBookChapters } = useQuery({
    queryKey: ['bible-chapters', selectedVersionId, selectedBookId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBookId}/chapters`);
      const result = await response.json();
      if (!result.success) throw new Error('Failed to fetch chapters');
      if (Array.isArray(result.data)) {
        return result.data.length;
      } else if (result.data && typeof result.data === 'object' && result.data.count) {
        return result.data.count;
      }
      return bookChapters[displayBookName || ''] || 50;
    },
    enabled: isBiblePage && !!selectedVersionId && !!selectedBookId,
    staleTime: Infinity,
  });

  const [currentChapterVerses, setCurrentChapterVerses] = useState<any[]>([]);
  const { data: chapterVersesData, isLoading: isLoadingContent } = useQuery({
    queryKey: ['chapter-verses', selectedVersionId, selectedBookId, selectedChapter],
    queryFn: async () => {
      const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBookId}/${selectedChapter}`);
      const result = await response.json();
      if (!result.success) throw new Error('Failed to fetch verses');
      return result.data.verses;
    },
    enabled: isBiblePage && !!selectedVersionId && !!selectedBookId && typeof selectedChapter === 'number',
    staleTime: Infinity,
  });

  useEffect(() => {
    if (chapterVersesData) {
      setCurrentChapterVerses(chapterVersesData);
      if (selectedBookId && typeof selectedChapter === 'number' && selectedVersionId) {
        setStoreChapter(selectedBookId, selectedChapter, selectedVersionId);
      }
    }
  }, [chapterVersesData, selectedBookId, selectedChapter, selectedVersionId, setStoreChapter]);

  const isAnyPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMoreMenu ||
    showSearch || showVerseSelector || selectedVerses.length > 0 ||
    showCompareSelector || showCompareMenu || showSettingsModal;

  // Verse selection must NOT lock scroll — the user needs to scroll the page
  // to continue tapping additional verses before the action menu appears.
  const shouldLockScroll = showBookSelector || showChapterSelector ||
    showVersionSelector || showMoreMenu ||
    showSearch || showVerseSelector ||
    showCompareSelector || showCompareMenu || showSettingsModal;

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
      else if (showCompareSelector) setShowCompareSelector(false);
      else if (showCompareMenu) setShowCompareMenu(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBookSelector, showChapterSelector, showVerseSelector, showVersionSelector, showMoreMenu, showSearch, showSettingsModal, showCompareSelector, showCompareMenu]);

  // Lock background scroll when a modal/sheet is open.
  // Deliberately excludes selectedVerses — verse selection must allow scrolling.
  useEffect(() => {
    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [shouldLockScroll]);

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

  // Track Reading Progress on Chapter Open
  useEffect(() => {
    if (selectedBookId && selectedVersionId && typeof selectedChapter === 'number') {
      updateProgress({
        bookId: selectedBookId,
        bookName: displayBookName || selectedBookId,
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
  const otBooks = bibleBooksState?.['Old Testament'] || [];
  const ntBooks = bibleBooksState?.['New Testament'] || [];
  const allBooks = [...otBooks, ...ntBooks];
  const currentBookIndex = allBooks.findIndex(b => b.id === selectedBookId || b.name === displayBookName);
  const totalChapters = currentBookChapters || (displayBookName ? (bookChapters[displayBookName] || 50) : 50);
  const isFirstChapterOfBible = allBooks.length > 0 && selectedBookId === allBooks[0]?.id && selectedChapter === 1;
  const isLastChapterOfBible = allBooks.length > 0 && selectedBookId === allBooks[allBooks.length - 1]?.id && selectedChapter === totalChapters;

  // Get next chapter info for preview during drag
  const getNextChapter = () => {
    if (!displayBookName || !selectedChapter) return null;
    if (selectedChapter < totalChapters) {
      return { book: displayBookName, chapter: selectedChapter + 1 };
    } else if (currentBookIndex < allBooks.length - 1) {
      return { book: allBooks[currentBookIndex + 1].name, chapter: 1 };
    }
    return { book: displayBookName, chapter: selectedChapter };
  };

  const getPrevChapter = () => {
    if (!displayBookName || !selectedChapter) return null;
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

  const getNextNextChapter = (next: { book: string; chapter: number }) => {
    const nextBookIndex = allBooks.findIndex(b => b.name === next.book);
    const nextBookChapters = bookChapters[next.book] || 50;
    if (next.chapter < nextBookChapters) {
      return { book: next.book, chapter: next.chapter + 1 };
    } else if (nextBookIndex < allBooks.length - 1) {
      return { book: allBooks[nextBookIndex + 1].name, chapter: 1 };
    }
    return { book: next.book, chapter: next.chapter };
  };

  useEffect(() => {
    if (!isBiblePage || !displayBookName || !selectedChapter) return;
    const ver = displayVersionName || 'KJV';
    const next = getNextChapter();
    if (next && (next.book !== displayBookName || next.chapter !== selectedChapter)) {
      queryClient.prefetchQuery({
        queryKey: ['chapter-content', ver, next.book, next.chapter],
        queryFn: () => fetchChapterContent(ver, next.book, next.chapter, selectedVersionId ?? undefined),
        staleTime: Infinity,
      });
      const nextNext = getNextNextChapter(next);
      if (nextNext && (nextNext.book !== displayBookName || nextNext.chapter !== selectedChapter)) {
        queryClient.prefetchQuery({
          queryKey: ['chapter-content', ver, nextNext.book, nextNext.chapter],
          queryFn: () => fetchChapterContent(ver, nextNext.book, nextNext.chapter, selectedVersionId ?? undefined),
          staleTime: Infinity,
        });
      }
    }
    const prev = getPrevChapter();
    if (prev && (prev.book !== displayBookName || prev.chapter !== selectedChapter)) {
      queryClient.prefetchQuery({
        queryKey: ['chapter-content', ver, prev.book, prev.chapter],
        queryFn: () => fetchChapterContent(ver, prev.book, prev.chapter, selectedVersionId ?? undefined),
        staleTime: Infinity,
      });
    }
  }, [displayBookName, selectedChapter, displayVersionName, isBiblePage, allBooks, selectedVersionId]);

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
      // Scroll is handled by useVerseNavigation inside ChapterContent.
    }
  };


  const handlePrevious = () => {
    if (isTransitioningRef.current || typeof selectedChapter !== 'number') return;
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
    if (isTransitioningRef.current || typeof selectedChapter !== 'number') return;
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

  // ── Helper: find the best available voice for a given BCP-47 lang tag ────────
  // Returns the first voice whose lang starts with the target prefix (e.g. 'te' matches 'te-IN'),
  // or null if none is installed. We intentionally do NOT fall back to a different language
  // voice so that missing-voice failures surface cleanly.
  const findVoiceForLang = useCallback((langTag: string): SpeechSynthesisVoice | null => {
    if (!availableVoices.length) return null;
    const prefix = langTag.split('-')[0].toLowerCase(); // e.g. 'te', 'hi', 'en'
    return (
      // Exact match first
      availableVoices.find(v => v.lang.toLowerCase() === langTag.toLowerCase()) ??
      // Then prefix match (e.g. 'te-IN' matches voice with lang 'te')
      availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix + '-') || v.lang.toLowerCase() === prefix) ??
      null
    );
  }, [availableVoices]);

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

    // ── Voice availability check ────────────────────────────────────────────────
    // Determine the required language for this version
    const lang = bibleVersions?.find((v: any) => v.id === selectedVersionId)?.language;
    const targetLang = lang === 'Telugu' ? 'te-IN' : lang === 'Hindi' ? 'hi-IN' : 'en-US';
    const isNonEnglish = targetLang !== 'en-US';

    // If the user hasn't manually chosen a voice AND the version is non-English,
    // verify that the browser has a voice for the target language.
    // We skip this check for English because virtually all browsers have English voices.
    if (isNonEnglish && !ttsVoice) {
      const matchedVoice = findVoiceForLang(targetLang);
      if (!matchedVoice) {
        // No voice installed — abort playback and show a clear message
        ttsPlayingRef.current = false;
        setTtsPlaying(false);
        setTtsPaused(false);
        setCurrentVerse(null);
        const langLabel = lang === 'Telugu' ? 'Telugu' : lang === 'Hindi' ? 'Hindi' : lang;
        setTtsVoiceError(
          `${langLabel} voice is not available on this device/browser. ` +
          `Please install a ${langLabel} TTS voice or use a mobile browser.`
        );
        return;
      }
    }

    window.speechSynthesis.cancel(); // cancel any lingering utterance

    const verse = currentChapterVerses[index];
    const utterance = new SpeechSynthesisUtterance(verse.text);

    // Set language
    utterance.lang = targetLang;

    // Settings from state at call time (not stale refs)
    utterance.rate = ttsRate;
    utterance.volume = ttsVolume;

    // Voice: prefer user-selected voice; otherwise auto-select by language
    if (ttsVoice) {
      utterance.voice = ttsVoice;
    } else if (isNonEnglish) {
      // We already confirmed a voice exists above
      const autoVoice = findVoiceForLang(targetLang);
      if (autoVoice) utterance.voice = autoVoice;
    }

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
      setCurrentVerse(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [currentChapterVerses, bibleVersions, selectedVersionId, ttsVoice, ttsRate, ttsVolume, findVoiceForLang]);

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
    // Clear any previous voice error when user explicitly starts playback
    setTtsVoiceError(null);
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
    setTtsVoiceError(null);
  }, [selectedBookId, selectedChapter, selectedVersionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCleaningUpRef.current = true;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (pendingHighlightUpdatesRef.current) {
        pendingHighlightUpdatesRef.current.forEach((update) => {
          if (update.timer) {
            clearTimeout(update.timer);
          }
        });
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

    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect gesture direction only once after a meaningful threshold.
    // Only classify as horizontal when X clearly dominates Y (2.5×).
    // Everything else defaults to vertical scroll to prevent accidental chapter changes.
    if (gestureDetected.current === 'none' && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      if (Math.abs(diffX) > Math.abs(diffY) * 2.5) {
        gestureDetected.current = 'horizontal';
        if (pageTransition === 'slide') {
          setIsDragging(true); // Only engage drag system for horizontal gestures
        }
      } else {
        gestureDetected.current = 'vertical';
      }
    }

    // If vertical scroll, do nothing - let native scrolling work
    if (gestureDetected.current === 'vertical') {
      return;
    }

    if (pageTransition !== 'slide') return;

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
      // For non-slide transitions, only navigate if a horizontal gesture was confirmed
      if (gestureDetected.current === 'horizontal') {
        const swipeThreshold = 80; // Higher threshold to require a deliberate swipe
        const diff = touchStartX.current - touchEndX.current;

        if (Math.abs(diff) > swipeThreshold) {
          if (diff > 0 && !isLastChapterOfBible) {
            handleNext();
          } else if (diff < 0 && !isFirstChapterOfBible) {
            handlePrevious();
          }
        }
      }
      gestureDetected.current = 'none';
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
      bg: '#f5e6c8',
      text: '#5c4a3a',
      verseNumber: '#c44a61'
    },
    cream: {
      bg: '#f8f6f1',
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
      if (scrollProgress >= 0.75 && selectedBookId && selectedVersionId && typeof selectedChapter === 'number') {
        updateProgress({
          bookId: selectedBookId,
          bookName: displayBookName || undefined,
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

  // Bible narration content
  const getBibleContent = () => {
    return currentChapterVerses || [];
  };

  // ── 6. Query User Personal Notes & Highlights ───────────────────────────
  const { data: rawUserNotes = [] } = useQuery<any[]>({
    queryKey: ['user-notes', session?.user?.id],
    queryFn: () =>
      fetchWithOfflineCache(`user_notes_${session?.user?.id}`, async () => {
        const res = await fetch('/api/notes?limit=100');
        if (!res.ok) return [];
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data)) return [];
        return json.data;
      }),
    enabled: isBiblePage && !!session?.user?.id,
    staleTime: 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });

  const userHighlights = useMemo(() => {
    return savedItems.filter(i => i.type === 'highlight');
  }, [savedItems]);

  const userNotes = useMemo(() => {
    const list: any[] = [...rawUserNotes];
    for (const item of savedItems) {
      if (item.type === 'note') {
        const alreadyInList = list.some(
          n => n._id === item._id || n._id === item.metadata?.noteId || (item.refId && n.refId === item.refId)
        );
        if (!alreadyInList) {
          list.push({
            _id: item._id,
            refId: item.refId,
            noteText: item.metadata?.content || '',
            labels: item.metadata?.labels || [],
            version: item.metadata?.versionName || item.metadata?.versionId,
            metadata: item.metadata,
            verses: item.metadata?.verses ? [{
              bookId: item.metadata.bookId,
              bookName: item.metadata.bookName,
              chapter: item.metadata.chapter,
              verses: item.metadata.verses
            }] : [],
            createdAt: item.createdAt,
          });
        }
      }
    }
    return list;
  }, [rawUserNotes, savedItems]);

  const handleSaveNoteFromSheet = async (payload: {
    noteId?: string;
    refId?: string;
    verses: number[];
    noteText: string;
    labels: string[];
    bookId?: string;
    bookName?: string;
    chapter?: number;
    version?: string;
  }) => {
    if (!session?.user) {
      toast.error('Please sign in to save notes');
      return;
    }

    const bId = payload.bookId || selectedBookId || '';
    const bName = payload.bookName || displayBookName || '';
    const ch = payload.chapter || selectedChapter || 1;
    const ver = payload.version || displayVersionName || 'NKJV';
    const vList = payload.verses;

    if (payload.noteId && !payload.noteId.startsWith('opt_')) {
      // 1. Existing note update
      const res = await fetch(`/api/notes/${payload.noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: payload.noteText,
          labels: payload.labels,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to update note');
    } else {
      // 2. New note creation
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteText: payload.noteText,
          labels: payload.labels,
          version: ver,
          verses: [{
            bookId: bId,
            bookName: bName,
            chapter: ch,
            verses: vList,
          }],
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create note');
    }

    await queryClient.invalidateQueries({ queryKey: ['user-notes'] });
    await queryClient.invalidateQueries({ queryKey: ['saved-items'] });
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  const handleDeleteNoteFromSheet = async (noteId: string, refId?: string, verses?: number[]) => {
    if (!session?.user) return;

    const res = await fetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    if (!json.success) {
      if (refId) {
        const savedItem = getSavedItem('note', refId);
        if (savedItem?._id) {
          await unsaveItem(savedItem._id);
        }
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['user-notes'] });
    await queryClient.invalidateQueries({ queryKey: ['saved-items'] });
    await queryClient.invalidateQueries({ queryKey: ['notes'] });
  };

  // ── Derive save data for the selected verses ───────────────────────────
  const existingSaveData = useMemo(() => {
    if (selectedVerses.length === 0 || !selectedBookId || typeof selectedChapter !== 'number') return null;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    return getSavedVerse(selectedBookId, selectedChapter, sortedVerses) ?? null;
  }, [selectedVerses, selectedBookId, selectedChapter, getSavedVerse]);

  const existingSaveLabels = existingSaveData?.labels ?? null;
  const existingSaveNote = existingSaveData?.note ?? null;
  const existingSaveIsPrivate = existingSaveData?.isPrivate ?? false;
  const savedVerseId = existingSaveData?._id ?? null;

  // Derive existing note data for the selected verses
  const existingNoteData = useMemo(() => {
    if (selectedVerses.length === 0 || !selectedBookId || typeof selectedChapter !== 'number') return null;
    const sortedVerses = [...selectedVerses].sort((a, b) => a - b);
    const refId = `${selectedBookId}_${selectedChapter}_${sortedVerses.join('-')}_${selectedVersionId}`;
    return userNotes.find(n => n.refId === refId) ?? null;
  }, [selectedVerses, selectedBookId, selectedChapter, selectedVersionId, userNotes]);

  const existingNoteText = existingNoteData?.metadata?.content ?? null;
  const existingNoteLabels = existingNoteData?.metadata?.labels ?? null;

  // ── Saved verse IDs for current chapter (for bookmark icons in text) ───
  const savedVerseIds = useMemo(() => {
    if (!selectedBookId || typeof selectedChapter !== 'number') return [];
    return savedVerseIdsForChapter(selectedBookId, selectedChapter);
  }, [selectedBookId, selectedChapter, savedVerseIdsForChapter, savedVerses]);

  // Derive page readiness
  const isPageReady = Boolean(
    selectedVersionId &&
    displayVersionName &&
    selectedBookId &&
    displayBookName &&
    typeof selectedChapter === 'number' &&
    bibleVersions &&
    bibleVersions.length > 0 &&
    bibleBooksState &&
    (bibleBooksState['Old Testament']?.length > 0 || bibleBooksState['New Testament']?.length > 0)
  );

  if (!isBiblePage) {
    return null;
  }

  if (isErrorVersions || (selectedVersionId && isErrorBooks)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}>
        <div className="size-16 bg-red-50 dark:bg-red-950/40 rounded-full flex items-center justify-center mb-4">
          <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold mb-2">Unable to load Bible data</h3>
        <p className="opacity-70 max-w-xs mb-6 text-sm">Please check your internet connection or try again.</p>
        <button
          onClick={() => {
            refetchVersions();
            if (selectedVersionId) {
              queryClient.invalidateQueries({ queryKey: ['bible-books', selectedVersionId] });
            }
          }}
          className="px-6 py-2.5 bg-[var(--color-primary-teal)] text-white rounded-full font-medium shadow-md hover:opacity-90 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isPageReady) {
    return <BibleReaderSkeleton theme={currentTheme} />;
  }

  return (
    <BibleReaderPage
      isReadingMode={isReadingMode}
      showAudioControls={isBiblePage && showAudioControls}
      apiVersions={bibleVersions}
      books={bibleBooksState}
      onNavigate={onNavigate}
      verses={currentChapterVerses}
      isLoadingContent={isLoadingContent}
      chapter={selectedChapter!}
      version={displayVersionName!}
      book={displayBookName!}
      scrollToVerse={selectedVerse ?? undefined}
      pageTransition={pageTransition}
      onPageTransitionChange={setPageTransition}
      onChapterChange={(ch: number) => {
        pendingDeepLinkRef.current = null;
        setSelectedChapter(ch);
        setSelectedVerse(null);
        try {
          localStorage.setItem('bible-reader-chapter', ch.toString());
        } catch (e) {}
      }}
      onBookChange={(bId: string) => {
        pendingDeepLinkRef.current = null;
        const booksList = [...(bibleBooksState?.['Old Testament'] || []), ...(bibleBooksState?.['New Testament'] || [])];
        const bookObj = findBookInList(booksList, bId);
        if (bookObj) {
          setSelectedBookId(bookObj.id);
          setDisplayBookName(bookObj.name);
          setSelectedChapter(1);
          setSelectedVerse(null);
          try {
            localStorage.setItem('bible-reader-book-id', bookObj.id);
            localStorage.setItem('bible-reader-book-name', bookObj.name);
            localStorage.setItem('bible-reader-chapter', '1');
          } catch (e) {}
        }
      }}
      onVersionChange={(vId: string) => {
        pendingDeepLinkRef.current = null;
        const matchingVer = bibleVersions?.find((v: any) => v.id === vId || v.name === vId || v.fullName === vId);
        if (matchingVer) {
          setSelectedVersionId(matchingVer.id);
          setDisplayVersionName(matchingVer.name);
          versionHydrated.current = true;
          try {
            localStorage.setItem('bible-reader-version-id', matchingVer.id);
            localStorage.setItem('bible-reader-version-name', matchingVer.name);
          } catch (e) {}
        }
      }}
      onSaveHighlight={(verses: number[], color: string) => {
        if (!session?.user) return;

        // Process each verse highlight in the background with optimistic updates & queueing/debouncing
        verses.forEach((verseNum) => {
          const refId = `${selectedBookId}_${selectedChapter}_${verseNum}_${selectedVersionId}`;

          // 1. Get or create the pending record for this verse
          let pending = pendingHighlightUpdatesRef.current.get(verseNum);
          if (!pending) {
            const original = userHighlights.find(h => h.metadata?.verse === verseNum) || null;
            pending = {
              targetColor: color,
              originalItem: original,
              timer: null,
              isProcessing: false
            };
            pendingHighlightUpdatesRef.current.set(verseNum, pending);
          } else {
            pending.targetColor = color;
          }

          // 2. Perform the optimistic UI update immediately
          if (color === 'none') {
            setUserHighlights(prev => prev.filter(h => h.metadata?.verse !== verseNum));
          } else {
            setUserHighlights(prev => {
              const existing = prev.find(h => h.metadata?.verse === verseNum);
              if (existing) {
                return prev.map(h =>
                  h.metadata?.verse === verseNum
                    ? { ...h, metadata: { ...h.metadata, color } }
                    : h
                );
              }
              const tempId = pending?.originalItem?._id || `opt_${Date.now()}_${verseNum}`;
              return [...prev, {
                _id: tempId,
                refId,
                metadata: {
                  bookId: selectedBookId,
                  bookName: displayBookName,
                  chapter: selectedChapter!,
                  verse: verseNum,
                  versionId: selectedVersionId,
                  versionName: displayVersionName,
                  color
                }
              }];
            });
          }

          // 3. Clear any existing debounce timer
          if (pending.timer) {
            clearTimeout(pending.timer);
            pending.timer = null;
          }

          // 4. Define execute function
          const executeUpdate = async () => {
            const currentPending = pendingHighlightUpdatesRef.current.get(verseNum);
            if (!currentPending) return;

            currentPending.isProcessing = true;
            const target = currentPending.targetColor;

            try {
              if (target === 'none') {
                const existingId = currentPending.originalItem?._id;
                if (existingId && !existingId.startsWith('opt_')) {
                  const success = await unsaveItem(existingId);
                  if (!success) {
                    throw new Error('Unsave API failed');
                  }
                }
                currentPending.originalItem = null;
              } else {
                const savedItem = await saveItem({
                  type: 'highlight',
                  refId,
                  metadata: {
                    bookId: selectedBookId || undefined,
                    bookName: displayBookName || undefined,
                    chapter: selectedChapter!,
                    verse: verseNum,
                    versionId: selectedVersionId || undefined,
                    versionName: displayVersionName || undefined,
                    color: target
                  }
                });

                if (!savedItem) {
                  throw new Error('Save API failed');
                }

                currentPending.originalItem = savedItem;

                setUserHighlights(prev => {
                  const latestPending = pendingHighlightUpdatesRef.current.get(verseNum);
                  if (latestPending && latestPending.targetColor === target) {
                    return prev.map(h =>
                      h.metadata?.verse === verseNum
                        ? { ...h, _id: savedItem._id }
                        : h
                    );
                  }
                  return prev;
                });
              }
            } catch (err) {
              console.error(`Failed to sync highlight for verse ${verseNum}:`, err);
              
              const latestPending = pendingHighlightUpdatesRef.current.get(verseNum);
              if (latestPending && latestPending.targetColor === target) {
                const orig = latestPending.originalItem;
                if (orig) {
                  setUserHighlights(prev => {
                    const existing = prev.find(h => h.metadata?.verse === verseNum);
                    if (existing) {
                      return prev.map(h => h.metadata?.verse === verseNum ? orig : h);
                    }
                    return [...prev, orig];
                  });
                } else {
                  setUserHighlights(prev => prev.filter(h => h.metadata?.verse !== verseNum));
                }

                toast.error("Failed to update highlight. Please try again.");
                pendingHighlightUpdatesRef.current.delete(verseNum);
                return;
              }
            }

            currentPending.isProcessing = false;

            const latestPending = pendingHighlightUpdatesRef.current.get(verseNum);
            if (latestPending) {
              if (latestPending.targetColor !== target) {
                executeUpdate();
              } else {
                pendingHighlightUpdatesRef.current.delete(verseNum);
              }
            }
          };

          // 5. Schedule execution (300ms debounce)
          if (!pending.isProcessing) {
            pending.timer = setTimeout(executeUpdate, 300);
          }
        });
      }}
      onSaveNote={(verses: number[], note: string, labels: string[]) => {
        if (!session?.user || verses.length === 0) return;
        handleSaveNoteFromSheet({
          verses,
          noteText: note,
          labels,
          bookId: selectedBookId || undefined,
          bookName: displayBookName || undefined,
          chapter: selectedChapter || 1,
          version: displayVersionName || undefined,
        });
      }}
      onSaveNoteFromSheet={handleSaveNoteFromSheet}
      onDeleteNoteFromSheet={handleDeleteNoteFromSheet}
      selectedVerses={selectedVerses}
      userHighlights={userHighlights}
      userNotes={userNotes}
      onVerseDoubleTap={handleVerseDoubleTap}
      onVerseTap={(v) => {
        if (v === 0) onVerseMenuClose();
        else handleVerseTap(v);
      }}
      onSaveVerses={onVerseMenuSave}
      onDeleteSavedVerse={onVerseMenuDelete}
      onCompareVerses={onVerseMenuCompare}
      onShareVerses={onVerseMenuShare}
      onCopyVerses={onVerseMenuCopy}
      onPlayAudio={() => startTTS(0)}
      onPauseAudio={() => pauseTTS()}
      isSliderDragging={isSliderDragging}
      onSliderDragStart={() => setIsSliderDragging(true)}
      onSliderDragEnd={() => setIsSliderDragging(false)}
      isLoggedIn={!!session?.user}
      existingSaveLabels={existingSaveLabels}
      existingSaveNote={existingSaveNote}
      existingSaveIsPrivate={existingSaveIsPrivate}
      existingNoteText={existingNoteText}
      existingNoteLabels={existingNoteLabels}
      savedVerseId={savedVerseId}
      savedVerseIds={savedVerseIds}
      userLabels={userLabels}
      onAddUserLabel={addUserLabel}
    />
  );
}
