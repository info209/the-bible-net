import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Home, Compass, Play, Pause, Music, MoreVertical, X, ChevronLeft, ChevronRight, Check, Repeat, Repeat1, Shuffle, List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText, Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Gauge, Timer, Circle, Activity } from 'lucide-react';
import { RiSortDesc, RiSortAlphabetAsc, RiEqualizer3Fill } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { MdCompareArrows } from 'react-icons/md';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { useGestureNavigation } from './navigation/useGestureNavigation';
import { useChapterTransition } from './navigation/useChapterTransition';
import ChapterTransitionStage from './navigation/ChapterTransitionStage';
import AppHeader from './AppHeader';
import EqualizerIcon from './EqualizerIcon';
import ChapterContent, { mockBibleContent } from './ChapterContent';
import AudioControlPanel from './AudioControlPanel';
import VerseActionMenu from './VerseActionMenu';
import { teluguBible, hindiBible } from './BibleData';
import CompareVersionsModal from './CompareVersionsModal';
import CompareMenu from './CompareMenu';
import CompareView from './CompareView';
import BibleSearch from './BibleSearch';

import FontsSettingsModal, { ThemeType, TransitionType } from './FontsSettingsModal';
import AudioFloatingPlayer from './AudioFloatingPlayer';

const VERSE_ACTION_MENU_OPEN_DELAY = 1800;

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

const fallbackVersions = [
  { id: 'NKJV', name: 'NKJV', fullName: 'New King James Version', language: 'English' },
  { id: 'KJV', name: 'KJV', fullName: 'King James Version', language: 'English' },
  { id: 'NASB', name: 'NASB', fullName: 'New American Standard Bible', language: 'English' },
  { id: 'AMP', name: 'AMP', fullName: 'Amplified Bible', language: 'English' },
  { id: 'TELBSI', name: 'TELBSI', fullName: 'పవిత్ర గ్రంథము', language: 'Telugu' },
  { id: 'HINBSI', name: 'HINBSI', fullName: 'पवित्र बाइबिल', language: 'Hindi' },
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
  isReadingMode?: boolean;
  showAudioControls?: boolean;
  apiVersions?: any[];
  books?: { 'Old Testament': { id: string, name: string }[], 'New Testament': { id: string, name: string }[] };
  verses?: any[];
  chapter?: number;
  version?: string;
  book?: string;
  onChapterChange?: (chapter: number) => void;
  onBookChange?: (book: string) => void;
  onVersionChange?: (ver: string) => void;
  selectedVerses?: number[];
  onVerseLongPress?: (verseNumber: number, e?: React.MouseEvent | React.TouchEvent) => void;
  onVerseTap?: (verseNumber: number, e?: React.MouseEvent | React.TouchEvent) => void;
  onSaveHighlight?: (verses: number[], color: string) => void;
  onSaveNote?: (verses: number[], note: string) => void;
  onPlayAudio?: () => void;
  onPauseAudio?: () => void;
  onCompareVerses?: () => void;
  onShareVerses?: () => void;
  onSaveVerses?: (labels: string[], note: string, isPrivate: boolean) => void;
  onDeleteSavedVerse?: () => void;
  savedVerseIds?: number[];
  existingSaveNote?: string | null;
  existingSaveIsPrivate?: boolean;
  /** The _id of the existing save record */
  savedVerseId?: string | null;
  /** DB-persisted user labels */
  userLabels?: string[];
  onAddUserLabel?: (label: string) => Promise<void>;
  /** Highlights for the current chapter from the API */
  userHighlights?: any[];
  /** Notes for the current chapter from the API */
  userNotes?: any[];
  isSliderDragging?: boolean;
  onSliderDragStart?: () => void;
  onSliderDragEnd?: () => void;
  isLoggedIn?: boolean;
  /** Labels the first selected verse is already saved under (enables saved-state UI) */
  existingSaveLabels?: string[] | null;
  pageTransition?: 'slide' | 'curl' | 'fade' | 'scroll';
  onPageTransitionChange?: (transition: 'slide' | 'curl' | 'fade' | 'scroll') => void;
}

export default function BibleReaderPage(props: BibleReaderPageProps) {
  const {
    onNavigate,
    isReadingMode = false,
    showAudioControls = true,
    apiVersions,
    books = {
      'Old Testament': bibleBooks['Old Testament'].map(name => ({ id: name, name })),
      'New Testament': bibleBooks['New Testament'].map(name => ({ id: name, name }))
    },
    chapter = 1,
    version = 'KJV',
    book = 'Genesis',
    onChapterChange,
    onBookChange,
    onVersionChange,
    selectedVerses = [],
    verses = [],
    onVerseLongPress,
    onVerseTap,
    onSaveHighlight,
    onSaveNote,
    onCompareVerses,
    onShareVerses,
    onSaveVerses,
    onDeleteSavedVerse,
    onPlayAudio,
    onPauseAudio,
    savedVerseIds = [],
    existingSaveNote = null,
    existingSaveIsPrivate = false,
    savedVerseId = null,
    userLabels = [],
    onAddUserLabel,
    userHighlights = [],
    userNotes = [],
    isSliderDragging = false,
    onSliderDragStart,
    onSliderDragEnd,
    isLoggedIn = false,
    existingSaveLabels = null,
    pageTransition: propPageTransition,
    onPageTransitionChange: propOnPageTransitionChange,
  } = props;

  const selectedBook = book;
  const selectedChapter = chapter;
  const selectedVersion = version;

  const setSelectedBook = (b: string) => { onBookChange?.(b); };
  const setSelectedChapter = (c: number) => { onChapterChange?.(c); };
  const setSelectedVersion = (v: string) => { onVersionChange?.(v); };
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioControlExpanded, setAudioControlExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showMusicSelector, setShowMusicSelector] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<string | null>('none');
  const [musicLoopMode, setMusicLoopMode] = useState<'shuffle' | 'repeat-all' | 'repeat-one'>('shuffle');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [hideFootnotes, setHideFootnotes] = useState(false);
  const [showAudioControlPanel, setShowAudioControlPanel] = useState(false);
  const [audioPlayerState, setAudioPlayerState] = useState<'default' | 'minimized'>('default');
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);
  const [showVerseSelector, setShowVerseSelector] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0); // in seconds
  const [audioDuration, setAudioDuration] = useState(0); // in seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'chapter' | 'verse'>('none');
  // Stable ref so utterance.onend callbacks always read the live repeatMode
  // without suffering from stale-closure issues (the bug: repeating next verse instead of current).
  const repeatModeRef = useRef<'none' | 'chapter' | 'verse'>(repeatMode);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);

  useEffect(() => {
    if (!showAudioControls) {
      setShowAudioControlPanel(false);
      setAudioPlayerState('default');
    }
  }, [showAudioControls]);

  const handleRepeatModeToggle = () => {
    // Functional update avoids stale-closure on rapid taps.
    setRepeatMode(prev => {
      const modes: Array<'none' | 'chapter' | 'verse'> = ['none', 'chapter', 'verse'];
      return modes[(modes.indexOf(prev) + 1) % modes.length];
    });
  };
  const [selectedTimer, setSelectedTimer] = useState<'stop' | 'end-chapter' | '10-mins' | '15-mins' | '30-mins' | '1-hr' | '2-hrs'>('stop');
  const [showSearch, setShowSearch] = useState(false);
  const [showVerseActionMenu, setShowVerseActionMenu] = useState(false);

  // Compare mode state
  const [compareMode, setCompareMode] = useState<{
    isActive: boolean;
    selectedVersions: string[];
  }>({
    isActive: false,
    selectedVersions: []
  });
  const [showCompareSelector, setShowCompareSelector] = useState(false);
  const [showCompareMenu, setShowCompareMenu] = useState(false);

  // Book sorting state
  const [bookSortType, setBookSortType] = useState<'traditional' | 'alphabetical'>('traditional');

  // Reading settings state
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [fontSize, setFontSize] = useState(18); // Standard book reading size (18px)
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');
  const [localPageTransition, setLocalPageTransition] = useState<'slide' | 'curl' | 'fade' | 'scroll'>('slide'); // Changed to 'slide' as default
  const pageTransition = propPageTransition ?? localPageTransition;
  const setPageTransition = propOnPageTransitionChange ?? setLocalPageTransition;

  // Load font size from localStorage on mount
  useEffect(() => {
    const savedSize = localStorage.getItem('bible-reader-font-size');
    if (savedSize) {
      const parsedSize = parseInt(savedSize, 10);
      if ([14, 16, 18, 22].includes(parsedSize)) {
        setFontSize(parsedSize);
      } else {
        // Handle legacy or invalid values by mapping to closest step
        if (parsedSize < 15) {
          setFontSize(14);
        } else if (parsedSize < 17) {
          setFontSize(16);
        } else if (parsedSize < 20) {
          setFontSize(18);
        } else {
          setFontSize(22);
        }
      }
    }
  }, []);

  // Save font size to localStorage on change
  useEffect(() => {
    if ([14, 16, 18, 22].includes(fontSize)) {
      localStorage.setItem('bible-reader-font-size', fontSize.toString());
    }
  }, [fontSize]);

  // ─── Transition system (new hook-based, centralized) ─────────────────────
  const {
    transitionState,
    isNavigating,
    isNavigatingLive,
    navigateNext,
    navigatePrev,
    releaseLock,
  } = useChapterTransition(pageTransition);

  // Expose convenient aliases that match what the rest of the component uses
  const chapterKey = transitionState.key;
  const transitionDirection = transitionState.direction;

  // ─── Interactive drag state (ref-only — no React state for hot path) ──────
  /**
   * dragOffsetRef holds the current gesture offset in px during a drag.
   * We use a React state pair (dragOffsetState) ONLY to trigger a re-render
   * when we need to switch between AnimatePresence mode and drag-layer mode.
   * During actual finger movement we update the DOM directly via a callback.
   */
  const dragOffsetRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  // Stable value used for the interactive layer render (updated on RAF)
  const [dragOffsetForRender, setDragOffsetForRender] = useState(0);
  const rafRef = useRef<number | null>(null);

  /**
   * isSwipingRef — true while a horizontal swipe gesture is in progress.
   * Updated via ref (no React state) so ChapterContent can check it
   * synchronously in handlePressStart without waiting for a re-render.
   * This prevents the 600ms long-press timer from firing during a swipe.
   */
  const isSwipingRef = useRef(false);

  const contentRef = useRef<HTMLDivElement>(null);

  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Prevent scroll handler from interfering with clicks
  const isUserInteracting = useRef(false);

  // isAnyPopupOpen: used to disable gestures. Deliberately excludes
  // `selectedVerses.length > 0` — verse selection should NOT block swipe
  // navigation. Instead, the gesture hook's `shouldAbort` cancels mid-swipe
  // if selection is active, but allows new gestures to start after.
  const isAnyPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMusicSelector || showMoreMenu ||
    showSettingsMenu || showAudioControlPanel || showVerseSelector ||
    showTimerMenu || showSearch || showCompareSelector || showCompareMenu;

  const isBlockingPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMusicSelector || showMoreMenu ||
    showSettingsMenu || showAudioControlPanel || showVerseSelector ||
    showTimerMenu || showSearch || showCompareSelector || showCompareMenu;
  const shouldLockBodyScroll = showBookSelector || showChapterSelector ||
    showVersionSelector || showMusicSelector ||
    showSettingsMenu || showAudioControlPanel || showVerseSelector ||
    showTimerMenu || showSearch || showCompareSelector || showCompareMenu;

  useEffect(() => {
    if (shouldLockBodyScroll) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [shouldLockBodyScroll]);

  useEffect(() => {
    if (!showMoreMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current?.contains(event.target as Node)) return;
      setShowMoreMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMoreMenu]);

  useEffect(() => {
    if (selectedVerses.length === 0) {
      setShowVerseActionMenu(false);
      return;
    }
    setShowVerseActionMenu(true);
  }, [selectedVerses]);

  // Audio narration state
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [currentReadingVerse, setCurrentReadingVerse] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const narrationVerseIndexRef = useRef(0);
  const narrationPlayingRef = useRef(false);
  const isAutoAdvancingRef = useRef(false);
  const isUserInteractingRef = useRef(false);
  // Drag mode — suppresses auto-scroll while the verse slider is being dragged
  const isDraggingRef = useRef(false);
  // Seeking mode — true while the verse slider is actively being dragged.
  // Guards the selectedVerse useEffect so it cannot fire cancel/restart loops every frame.
  const isSeekingRef = useRef(false);
  // Stores whether audio was playing when a drag started so we can auto-resume on release.
  const wasPlayingBeforeDragRef = useRef(false);

  // Timer state for time-based narration
  const narrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const narrationStartTimeRef = useRef<number | null>(null);

  // Centralized absolute sleep timer reference
  const sleepEndTimeRef = useRef<number | null>(null);

  const getTimerMinutes = (timerVal: typeof selectedTimer): number => {
    switch (timerVal) {
      case '10-mins': return 10;
      case '15-mins': return 15;
      case '30-mins': return 30;
      case '1-hr': return 60;
      case '2-hrs': return 120;
      default: return 0;
    }
  };

  // Music tracks
  const musicTracks = [
    { id: 'none', name: 'None', thumbnail: null },
    { id: 'music1', name: 'Music 1', thumbnail: 'https://images.unsplash.com/photo-1686109616991-1acaf4fa7199?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHJpc3RpYW4lMjBjcm9zcyUyMGdvbGRlbnxlbnwxfHx8fDE3NzAwMzE3ODV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music2', name: 'Music 2', thumbnail: 'https://images.unsplash.com/photo-1507126882445-434b04530d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGRvdmUlMjBmbHlpbmd8ZW58MXx8fHwxNzcwMDMxNzg2fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music3', name: 'Music 3', thumbnail: 'https://images.unsplash.com/photo-1605238721408-3876d8fd3942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWJsZSUyMG9wZW4lMjBsaWdodHxlbnwxfHx8fDE3Njk5MjA2OTV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music4', name: 'Music 4', thumbnail: 'https://images.unsplash.com/photo-1575516662637-99214ea59f23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmF5aW5nJTIwaGFuZHMlMjBzcGlyaXR1YWx8ZW58MXx8fHwxNzcwMDMxNzg3fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music5', name: 'Music 5', thumbnail: 'https://images.unsplash.com/photo-1550541231-56ddb7f844ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHVyY2glMjBzdGFpbmVkJTIwZ2xhc3N8ZW58MXx8fHwxNzcwMDMxNzg3fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music6', name: 'Music 6', thumbnail: 'https://images.unsplash.com/photo-1705608604329-49335be66661?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHJpc3RpYW4lMjB3b3JzaGlwJTIwY2FuZGxlfGVufDF8fHx8MTc3MDAzMTc4OHww&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music7', name: 'Music 7', thumbnail: 'https://images.unsplash.com/photo-1686109616991-1acaf4fa7199?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHJpc3RpYW4lMjBjcm9zcyUyMGdvbGRlbnxlbnwxfHx8fDE3NzAwMzE3ODV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music8', name: 'Music 8', thumbnail: 'https://images.unsplash.com/photo-1507126882445-434b04530d1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMGRvdmUlMjBmbHlpbmd8ZW58MXx8fHwxNzcwMDMxNzg2fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music9', name: 'Music 9', thumbnail: 'https://images.unsplash.com/photo-1605238721408-3876d8fd3942?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiaWJsZSUyMG9wZW4lMjBsaWdodHxlbnwxfHx8fDE3Njk5MjA2OTV8MA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music10', name: 'Music 10', thumbnail: 'https://images.unsplash.com/photo-1575516662637-99214ea59f23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmF5aW5nJTIwaGFuZHMlMjBzcGlyaXR1YWx8ZW58MXx8fHwxNzcwMDMxNzg3fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music11', name: 'Music 11', thumbnail: 'https://images.unsplash.com/photo-1550541231-56ddb7f844ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHVyY2glMjBzdGFpbmVkJTIwZ2xhc3N8ZW58MXx8fHwxNzcwMDMxNzg3fDA&ixlib=rb-4.1.0&q=80&w=1080' },
    { id: 'music12', name: 'Music 12', thumbnail: 'https://images.unsplash.com/photo-1705608604329-49335be66661?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaHJpc3RpYW4lMjB3b3JzaGlwJTIwY2FuZGxlfGVufDF8fHx8MTc3MDAzMTc4OHww&ixlib=rb-4.1.0&q=80&w=1080' },
  ];

  // Helper functions for navigation
  const allBooks = [...books['Old Testament'], ...books['New Testament']].map(b => typeof b === 'string' ? b : b.name);
  const currentBookIndex = allBooks.indexOf(selectedBook);
  const isFirstChapterOfBible = selectedBook === 'Genesis' && selectedChapter === 1;
  const isLastChapterOfBible = selectedBook === 'Revelation' && selectedChapter === bookChapters['Revelation'];

  const totalChapters = bookChapters[selectedBook] || 50;

  // ─── Stable navigation refs ────────────────────────────────────────────────
  // handleNext/handlePrevious read from these refs so they never suffer from
  // stale closures even if the component re-renders mid-gesture.
  const selectedChapterRef = useRef(selectedChapter);
  const selectedBookRef    = useRef(selectedBook);
  const totalChaptersRef   = useRef(totalChapters);
  const currentBookIndexRef = useRef(currentBookIndex);
  const allBooksRef        = useRef(allBooks);

  useEffect(() => {
    selectedChapterRef.current    = selectedChapter;
    selectedBookRef.current       = selectedBook;
    totalChaptersRef.current      = totalChapters;
    currentBookIndexRef.current   = currentBookIndex;
    allBooksRef.current           = allBooks;
  });

  // Get next chapter info for preview during drag
  const getNextChapter = () => {
    if (selectedChapter < totalChapters) {
      return { book: selectedBook, chapter: selectedChapter + 1 };
    } else if (currentBookIndex < allBooks.length - 1) {
      return { book: allBooks[currentBookIndex + 1], chapter: 1 };
    }
    return { book: selectedBook, chapter: selectedChapter };
  };

  // Get previous chapter info for preview during drag
  const getPrevChapter = () => {
    if (selectedChapter > 1) {
      return { book: selectedBook, chapter: selectedChapter - 1 };
    } else if (currentBookIndex > 0) {
      const prevBook = allBooks[currentBookIndex - 1];
      return { book: prevBook, chapter: bookChapters[prevBook] };
    }
    return { book: selectedBook, chapter: selectedChapter };
  };

  const nextChapterInfo = getNextChapter();
  const prevChapterInfo = getPrevChapter();

  // Navigate to specific verse from search
  const handleNavigateToVerse = (book: string, chapter: number, verse: number, version?: string) => {
    if (version && version !== selectedVersion) {
      setSelectedVersion(version);
    }
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse(verse);
    setShowSearch(false);

    // Scroll to the verse after a short delay to allow state to update
    setTimeout(() => {
      if (isUserInteractingRef.current) return;
      const verseElement = document.getElementById(`verse-${book}-${chapter}-${verse}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };

  // Compare mode handlers
  const handleToggleCompareVersion = (versionName: string) => {
    setCompareMode(prev => {
      const isSelected = prev.selectedVersions.includes(versionName);
      if (isSelected) {
        return {
          ...prev,
          selectedVersions: prev.selectedVersions.filter(v => v !== versionName)
        };
      } else {
        if (prev.selectedVersions.length < 4) {
          return {
            ...prev,
            selectedVersions: [...prev.selectedVersions, versionName]
          };
        }
        return prev;
      }
    });
  };

  const handleStartCompare = () => {
    setCompareMode(prev => ({
      ...prev,
      isActive: true
    }));
  };

  const handleExitCompare = () => {
    setCompareMode({
      isActive: false,
      selectedVersions: []
    });
  };

  const handleAddCompareVersion = (versionName: string) => {
    setCompareMode(prev => ({
      ...prev,
      selectedVersions: [...prev.selectedVersions, versionName]
    }));
  };

  const handleRemoveCompareVersion = (versionName: string) => {
    setCompareMode(prev => ({
      ...prev,
      selectedVersions: prev.selectedVersions.filter(v => v !== versionName)
    }));
  };

  // ─── Navigation handlers ────────────────────────────────────────────────────
  // CRITICAL: These callbacks read navigation targets from REFS (not closure
  // captures). This eliminates the stale-closure bug where rapid re-renders
  // during a swipe gesture caused selectedChapter to be captured at the wrong
  // value — resulting in the same chapter reloading instead of navigating.

  const handlePrevious = useCallback(() => {
    if (!navigatePrev()) return; // locked — ignore

    // Instant scroll reset (smooth conflicts with page transition animation)
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Read LIVE values from refs — never from the closure
    const ch = selectedChapterRef.current;
    const bi = currentBookIndexRef.current;
    const books = allBooksRef.current;

    // Defer chapter state update so exit animation begins on the OLD content
    setTimeout(() => {
      if (ch > 1) {
        setSelectedChapter(ch - 1);
      } else if (bi > 0) {
        const prevBook = books[bi - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(bookChapters[prevBook]);
      }
    }, 32);
  }, [navigatePrev]);

  const handleNext = useCallback(() => {
    if (!navigateNext()) return; // locked — ignore

    // Instant scroll reset
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    // Read LIVE values from refs — never from the closure
    const ch = selectedChapterRef.current;
    const bi = currentBookIndexRef.current;
    const total = totalChaptersRef.current;
    const books = allBooksRef.current;

    setTimeout(() => {
      if (ch < total) {
        setSelectedChapter(ch + 1);
      } else if (bi < books.length - 1) {
        const nextBook = books[bi + 1];
        setSelectedBook(nextBook);
        setSelectedChapter(1);
      }
    }, 32);
  }, [navigateNext]);

  // ─── New gesture system via useGestureNavigation hook ───────────────────
  // Uses native DOM listeners (not React synthetic events) so child elements
  // calling e.stopPropagation() do NOT block chapter navigation gestures.

  // Gesture is disabled by modals and audio slider drag only.
  // Verse selection (selectedVerses.length > 0) does NOT fully disable gestures —
  // instead shouldAbort() causes mid-gesture abort if selection becomes active.
  const gestureDisabled = isAnyPopupOpen || isSliderDragging;

  const onDragStart = useCallback(() => {
    // Mark swipe as active so ChapterContent cancels long-press timer immediately
    isSwipingRef.current = true;
  }, []);

  const onDragMove = useCallback((offset: number) => {
    // No-op: we run clean AnimatePresence transitions directly on drag end
  }, []);

  const onDragEnd = useCallback((offset: number, velocity: number, isHorizontal: boolean) => {
    // Clear swiping flag
    isSwipingRef.current = false;

    if (!isHorizontal) return;

    const DIST_THRESHOLD = 60;   // px
    const VEL_THRESHOLD  = 0.45; // px/ms

    const absOffset = Math.abs(offset);
    const absVelocity = Math.abs(velocity);
    const shouldCommit = absOffset > DIST_THRESHOLD || (absVelocity > VEL_THRESHOLD && absOffset > 18);

    if (shouldCommit) {
      if (offset < 0 && !isLastChapterOfBible) {
        handleNext();
      } else if (offset > 0 && !isFirstChapterOfBible) {
        handlePrevious();
      }
    }
  }, [isLastChapterOfBible, isFirstChapterOfBible, handleNext, handlePrevious]);

  const onDragCancel = useCallback(() => {
    // Clear swiping flag
    isSwipingRef.current = false;
  }, []);

  const { containerRef: gestureContainerRef, cancel: cancelGesture } = useGestureNavigation(
    { onDragStart, onDragMove, onDragEnd, onDragCancel },
    {
      disabled: gestureDisabled,
      // Mid-gesture abort: cancel if a modal opens OR verse selection is active
      shouldAbort: () => isAnyPopupOpen || isSliderDragging || selectedVerses.length > 0,
    }
  );


  // Cancel gesture if any popup opens while dragging
  useEffect(() => {
    if (gestureDisabled && isDragging) {
      cancelGesture();
    }
  }, [gestureDisabled, isDragging, cancelGesture]);


  // Trackpad swipe navigation (two-finger swipe on laptop trackpads)
  useEffect(() => {
    const swipeThreshold = 50;
    let lastSwipeTime = 0;
    const swipeDebounce = 850;

    const handleWheel = (e: WheelEvent) => {
      const horizontalDelta = Math.abs(e.deltaX);
      const verticalDelta = Math.abs(e.deltaY);

      if (horizontalDelta > verticalDelta && horizontalDelta > swipeThreshold) {
        const now = Date.now();
        if (now - lastSwipeTime < swipeDebounce) return;
        lastSwipeTime = now;

        if (e.deltaX > 0 && !isFirstChapterOfBible) handlePrevious();
        else if (e.deltaX < 0 && !isLastChapterOfBible) handleNext();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter, selectedBook, isFirstChapterOfBible, isLastChapterOfBible]);

  // Theme configurations
  const themeConfig = {
    light: {
      bg: '#fefefe',
      text: '#31393a',
      verseNumber: '#E23744'
    },
    sepia: {
      bg: '#f5e6d3',
      text: '#5c4a3a',
      verseNumber: '#D42C3A'
    },
    cream: {
      bg: '#fef3e2',
      text: '#4a3f2a',
      verseNumber: '#E23744'
    },
    dark: {
      bg: '#000000',
      text: '#e5e7e7',
      verseNumber: '#FF4757'
    }
  };

  const currentTheme = themeConfig[selectedTheme];

  // Reset selectedVerse when chapter or book changes - set to null so it doesn't auto-scroll
  useEffect(() => {
    // Clear selected verse so chapter opens at the top naturally
    setSelectedVerse(null);
  }, [selectedBook, selectedChapter]);

  // Handle verse navigation during narration.
  // NOTE: This effect is intentionally skipped during slider drag (isSeekingRef.current === true).
  // Seeking is handled atomically by handleSeekToVerse() which is called once on drag release.
  useEffect(() => {
    // Do nothing while the user is dragging the slider — handleSeekToVerse() owns that flow.
    if (isSeekingRef.current) return;

    if (narrationPlayingRef.current && selectedVerse && selectedVerse > 0) {
      console.log('[Verse Navigation] User changed verse to:', selectedVerse, 'during narration');
      // Stop current narration and restart from the selected verse
      window.speechSynthesis.cancel();

      // Slight delay to ensure cancellation is processed
      setTimeout(() => {
        const verses = getBibleContent();
        if (verses.length >= selectedVerse) {
          console.log('[Verse Navigation] Restarting narration from verse:', selectedVerse);
          narrationVerseIndexRef.current = selectedVerse - 1;
          readNextVerse(verses, selectedVerse - 1);
        }
      }, 100);
    }
  }, [selectedVerse]);

  // Scroll detection logic outsourced to BibleReaderPage2Container

  const getBibleContent = () => {
    return verses;
  };

  /**
   * handleSeekToVerse — production-grade seek handler.
   *
   * Called ONCE when the user releases the verse slider (mouseUp / touchEnd).
   * Performs a clean, atomic seek:
   *   1. Cancels any in-flight speech utterance
   *   2. Commits the new verse to state
   *   3. Scrolls to the verse exactly once (single smooth transition)
   *   4. Auto-resumes playback if audio was active before the drag started
   *   5. Clears all seeking/dragging guard refs
   */
  const handleSeekToVerse = (verse: number) => {
    console.log('[Seek] handleSeekToVerse called with verse:', verse, '| wasPlaying:', wasPlayingBeforeDragRef.current);

    // 1. Cancel any in-flight utterance (safe even if nothing is speaking)
    window.speechSynthesis.cancel();
    narrationPlayingRef.current = false;

    // 2. Commit the verse to React state.
    //    Both selectedVerse and currentReadingVerse must agree so resumeNarration picks up correctly.
    setSelectedVerse(verse);
    setCurrentReadingVerse(verse);
    narrationVerseIndexRef.current = verse - 1;

    // 3. Scroll to verse exactly once using requestAnimationFrame so the DOM has settled.
    requestAnimationFrame(() => {
      const el = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verse}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // 4. Clear all drag/seek guard refs first
    isSeekingRef.current = false;
    isDraggingRef.current = false;
    // Small delay before re-enabling progress interval to avoid a race on the first tick
    setTimeout(() => { isUserInteractingRef.current = false; }, 150);

    // 5. Auto-resume if audio was playing before drag
    if (wasPlayingBeforeDragRef.current) {
      console.log('[Seek] Auto-resuming playback from verse:', verse);
      const allVerses = getBibleContent();
      if (allVerses.length === 0) return;

      narrationVerseIndexRef.current = verse - 1;
      setNarrationPlaying(true);
      narrationPlayingRef.current = true;
      // setAudioPlaying is already true — no state change needed, avoids UI flicker.
      // Small delay gives speechSynthesis.cancel() time to fully settle.
      setTimeout(() => {
        readNextVerse(allVerses, verse - 1);
      }, 80);
    }

    // Reset drag-state tracking
    wasPlayingBeforeDragRef.current = false;
  };

  /**
   * handleVerseStep — used by V+ / V- buttons.
   * Unlike handleSeekToVerse (which is for slider drag-release), this does NOT
   * treat the action as a drag. It simply cancels the current utterance, commits
   * the new verse, and immediately resumes if audio was already playing.
   */
  const handleVerseStep = (verse: number) => {
    // 1. Cancel any in-flight utterance
    window.speechSynthesis.cancel();
    narrationPlayingRef.current = false;

    // 2. Commit verse to state
    setSelectedVerse(verse);
    setCurrentReadingVerse(verse);
    narrationVerseIndexRef.current = verse - 1;

    // 3. Scroll to new verse
    requestAnimationFrame(() => {
      const el = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verse}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // 4. Resume immediately if audio was playing (audioPlaying stays true throughout)
    if (audioPlaying) {
      const allVerses = getBibleContent();
      if (allVerses.length === 0) return;
      narrationVerseIndexRef.current = verse - 1;
      setNarrationPlaying(true);
      narrationPlayingRef.current = true;
      setTimeout(() => {
        readNextVerse(allVerses, verse - 1);
      }, 80);
    }
  };

  const handleTimerExpired = () => {
    console.log('[Timer] Sleep timer expired!');
    stopNarration();
    setSelectedTimer('stop');
  };

  const startNarration = (fromVerse: number = 1) => {
    console.log('startNarration called with fromVerse:', fromVerse);
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    // Stop any ongoing narration
    window.speechSynthesis.cancel();

    // Clear any existing timer
    if (narrationTimerRef.current) {
      clearTimeout(narrationTimerRef.current);
      narrationTimerRef.current = null;
    }
    narrationStartTimeRef.current = null;

    // Centralized absolute sleep timer setup
    if (selectedTimer !== 'stop' && selectedTimer !== 'end-chapter') {
      const minutes = getTimerMinutes(selectedTimer);
      // Initialize absolute end time if not already set or if already expired
      if (!sleepEndTimeRef.current || sleepEndTimeRef.current <= Date.now()) {
        sleepEndTimeRef.current = Date.now() + minutes * 60 * 1000;
        console.log(`[Timer] Initialized sleepEndTimeRef for ${minutes} mins (expires at: ${new Date(sleepEndTimeRef.current).toLocaleTimeString()})`);
      } else {
        console.log('[Timer] Preserving active sleep timer (expires at:', new Date(sleepEndTimeRef.current).toLocaleTimeString(), ')');
      }
    } else {
      sleepEndTimeRef.current = null;
    }

    const verses = getBibleContent();
    console.log('Got verses:', verses.length, 'verses');
    if (verses.length === 0) return;

    narrationVerseIndexRef.current = fromVerse - 1;
    setNarrationPlaying(true);
    narrationPlayingRef.current = true;
    console.log('Starting to read verse index:', fromVerse - 1);
    readNextVerse(verses, fromVerse - 1);
  };

  const readNextVerse = (verses: any[], index: number) => {
    console.log('readNextVerse called with index:', index, 'of', verses.length, 'verses');

    // At the beginning of each chapter, announce the book name and chapter number
    if (index === 0 && verses.length > 0) {
      const chapterAnnouncement = `${selectedBook} Chapter ${selectedChapter}`;
      console.log('Announcing chapter:', chapterAnnouncement);

      const announcementUtterance = new SpeechSynthesisUtterance(chapterAnnouncement);
      announcementUtterance.rate = playbackSpeed;
      announcementUtterance.pitch = 1;
      const constrainedVolume = Math.max(0, Math.min(1, ttsVolume));
      announcementUtterance.volume = constrainedVolume;
      console.log('[Volume] Setting announcement volume to:', constrainedVolume);

      // After announcement finishes, continue with first verse (skip announcement on next call)
      announcementUtterance.onend = () => {
        console.log('Chapter announcement finished, continuing with first verse');
        // Start reading from verse 1 by incrementing index in the recursive call
        continueReadingFromFirstVerse(verses);
      };

      // Handle errors during announcement
      announcementUtterance.onerror = (event: any) => {
        // Check if this is a real error or just a cancellation
        if (event.error === 'canceled' || event.error === 'interrupted') {
          console.log('Chapter announcement canceled/interrupted (expected)');
          return;
        }

        // Log actual errors with error type
        console.error('Chapter announcement error type:', event.error || 'unknown');
        console.error('Chapter announcement error details:', event);

        // Continue anyway - don't let announcement errors block verse reading
        continueReadingFromFirstVerse(verses);
      };

      const continueReadingFromFirstVerse = (verses: any[]) => {
        // Now read the actual first verse
        const verse = verses[0];
        const verseNumber = verse.number;
        const verseText = verse.text;

        setSelectedVerse(verseNumber);

        // Scroll to the verse being read — suppressed while slider is being dragged
        setTimeout(() => {
          if (isUserInteractingRef.current || isDraggingRef.current) return;
          const verseElement = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verseNumber}`);
          if (verseElement) {
            verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Create speech utterance for the verse
        const verseUtterance = new SpeechSynthesisUtterance(verseText);
        verseUtterance.rate = playbackSpeed;
        verseUtterance.pitch = 1;
        const constrainedVolume = Math.max(0, Math.min(1, ttsVolume));
        verseUtterance.volume = constrainedVolume;
        console.log('[Volume] Setting verse utterance volume to:', constrainedVolume);

        // Highlight verse IMMEDIATELY before starting speech
        setCurrentReadingVerse(verseNumber);
        console.log('Setting currentReadingVerse to:', verseNumber);

        verseUtterance.onstart = () => {
          console.log('Speech started for verse:', verseNumber);
        };

        verseUtterance.onend = () => {
          console.log('Finished verse:', verseNumber);
          // Continue with next verse
          readNextVerse(verses, 1);
        };

        verseUtterance.onerror = (event: any) => {
          console.log('[Error Handler] Verse:', verseNumber, 'Error Type:', event.error);

          if (event.error === 'canceled' || event.error === 'interrupted') {
            console.log('[Error Handler] Ignoring expected cancellation/interruption');
            return;
          }

          // For real errors, log and stop narration
          console.error('[Error Handler] Real error detected, stopping narration');
          console.error('[Error Handler] Full event:', event);
          setNarrationPlaying(false);
          narrationPlayingRef.current = false;
          setCurrentReadingVerse(null);
          setAudioPlaying(false);
        };

        utteranceRef.current = verseUtterance;
        window.speechSynthesis.speak(verseUtterance);
      };

      window.speechSynthesis.speak(announcementUtterance);
      return; // Exit early, will continue after announcement
    }

    if (index >= verses.length) {
      // Finished reading all verses in current chapter
      // Use repeatModeRef.current (not state) to read the live value — avoids stale closures.
      console.log('Finished chapter. Repeat mode:', repeatModeRef.current);

      // Handle repeat/loop modes
      if (repeatModeRef.current === 'verse') {
        // Verse repeat is handled in utterance.onend; reaching here means all verses exhausted.
        // Stop cleanly — user can re-play manually.
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        return;
      } else if (repeatModeRef.current === 'chapter') {
        // Repeat the chapter - go back to the beginning
        console.log('Chapter repeat: restarting from verse 1');
        narrationVerseIndexRef.current = 0;
        readNextVerse(verses, 0);
        return;
      }

      // For 'none' mode: Check timer setting to determine behavior
      if (selectedTimer === 'end-chapter') {
        // Stop at end of this chapter
        console.log('End-chapter timer: stopping at end of chapter');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        return;
      }

      // Check sleep timer expiration if active
      if (selectedTimer !== 'stop') {
        if (sleepEndTimeRef.current !== null) {
          const remainingMs = sleepEndTimeRef.current - Date.now();
          if (remainingMs <= 0) {
            console.log('[Timer] Sleep timer expired at chapter transition, stopping cleanly');
            handleTimerExpired();
            return;
          }
        }
      }

      // For 'stop' (default) or time-based timers (10-mins, 15-mins, 30-mins, 1-hr, 2-hrs), continue to next chapter
      const totalChapters = bookChapters[selectedBook] || 50;
      const currentBookIndex = allBooks.indexOf(selectedBook);

      let nextBook = selectedBook;
      let nextChapter = selectedChapter;

      if (selectedChapter < totalChapters) {
        // Move to next chapter in same book
        nextChapter = selectedChapter + 1;
      } else if (currentBookIndex < allBooks.length - 1) {
        // Move to first chapter of next book
        nextBook = allBooks[currentBookIndex + 1];
        nextChapter = 1;
      } else {
        // Reached the end of the Bible
        console.log('Reached the end of the Bible');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        return;
      }

      console.log('Auto-continuing to next chapter:', nextBook, nextChapter);

      // Set progress to 100% before moving to next chapter
      setAudioCurrentTime(audioDuration);

      console.log('[Auto-Advance] Starting auto-advance to next chapter');
      console.log('[Auto-Advance] Current states - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);
      console.log('[Auto-Advance] Current chapter:', selectedBook, selectedChapter, '-> Next chapter:', nextBook, nextChapter);

      // Set flag to indicate this is an auto-advance, not manual navigation
      isAutoAdvancingRef.current = true;

      // Fetch verses for the next chapter using the nextBook/nextChapter variables
      // (not getBibleContent() which uses state that hasn't updated yet)
      let bibleData = mockBibleContent;
      if (selectedVersion === 'TELBSI') {
        bibleData = teluguBible as any;
      } else if (selectedVersion === 'HINBSI') {
        bibleData = hindiBible as any;
      }
      const nextChapterVerses = bibleData[nextBook]?.[nextChapter]?.verses || [];

      console.log('Auto-advance: Fetched', nextChapterVerses.length, 'verses for', nextBook, nextChapter);

      if (nextChapterVerses.length === 0) {
        console.log('No verses found for next chapter, stopping');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        isAutoAdvancingRef.current = false;
        return;
      }

      console.log('[Auto-Advance] Updating state to next chapter:', nextBook, nextChapter);

      // Update the book and chapter state
      setSelectedBook(nextBook);
      setSelectedChapter(nextChapter);
      setSelectedVerse(1); // Reset to verse 1 for the new chapter

      // Small delay to allow state to update and new chapter to load
      setTimeout(() => {
        console.log('[Auto-Advance] Timeout fired - starting narration of new chapter');
        console.log('[Auto-Advance] State should now be:', nextBook, nextChapter);
        console.log('[Auto-Advance] States before readNextVerse - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);

        // Make sure narration is still supposed to be playing
        if (!narrationPlayingRef.current) {
          console.log('[Auto-Advance] Narration was stopped during chapter transition, aborting');
          isAutoAdvancingRef.current = false;
          return;
        }

        narrationVerseIndexRef.current = 0;
        console.log('[Auto-Advance] Calling readNextVerse with', nextChapterVerses.length, 'verses');
        readNextVerse(nextChapterVerses, 0);

        // Reset auto-advancing flag after narration starts successfully
        setTimeout(() => {
          console.log('[Auto-Advance] Resetting isAutoAdvancingRef flag');
          console.log('[Auto-Advance] Final states - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);
          isAutoAdvancingRef.current = false;
        }, 300);
      }, 150); // 150ms delay between chapters (mobile-safe)

      return;
    }

    const verse = verses[index];
    const verseNumber = verse.number;
    const verseText = verse.text;

    setSelectedVerse(verseNumber);

    // Scroll to the verse being read — suppressed while slider is being dragged
    setTimeout(() => {
      if (isUserInteractingRef.current || isDraggingRef.current) return;
      const verseElement = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verseNumber}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(verseText);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1;
    const constrainedVolume = Math.max(0, Math.min(1, ttsVolume));
    utterance.volume = constrainedVolume;
    console.log('[Volume] Setting reading utterance volume to:', constrainedVolume);

    // Highlight verse IMMEDIATELY before starting speech
    setCurrentReadingVerse(verseNumber);
    console.log('Setting currentReadingVerse to:', verseNumber);

    // Keep verse highlighted when speech starts
    utterance.onstart = () => {
      // Ensure highlight is set even if there was a delay
      setCurrentReadingVerse(verseNumber);
      console.log('Speech started for verse:', verseNumber);

      // Update progress based on verse completion
      const totalVerses = verses.length;
      const verseProgress = (index / totalVerses) * audioDuration;
      setAudioCurrentTime(verseProgress);
      console.log('Progress updated: verse', index + 1, 'of', totalVerses, '- time:', verseProgress, 'of', audioDuration);
    };

    // When verse finishes, read the next one (keep highlight until next verse starts).
    // IMPORTANT: Read repeatModeRef.current (NOT the repeatMode state) to avoid the stale-closure
    // bug where the onend callback captures the initial repeatMode value and ignores later changes.
    utterance.onend = () => {
      console.log('Speech ended for verse:', verseNumber, 'narrationPlayingRef:', narrationPlayingRef.current, 'repeatMode (live):', repeatModeRef.current);
      if (narrationPlayingRef.current) {
        if (repeatModeRef.current === 'verse') {
          // Repeat the SAME verse — re-call with the identical index so the verse pointer never moves.
          console.log('Verse repeat: replaying verse', verseNumber, 'at index', index);
          readNextVerse(verses, index);
        } else {
          // Advance to the next verse
          narrationVerseIndexRef.current = index + 1;
          readNextVerse(verses, index + 1);
        }
      }
      // Don't clear currentReadingVerse when paused — keep the highlight for resume
    };

    utterance.onerror = (event: any) => {
      // Check if this is a cancellation error (which is expected when pausing)
      const errorType = event.error || '';

      console.log('[Error Handler] Verse:', verseNumber, 'Error Type:', errorType);

      if (errorType === 'canceled' || errorType === 'interrupted') {
        console.log('[Error Handler] Ignoring expected cancellation/interruption');
        return; // Ignore cancellation errors - this is normal when pausing
      }

      // For real errors, log and stop narration
      console.error('[Error Handler] Real error detected, stopping narration');
      console.error('[Error Handler] Full event:', event);
      setNarrationPlaying(false);
      narrationPlayingRef.current = false;
      setCurrentReadingVerse(null);
      setAudioPlaying(false);
    };

    utteranceRef.current = utterance;
    console.log('Speaking verse:', verseNumber, 'Text:', verseText);
    window.speechSynthesis.speak(utterance);
  };

  const pauseNarration = () => {
    console.log('pauseNarration called. speaking:', window.speechSynthesis.speaking, 'paused:', window.speechSynthesis.paused);
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      // Set flag first to prevent onend from continuing
      setNarrationPlaying(false);
      narrationPlayingRef.current = false;
      // Then cancel (this may trigger onerror with 'canceled', which we now ignore)
      window.speechSynthesis.cancel();

      // Clear the timer but keep the start time for potential resume
      if (narrationTimerRef.current) {
        clearTimeout(narrationTimerRef.current);
        narrationTimerRef.current = null;
      }

      // Keep currentReadingVerse so we can resume from here
      console.log('Cancelled speech synthesis, keeping currentReadingVerse:', currentReadingVerse);
    }
  };

  const resumeNarration = () => {
    console.log('resumeNarration called. currentReadingVerse:', currentReadingVerse, 'selectedVerse:', selectedVerse);

    // If there was a sleep timer active, check if it has already expired
    if (selectedTimer !== 'stop' && selectedTimer !== 'end-chapter') {
      if (sleepEndTimeRef.current !== null) {
        const remaining = sleepEndTimeRef.current - Date.now();
        if (remaining <= 0) {
          console.log('[Timer] Sleep timer already expired on resume, not resuming');
          handleTimerExpired();
          return;
        }
        console.log(`[Timer] Resuming narration with active sleep timer (remaining: ${Math.round(remaining / 1000)}s)`);
      } else {
        // If it was null but a timer is selected, initialize it now
        const mins = getTimerMinutes(selectedTimer);
        sleepEndTimeRef.current = Date.now() + mins * 60 * 1000;
        console.log(`[Timer] Sleep timer initialized on resume for ${mins} mins`);
      }
    }

    // Resume from where we left off.
    // IMPORTANT: prefer selectedVerse first — this is the user's explicitly dragged-to position.
    // currentReadingVerse is the verse narration was ON before pause, which may differ after a seek.
    const resumeFrom = selectedVerse || currentReadingVerse || 1;
    console.log('Resuming from verse:', resumeFrom);

    // Don't call startNarration as it would reset the timer
    // Instead, manually start the narration
    const verses = getBibleContent();
    if (verses.length === 0) return;

    narrationVerseIndexRef.current = resumeFrom - 1;
    setNarrationPlaying(true);
    narrationPlayingRef.current = true;
    readNextVerse(verses, resumeFrom - 1);
  };

  const stopNarration = () => {
    window.speechSynthesis.cancel();

    // Clear any active timer
    if (narrationTimerRef.current) {
      clearTimeout(narrationTimerRef.current);
      narrationTimerRef.current = null;
    }
    narrationStartTimeRef.current = null;

    setNarrationPlaying(false);
    narrationPlayingRef.current = false;
    setCurrentReadingVerse(null);
    setAudioPlaying(false);
  };

  // Handle play/pause for narration
  const handleNarrationPlayPause = () => {
    console.log('handleNarrationPlayPause clicked. audioPlaying:', audioPlaying, 'selectedVerse:', selectedVerse, 'currentReadingVerse:', currentReadingVerse);
    if (audioPlaying) {
      console.log('Pausing narration');
      // ACTION first — cancel speech synthesis immediately
      pauseNarration();
      // THEN update UI state
      setAudioPlaying(false);
    } else {
      console.log('Resuming/starting narration');
      // ACTION first — start speech synthesis immediately (no dependency on state updates)
      resumeNarration();
      // THEN update UI state so progress ring and icons reflect playing
      setAudioPlaying(true);
    }
  };

  // Stop narration when chapter changes (but not during auto-advance)
  useEffect(() => {
    // Don't stop narration if this is an auto-advance to the next chapter
    if (!isAutoAdvancingRef.current) {
      console.log('[Stop Narration Effect] Stopping narration due to chapter change');
      stopNarration();
    } else {
      console.log('[Stop Narration Effect] Skipping stop - auto-advance in progress');
    }
  }, [selectedBook, selectedChapter]);

  // Update playback speed when it changes
  useEffect(() => {
    if (utteranceRef.current && window.speechSynthesis.speaking) {
      // Cancel speech directly — do NOT call stopNarration() as it resets audioPlaying=false
      // which causes the play/pause icon to flicker to Paused even though we're about to resume.
      window.speechSynthesis.cancel();
      narrationPlayingRef.current = false;

      if (audioPlaying) {
        setTimeout(() => {
          // Restart from the current verse with the new speed
          const allVerses = getBibleContent();
          if (allVerses.length === 0) return;
          const fromVerse = narrationVerseIndexRef.current;
          setNarrationPlaying(true);
          narrationPlayingRef.current = true;
          readNextVerse(allVerses, fromVerse);
        }, 100);
      }
    }
  }, [playbackSpeed]);

  // Handle sleep timer selection changes mid-playback
  useEffect(() => {
    if (selectedTimer !== 'stop' && selectedTimer !== 'end-chapter') {
      const minutes = getTimerMinutes(selectedTimer);
      // If audio is currently playing, set/reset the sleepEndTime based on the new selection
      if (audioPlaying) {
        sleepEndTimeRef.current = Date.now() + minutes * 60 * 1000;
        console.log(`[Timer] Mid-playback update: sleep timer set to ${minutes} mins (expires at ${new Date(sleepEndTimeRef.current).toLocaleTimeString()})`);
      }
    } else {
      // If timer is disabled or set to end-chapter, clear the absolute timer
      sleepEndTimeRef.current = null;
    }
  }, [selectedTimer, audioPlaying]);

  // Update audio progress while playing
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;

    // Run progress interval to provide smooth animation for the progress ring.
    // For narration, utterance.onstart also snaps the progress to exactly match the current verse,
    // which prevents the estimation from drifting too far from reality.
    if (audioPlaying) {
      progressInterval = setInterval(() => {
        // Centralized sleep timer expiration check
        if (selectedTimer !== 'stop' && selectedTimer !== 'end-chapter') {
          if (sleepEndTimeRef.current !== null) {
            const remainingMs = sleepEndTimeRef.current - Date.now();
            if (remainingMs <= 0) {
              console.log('[Timer] Centralized check: sleep timer expired! Stopping narration.');
              handleTimerExpired();
              return;
            }
          }
        }

        // Skip updating time if user is dragging (either slider or swipe) 
        // to prevent competing re-renders during high-frequency gestures.
        if (isDraggingRef.current || isUserInteractingRef.current) return;

        setAudioCurrentTime(prev => {
          const newTime = prev + (0.1 * playbackSpeed); // 100ms * playback speed
          // Cap at duration to prevent looping prematurely
          if (newTime >= audioDuration) {
            return audioDuration;
          }
          return newTime;
        });
      }, 100);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [audioPlaying, playbackSpeed, audioDuration, selectedTimer]);

  // Reset progress tracker when chapter changes
  useEffect(() => {
    console.log('[Chapter Change Effect] Book:', selectedBook, 'Chapter:', selectedChapter);
    console.log('[Chapter Change Effect] audioPlaying:', audioPlaying, 'narrationPlayingRef:', narrationPlayingRef.current, 'isAutoAdvancing:', isAutoAdvancingRef.current);

    // Calculate duration based on chapter content if already loaded
    const verses = getBibleContent();
    if (verses.length > 0) {
      setAudioDuration(verses.length * 10);
    }
    setAudioCurrentTime(0);

    // Only restart narration if this is manual navigation (not auto-advance)
    // Auto-advance handles its own narration continuation
    if (audioPlaying && narrationPlayingRef.current && !isAutoAdvancingRef.current) {
      console.log('[Chapter Change Effect] Manual navigation detected - restarting narration');
      // Stop current narration
      window.speechSynthesis.cancel();

      // Restart from verse 1
      setTimeout(() => {
        narrationVerseIndexRef.current = 0;
        setCurrentReadingVerse(null);
        startNarration(1);
      }, 300);
    } else if (isAutoAdvancingRef.current) {
      console.log('[Chapter Change Effect] Auto-advance detected - skipping restart, narration will continue');
    }
  }, [selectedBook, selectedChapter]);

  // Sync audioDuration when verses load asynchronously
  useEffect(() => {
    const currentVerses = getBibleContent();
    if (currentVerses.length > 0 && audioDuration === 0) {
      setAudioDuration(currentVerses.length * 10);
    }
  }, [verses, audioDuration]);

  return (
    <div className="min-h-screen flex flex-col pb-20 transition-colors duration-300" style={{ backgroundColor: currentTheme.bg, color: currentTheme.text, "--header-height": "60px" } as any}>
      {/* Main Header/Navbar - SCROLLS AWAY */}
      <AppHeader className="!static" />

      {/* Sub Navigation Bar - BECOMES STICKY */}
      <div 
        className="sticky top-0 left-0 right-0 z-40 border-b border-white/20 shadow-[var(--shadow-xs)] transition-colors duration-300"
        style={{ backgroundColor: currentTheme.bg, color: currentTheme.text }}
      >
        <div className="max-w-3xl mx-auto px-3 sm:px-8 py-1">
          <div className="flex items-center justify-between">
            {/* Book/Chapter/Version selectors */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowBookSelector(!showBookSelector);
                  setShowChapterSelector(false);
                  setShowVersionSelector(false);
                }}
                className="flex items-center space-x-1 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <span className="text-sm font-bold">{selectedBook}</span>
                <ChevronDown className="size-3" />
              </button>

              <button
                onClick={() => {
                  setShowChapterSelector(!showChapterSelector);
                  setShowBookSelector(false);
                  setShowVersionSelector(false);
                }}
                className="flex items-center space-x-1 hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <span className="text-sm font-bold">{selectedChapter}</span>
                <ChevronDown className="size-3" />
              </button>

              {compareMode.isActive ? (
                <span className="text-sm font-bold opacity-70">
                  Comparing
                </span>
              ) : (
                <button
                  onClick={() => {
                    setShowVersionSelector(!showVersionSelector);
                    setShowBookSelector(false);
                    setShowChapterSelector(false);
                  }}
                  className="flex items-center space-x-1 hover:text-[var(--color-accent-rose)] transition-colors"
                >
                  <span className="text-sm font-bold">{selectedVersion}</span>
                  <ChevronDown className="size-3" />
                </button>
              )}
            </div>

            {/* Right side tools */}
            <div className="flex items-center -space-x-1 ml-auto mr-3">
              <button
                onClick={() => {
                  if (compareMode.isActive) {
                    setShowCompareMenu(true);
                  } else {
                    setShowCompareSelector(true);
                  }
                }}
                className="p-2 rounded-full transition-all hover:bg-gray-100/50"
              >
                <MdCompareArrows
                  className={`size-5 transition-colors ${compareMode.isActive ? 'text-[#E23744]' : 'opacity-80'
                    }`}
                />
              </button>
              <button
                onClick={() => setShowMusicSelector(true)}
                className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
              >
                <Music className="size-5" />
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
              >
                <FiSearch className="size-5" />
              </button>
              <div ref={moreMenuRef} className="relative">
                <button
                  onClick={() => setShowMoreMenu(prev => !prev)}
                  className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
                  aria-haspopup="menu"
                  aria-expanded={showMoreMenu}
                >
                  <MoreVertical className="size-5" />
                </button>

                {showMoreMenu && (
                  <div
                    className="absolute right-0 top-full mt-2 z-[60] w-56 overflow-hidden rounded-xl shadow-lg backdrop-blur-xl backdrop-saturate-[180%]"
                    style={{
                      backgroundColor: selectedTheme === 'dark' ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.95)',
                      border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.4)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowSettingsMenu(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium transition-colors"
                        style={{ color: currentTheme.text }}
                      >
                        Fonts & Settings
                      </button>

                      <div className="flex items-center justify-between gap-4 px-4 py-3 transition-colors">
                        <span className="text-sm font-medium" style={{ color: currentTheme.text }}>Hide footnotes</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setHideFootnotes(!hideFootnotes);
                          }}
                          className={`relative h-6 w-11 rounded-full transition-colors ${hideFootnotes ? 'bg-[var(--color-primary-teal)]' : 'bg-gray-300'
                            }`}
                          aria-pressed={hideFootnotes}
                        >
                          <div
                            className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white transition-transform ${hideFootnotes ? 'translate-x-5' : 'translate-x-0'
                              }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector panels */}
      {showBookSelector && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowBookSelector(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-20 rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_4px_12px_0_rgba(0,0,0,0.2)]"
            style={{
              backgroundColor: selectedTheme === 'dark' ? '#1c1c1e' : '#ffffff',
              border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <h3 className="text-lg font-semibold" style={{ color: currentTheme.text }}>Books</h3>

              <div className="flex items-center gap-3">
                {/* Sort Toggle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: currentTheme.text }}>
                    {bookSortType === 'traditional' ? 'Traditional' : 'Alphabetical'}
                  </span>
                  <div
                    className="flex rounded-full p-0.5"
                    style={{ backgroundColor: selectedTheme === 'dark' ? '#3a3a3c' : 'rgba(209,213,219,0.8)' }}
                  >
                    <button
                      onClick={() => setBookSortType('traditional')}
                      className="p-1.5 rounded-full transition-all"
                      style={{ backgroundColor: bookSortType === 'traditional' ? (selectedTheme === 'dark' ? '#2c2c2e' : '#ffffff') : 'transparent' }}
                      aria-label="Traditional sort"
                    >
                      <RiSortDesc className="size-4" style={{ color: bookSortType === 'traditional' ? 'var(--color-accent-rose)' : currentTheme.text }} />
                    </button>
                    <button
                      onClick={() => setBookSortType('alphabetical')}
                      className="p-1.5 rounded-full transition-all"
                      style={{ backgroundColor: bookSortType === 'alphabetical' ? (selectedTheme === 'dark' ? '#2c2c2e' : '#ffffff') : 'transparent' }}
                      aria-label="Alphabetical sort"
                    >
                      <RiSortAlphabetAsc className="size-4" style={{ color: bookSortType === 'alphabetical' ? 'var(--color-accent-rose)' : currentTheme.text }} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowBookSelector(false)}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: currentTheme.text }}
                >
                  <X className="size-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ backgroundColor: selectedTheme === 'dark' ? '#1c1c1e' : undefined }}>
              <div className="grid grid-cols-2 gap-8">
                {/* Old Testament */}
                <div>
                  <h4 className="sticky top-0 mb-3 pt-2 pb-2 text-sm font-semibold z-10" style={{ backgroundColor: selectedTheme === 'dark' ? '#1c1c1e' : '#ffffff', color: currentTheme.text }}>Old Testament</h4>
                  <div className="space-y-2">
                    {(bookSortType === 'alphabetical'
                      ? [...books['Old Testament']].sort((a, b) => {
                        const nameA = typeof a === 'string' ? a : a.name;
                        const nameB = typeof b === 'string' ? b : b.name;
                        return nameA.localeCompare(nameB);
                      })
                      : books['Old Testament']
                    ).map(book => {
                      const bookName = typeof book === 'string' ? book : book.name;
                      const bookId = typeof book === 'string' ? book : book.id;
                      return (
                        <button
                          key={bookId}
                          onClick={() => {
                            setSelectedBook(bookId);
                            setShowBookSelector(false);
                            setSelectedChapter(1);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBook === bookName
                            ? 'text-[var(--color-accent-rose)] font-medium'
                            : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                            }`}
                        >
                          {bookName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* New Testament */}
                <div>
                  <h4 className="sticky top-0 mb-3 pt-2 pb-2 text-sm font-semibold z-10" style={{ backgroundColor: selectedTheme === 'dark' ? '#1c1c1e' : '#ffffff', color: currentTheme.text }}>New Testament</h4>
                  <div className="space-y-2">
                    {(bookSortType === 'alphabetical'
                      ? [...books['New Testament']].sort((a, b) => {
                        const nameA = typeof a === 'string' ? a : a.name;
                        const nameB = typeof b === 'string' ? b : b.name;
                        return nameA.localeCompare(nameB);
                      })
                      : books['New Testament']
                    ).map(book => {
                      const bookName = typeof book === 'string' ? book : book.name;
                      const bookId = typeof book === 'string' ? book : book.id;
                      return (
                        <button
                          key={bookId}
                          onClick={() => {
                            setSelectedBook(bookId);
                            setShowBookSelector(false);
                            setSelectedChapter(1);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${selectedBook === bookName
                            ? 'text-[var(--color-accent-rose)] font-medium'
                            : 'text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)]'
                            }`}
                        >
                          {bookName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChapterSelector && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowChapterSelector(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-20 rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_4px_12px_0_rgba(0,0,0,0.2)] backdrop-blur-3xl backdrop-saturate-[180%]"
            style={{
              backgroundColor: selectedTheme === 'dark' ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.85)',
              border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Done button */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${selectedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(49,57,58,0.1)'}` }}>
              <div className="w-16"></div>
              <h3 className="text-base font-normal" style={{ color: currentTheme.text }}>Select chapter</h3>
              <button
                onClick={() => setShowChapterSelector(false)}
                className="text-sm hover:text-[#E23744] transition-colors px-2"
                style={{ color: currentTheme.text }}
              >
                Done
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
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
            </div>
          </div>
        </div>
      )}

      {showVerseSelector && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowVerseSelector(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-20 rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_4px_12px_0_rgba(0,0,0,0.2)] backdrop-blur-3xl backdrop-saturate-[180%]"
            style={{
              backgroundColor: selectedTheme === 'dark' ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.85)',
              border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Back and Done buttons */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${selectedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(49,57,58,0.1)'}` }}>
              <button
                onClick={() => {
                  setShowVerseSelector(false);
                  setShowChapterSelector(true);
                }}
                className="flex items-center space-x-1 text-sm hover:text-[#E23744] transition-colors"
                style={{ color: currentTheme.text }}
              >
                <ChevronLeft className="size-4" />
                <span>Back</span>
              </button>
              <h3 className="text-base font-normal" style={{ color: currentTheme.text }}>Select verse</h3>
              <button
                onClick={() => {
                  setShowVerseSelector(false);
                  setShowChapterSelector(false);
                }}
                className="text-sm hover:text-[#E23744] transition-colors px-2"
                style={{ color: currentTheme.text }}
              >
                Done
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
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
            </div>
          </div>
        </div>
      )}

      {showVersionSelector && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowVersionSelector(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 top-20 rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_4px_12px_0_rgba(0,0,0,0.2)] backdrop-blur-3xl backdrop-saturate-[180%]"
            style={{
              backgroundColor: selectedTheme === 'dark' ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.85)',
              border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button
                onClick={() => setShowVersionSelector(false)}
                className="p-2 rounded-full transition-colors"
                style={{ color: currentTheme.text }}
              >
                <X className="size-6 opacity-60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <h4 className="font-bold text-[#E23744] mb-4 text-sm">Bible Versions</h4>
              <style>{`
                .version-btn-dark { background: #2c2c2e !important; color: #e5e7e7 !important; }
                .version-btn-dark:hover { background: #3a3a3c !important; }
              `}</style>
              <div className="space-y-3">
                {/* English Section */}
                <div className="space-y-2">
                  <p className="text-sm mb-2 opacity-60" style={{ color: currentTheme.text }}>English</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'English').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className="w-full text-left px-4 py-2.5 rounded transition-colors"
                      style={{
                        backgroundColor: selectedVersion === version.name
                          ? '#fde8ea'
                          : selectedTheme === 'dark' ? '#2c2c2e' : '#f1f3f3',
                        color: selectedVersion === version.name
                          ? '#E23744'
                          : currentTheme.text,
                      }}
                    >
                      <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                    </button>
                  ))}
                </div>

                {/* Telugu Section */}
                <div className="space-y-2">
                  <p className="text-sm mb-2 opacity-60" style={{ color: currentTheme.text }}>Telugu</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'Telugu').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className="w-full text-left px-4 py-2.5 rounded transition-colors"
                      style={{
                        backgroundColor: selectedVersion === version.name
                          ? '#fde8ea'
                          : selectedTheme === 'dark' ? '#2c2c2e' : '#f1f3f3',
                        color: selectedVersion === version.name ? '#E23744' : currentTheme.text,
                      }}
                    >
                      <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                    </button>
                  ))}
                </div>

                {/* Hindi Section */}
                <div className="space-y-2">
                  <p className="text-sm mb-2 opacity-60" style={{ color: currentTheme.text }}>Hindi</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'Hindi').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className="w-full text-left px-4 py-2.5 rounded transition-colors"
                      style={{
                        backgroundColor: selectedVersion === version.name
                          ? '#fde8ea'
                          : selectedTheme === 'dark' ? '#2c2c2e' : '#f1f3f3',
                        color: selectedVersion === version.name ? '#E23744' : currentTheme.text,
                      }}
                    >
                      <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMusicSelector && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowMusicSelector(false)}
        >
          <div
            className="absolute top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 backdrop-blur-3xl backdrop-saturate-[180%] rounded-lg sm:w-full sm:max-w-[400px] overflow-hidden flex flex-col shadow-[0_4px_12px_0_rgba(0,0,0,0.2)]"
            style={{
              backgroundColor: selectedTheme === 'dark' ? 'rgba(28,28,30,0.97)' : 'rgba(255,255,255,0.85)',
              border: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with loop/shuffle controls */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              {/* Empty left side for alignment */}
              <div className="w-10"></div>

              {/* Right side - Shuffle/Loop, Play, and Close buttons */}
              <div className="flex items-center space-x-2">
                {/* Loop/Shuffle/Repeat Toggle */}
                <button
                  onClick={() => {
                    const modes: Array<'shuffle' | 'repeat-all' | 'repeat-one'> = ['shuffle', 'repeat-all', 'repeat-one'];
                    const currentIndex = modes.indexOf(musicLoopMode);
                    setMusicLoopMode(modes[(currentIndex + 1) % modes.length]);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-full transition-colors"
                  style={{ color: currentTheme.text }}
                >
                  {musicLoopMode === 'shuffle' ? (
                    <><Shuffle className="size-5" /><span className="text-sm">Shuffle</span></>
                  ) : musicLoopMode === 'repeat-all' ? (
                    <><Repeat className="size-5" /><span className="text-sm">Repeat All</span></>
                  ) : (
                    <><Repeat1 className="size-5" /><span className="text-sm">Repeat One</span></>
                  )}
                </button>

                {/* Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedMusic && selectedMusic !== 'none') {
                      setAudioPlaying(!audioPlaying);
                    }
                  }}
                  disabled={!selectedMusic || selectedMusic === 'none'}
                  className={`p-2 rounded-full transition-colors ${
                    selectedMusic && selectedMusic !== 'none' ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  {audioPlaying ? (
                    <Pause className="size-5 text-[var(--color-primary-teal)] fill-current" />
                  ) : (
                    <Play className="size-5 text-[var(--color-primary-teal)] fill-current" />
                  )}
                </button>

                {/* Close button */}
                <button
                  onClick={() => setShowMusicSelector(false)}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: currentTheme.text }}
                >
                  <X className="size-6 opacity-60" />
                </button>
              </div>
            </div>

            {/* Content - Music list (max 5 tracks visible) */}
            <div className="overflow-y-auto px-4 pb-4 max-h-[360px]">
              <div className="space-y-3">
                {musicTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => setSelectedMusic(track.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${selectedMusic === track.id
                      ? 'bg-[#fde8ea]'
                      : 'bg-transparent hover:bg-gray-50'
                      }`}
                  >
                    {/* Left side - Thumbnail and name */}
                    <div className="flex items-center space-x-3">
                      {/* Thumbnail with play icon overlay for selected track */}
                      <div className="size-12 rounded-full overflow-hidden bg-black flex-shrink-0 relative">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt={track.name} className="size-full object-cover" />
                        ) : (
                          <div className="size-full bg-black" />
                        )}

                        {/* Play icon overlay for selected music */}
                        {selectedMusic === track.id && track.id !== 'none' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="size-5 text-white fill-current" />
                          </div>
                        )}
                      </div>

                      {/* Track name */}
                      <span
                        className="text-base"
                        style={{ color: selectedMusic === track.id ? '#E23744' : currentTheme.text, fontWeight: selectedMusic === track.id ? 500 : 400 }}
                      >
                        {track.name}
                      </span>
                    </div>

                    {/* Right side - Equalizer indicator */}
                    {selectedMusic === track.id && track.id !== 'none' ? (
                      <EqualizerIcon className="text-[#E23744] h-5" />
                    ) : (
                      <div className="w-5" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audio Control Panel */}
      <AudioControlPanel
        isOpen={showAudioControls && showAudioControlPanel}
        isDark={selectedTheme === 'dark'}
        onClose={() => {
          setShowAudioControlPanel(false);
          setAudioPlayerState('default');
        }}
        onMinimize={() => {
          setShowAudioControlPanel(false);
          setAudioPlayerState('minimized');
        }}
        selectedVerse={narrationPlayingRef.current ? (currentReadingVerse ?? 1) : (selectedVerse ?? 1)}
        totalVerses={getBibleContent().length}
        audioCurrentTime={audioCurrentTime}
        audioDuration={audioDuration}
        audioPlaying={audioPlaying}
        playbackSpeed={playbackSpeed}
        onVerseChange={handleSeekToVerse}
        onVerseStep={handleVerseStep}
        onSliderDragStart={() => {
          // Mark seeking — suppresses the selectedVerse useEffect cancel/restart loop
          isSeekingRef.current = true;
          // Suppress auto-scroll from readNextVerse
          isDraggingRef.current = true;
          // Suppress the progress interval from competing with UI
          isUserInteractingRef.current = true;
          // Remember playback state so we can auto-resume on release
          wasPlayingBeforeDragRef.current = audioPlaying;
          // If playing, silently cancel speech so there's no overlapping utterance
          // (we do NOT call setAudioPlaying(false) here — that would flicker the UI)
          if (audioPlaying) {
            window.speechSynthesis.cancel();
            narrationPlayingRef.current = false;
          }
          onSliderDragStart?.();
        }}
        onSliderDragEnd={() => {
          // Note: handleSeekToVerse() called by AudioControlPanel clears all seek refs.
          // This callback is a secondary safety net.
          onSliderDragEnd?.();
        }}
        onTimeChange={setAudioCurrentTime}
        onPlayPauseToggle={handleNarrationPlayPause}
        onSpeedChange={setPlaybackSpeed}
        onTimerClick={() => setShowTimerMenu(true)}
        ttsVolume={ttsVolume}
        onVolumeChange={setTtsVolume}
        repeatMode={repeatMode}
        onRepeatModeToggle={handleRepeatModeToggle}
        selectedChapter={selectedChapter}
        totalChapters={totalChapters}
        selectedBook={selectedBook}
        onChapterChange={(chapter: number) => {
          const dir = chapter > selectedChapter ? 'next' : 'prev';
          if (dir === 'next') navigateNext(); else navigatePrev();
          setSelectedChapter(chapter);
          window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        }}
        onBookChange={(direction: 'prev' | 'next') => {
          if (direction === 'next' && !isLastChapterOfBible) {
            handleNext();
          } else if (direction === 'prev' && !isFirstChapterOfBible) {
            handlePrevious();
          }
        }}
      />

      {/* Timer Menu */}
      {showTimerMenu && (
        <div
          className="fixed inset-0 z-[110]"
          style={{ backgroundColor: selectedTheme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowTimerMenu(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 backdrop-blur-3xl backdrop-saturate-[180%] rounded-t-[32px] shadow-[0px_8px_12px_6px_rgba(0,0,0,0.15),0px_4px_4px_0px_rgba(0,0,0,0.3)] max-w-[600px] mx-auto max-h-[70vh] overflow-hidden flex flex-col"
            style={{
              backgroundColor: selectedTheme === 'dark' ? '#000000' : 'rgba(255,255,255,0.85)',
              borderTop: selectedTheme === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${selectedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}
            >
              <button
                onClick={() => setShowTimerMenu(false)}
                className="flex items-center gap-1"
                style={{ color: currentTheme.text }}
              >
                <ChevronLeft className="size-5" />
                <span className="text-base">Back</span>
              </button>
              <h3 className="text-lg font-semibold" style={{ color: currentTheme.text }}>Timer</h3>
              <button
                onClick={() => setShowTimerMenu(false)}
                className="text-base text-[var(--color-primary-teal)] font-medium"
              >
                Done
              </button>
            </div>

            {/* Timer Options */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-0">
                {([
                  { key: 'stop',        label: 'Timer Off' },
                  { key: 'end-chapter', label: 'End of this chapter' },
                  { key: '10-mins',     label: '10 mins' },
                  { key: '15-mins',     label: '15 mins' },
                  { key: '30-mins',     label: '30 mins' },
                  { key: '1-hr',        label: '1 hr' },
                  { key: '2-hrs',       label: '2 hrs' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTimer(key)}
                    className="w-full flex items-center justify-between py-4"
                    style={{ borderBottom: `1px solid ${selectedTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}` }}
                  >
                    <span className="text-base" style={{ color: currentTheme.text }}>{label}</span>
                    <div
                      className="size-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: selectedTimer === key ? '#E23744' : 'transparent',
                        borderColor: selectedTimer === key ? '#E23744' : selectedTheme === 'dark' ? '#636366' : '#d1d5db',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Menu */}
      <FontsSettingsModal
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
        selectedFont={selectedFont}
        onFontChange={setSelectedFont}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        selectedTheme={selectedTheme}
        onThemeChange={setSelectedTheme}
        pageTransition={pageTransition as any}
        onPageTransitionChange={(t: any) => setPageTransition(t)}
      />

      {/* Main Reading Content */}
      <div
        ref={gestureContainerRef as React.RefObject<HTMLDivElement>}
        className="transition-colors duration-300 relative"
        style={{ backgroundColor: currentTheme.bg }}
      >
        <ChapterTransitionStage
          pageKey={chapterKey}
          direction={transitionDirection}
          mode={pageTransition}
          dragOffset={dragOffsetForRender}
          isDragging={isDragging && (pageTransition === 'slide' || pageTransition === 'scroll')}
          bgColor={currentTheme.bg}
          onNavigationComplete={releaseLock}
          prevPageContent={!isFirstChapterOfBible ? (
            <ChapterContent
              book={prevChapterInfo.book}
              chapter={prevChapterInfo.chapter}
              font={selectedFont}
              fontSize={fontSize}
              version={selectedVersion}
              theme={currentTheme}
              savedVerseIds={savedVerseIds}
              isSliderDragging={false}
            />
          ) : undefined}
          nextPageContent={!isLastChapterOfBible ? (
            <ChapterContent
              book={nextChapterInfo.book}
              chapter={nextChapterInfo.chapter}
              font={selectedFont}
              fontSize={fontSize}
              version={selectedVersion}
              theme={currentTheme}
              savedVerseIds={savedVerseIds}
              isSliderDragging={false}
            />
          ) : undefined}
        >
          {compareMode.isActive ? (
            <CompareView
              book={selectedBook}
              chapter={selectedChapter}
              selectedVersions={compareMode.selectedVersions}
              selectedTheme={selectedTheme}
              apiVersions={apiVersions}
              font={selectedFont}
              fontSize={fontSize}
            />
          ) : (
            <ChapterContent
              book={selectedBook}
              chapter={selectedChapter}
              font={selectedFont}
              fontSize={fontSize}
              version={selectedVersion}
              scrollToVerse={selectedVerse}
              readingVerse={currentReadingVerse}
              theme={currentTheme}
              selectedVerses={selectedVerses}
              savedVerseIds={savedVerseIds}
              onVerseLongPress={onVerseLongPress}
              onVerseTap={onVerseTap}
              highlights={userHighlights}
              notes={userNotes}
              isSliderDragging={isSliderDragging}
              swipeActiveRef={isSwipingRef}
            />
          )}
        </ChapterTransitionStage>
      </div>

      {/* Audio Controls Floating Button — hidden when any popup or selector is open */}
      {showAudioControls && !isBlockingPopupOpen && !showAudioControlPanel && !showSettingsMenu && (
        <AudioFloatingPlayer
          playerState={audioPlayerState}
          isReadingMode={isReadingMode}
          isPlaying={audioPlaying}
          progress={audioDuration > 0
            ? Math.min(1, Math.max(0, audioCurrentTime / audioDuration))
            : 0}
          onPlayPause={handleNarrationPlayPause}
          onNext={handleNext}
          onPrev={handlePrevious}
          title={`${selectedBook} ${selectedChapter}:${selectedVerse ?? 1}`}
          subtitle={selectedVersion}
          onOpenPanel={() => setShowAudioControlPanel(true)}
        />
      )}



      {/* Side Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-80 bg-white shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-[var(--color-primary-teal)] mb-6">Settings</h2>
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
      <BibleSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        selectedVersion={selectedVersion}
        onNavigateToVerse={handleNavigateToVerse}
        isDark={selectedTheme === 'dark'}
      />

      {/* Compare Versions Modal */}
      <CompareVersionsModal
        isOpen={showCompareSelector}
        onClose={() => setShowCompareSelector(false)}
        versions={apiVersions || fallbackVersions}
        selectedVersions={compareMode.selectedVersions}
        onToggleVersion={handleToggleCompareVersion}
        onStartCompare={handleStartCompare}
        isDark={selectedTheme === 'dark'}
      />

      {/* Compare Menu (when clicking compare icon in active mode) */}
      <CompareMenu
        isOpen={showCompareMenu}
        onClose={() => setShowCompareMenu(false)}
        versions={apiVersions || fallbackVersions}
        selectedVersions={compareMode.selectedVersions}
        onRemoveVersion={handleRemoveCompareVersion}
        onAddVersion={handleAddCompareVersion}
        onExitCompare={handleExitCompare}
        isDark={selectedTheme === 'dark'}
      />
      <AnimatePresence>
        {showVerseActionMenu && selectedVerses.length > 0 && (
          <VerseActionMenu
            isOpen={true}
            bookName={selectedBook}
            chapter={selectedChapter}
            selectedVerses={selectedVerses}
            onClose={() => onVerseTap?.(0)} // container handles clearing
            existingHighlightColor={userHighlights.find(h => h.metadata?.verse === selectedVerses[0])?.metadata?.color}
            existingSaveLabels={existingSaveLabels}
            existingSaveNote={existingSaveNote}
            existingSaveIsPrivate={existingSaveIsPrivate}
            savedVerseId={savedVerseId}
            userLabels={userLabels}
            onAddUserLabel={onAddUserLabel}
            onHighlight={(color) => onSaveHighlight?.(selectedVerses, color)}
            onSave={(labels, note, isPrivate) => onSaveVerses?.(labels, note, isPrivate)}
            onDelete={onDeleteSavedVerse}
            onNote={(note) => onSaveNote?.(selectedVerses, note)}
            onShare={() => onShareVerses?.()}
            onCompare={onCompareVerses}
            isLoggedIn={isLoggedIn}
            isDark={selectedTheme === 'dark'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
