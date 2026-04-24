import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Home, Compass, Play, Pause, Music, MoreVertical, X, ChevronLeft, ChevronRight, Check, Repeat, Repeat1, Shuffle, List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText, Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Gauge, Timer, Circle, Activity } from 'lucide-react';
import { RiSortDesc, RiSortAlphabetAsc, RiEqualizer3Fill } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { MdOutlineLibraryBooks } from 'react-icons/md';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
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
  onSaveVerses?: (labels: string[]) => void;
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
    onPlayAudio,
    onPauseAudio
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
  const [selectedVerse, setSelectedVerse] = useState<number | null>(1);
  const [showVerseSelector, setShowVerseSelector] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(45); // in seconds
  const [audioDuration, setAudioDuration] = useState(216); // 3:36 in seconds
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'chapter' | 'verse'>('none');

  const handleRepeatModeToggle = () => {
    const modes: Array<'none' | 'chapter' | 'verse'> = ['none', 'chapter', 'verse'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };
  const [selectedTimer, setSelectedTimer] = useState<'stop' | 'end-chapter' | '10-mins' | '15-mins' | '30-mins' | '1-hr' | '2-hrs'>('stop');
  const [showSearch, setShowSearch] = useState(false);

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
  const [pageTransition, setPageTransition] = useState<'slide' | 'curl' | 'fade' | 'scroll'>('slide'); // Changed to 'slide' as default

  // Page transition state
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev' | null>(null);
  const [chapterKey, setChapterKey] = useState(0);

  // Touch/swipe state for interactive slide
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const gestureDetected = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const contentRef = useRef<HTMLDivElement>(null);

  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Prevent scroll handler from interfering with clicks
  const isUserInteracting = useRef(false);

  const isAnyPopupOpen = showBookSelector || showChapterSelector ||
    showVersionSelector || showMusicSelector || showMoreMenu ||
    showSettingsMenu || showAudioControlPanel || showVerseSelector ||
    showTimerMenu || showSearch || showCompareSelector || showCompareMenu ||
    selectedVerses.length > 0;

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

  // Audio narration state
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [currentReadingVerse, setCurrentReadingVerse] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const narrationVerseIndexRef = useRef(0);
  const narrationPlayingRef = useRef(false);
  const isAutoAdvancingRef = useRef(false);

  // Timer state for time-based narration
  const narrationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const narrationStartTimeRef = useRef<number | null>(null);

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
      const verseElement = document.getElementById(`verse-${book}-${chapter}-${verse}`);
      if (verseElement) {
        const elementTop = verseElement.getBoundingClientRect().top;
        const currentScroll = window.scrollY;
        const targetScroll = currentScroll + elementTop - 180;

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
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

  const handlePrevious = () => {
    setTransitionDirection('prev');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    setTimeout(() => {
      if (selectedChapter > 1) {
        // Go to previous chapter in same book
        setSelectedChapter(selectedChapter - 1);
      } else if (currentBookIndex > 0) {
        // Go to last chapter of previous book
        const prevBook = allBooks[currentBookIndex - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(bookChapters[prevBook]);
      }
    }, 50);
  };

  const handleNext = () => {
    setTransitionDirection('next');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    setTimeout(() => {
      if (selectedChapter < totalChapters) {
        // Go to next chapter in same book
        setSelectedChapter(selectedChapter + 1);
      } else if (currentBookIndex < allBooks.length - 1) {
        // Go to first chapter of next book
        const nextBook = allBooks[currentBookIndex + 1];
        setSelectedBook(nextBook);
        setSelectedChapter(1);
      }
    }, 50);
  };

  // Interactive drag handlers for slide transition
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    gestureDetected.current = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect gesture direction only once
    if (gestureDetected.current === 'none' && (Math.abs(diffX) > 5 || Math.abs(diffY) > 5)) {
      if (Math.abs(diffY) > Math.abs(diffX)) {
        gestureDetected.current = 'vertical';
      } else {
        gestureDetected.current = 'horizontal';
      }
    }

    // If vertical scroll, do nothing - let native scrolling work
    if (gestureDetected.current === 'vertical') {
      return;
    }

    if (pageTransition !== 'slide') {
      // For non-slide transitions we only need horizontal gesture detection
      return;
    }

    // If horizontal and dragging is engaged, handle page navigation
    if (gestureDetected.current === 'horizontal') {
      if (!isDragging) {
        setIsDragging(true);
      }

      // Limit drag to prevent going forward from last chapter or backward from first
      if (diffX < 0 && isLastChapterOfBible) return;
      if (diffX > 0 && isFirstChapterOfBible) return;

      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (pageTransition !== 'slide') {
      // For non-slide transitions, use simple horizontal swipe detection
      const swipeThreshold = 75;
      const diffX = touchEndX.current - touchStartX.current;
      const diffY = touchEndY.current - touchStartY.current;
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);

      if (absDiffX > swipeThreshold && absDiffX > absDiffY) {
        if (diffX < 0 && !isLastChapterOfBible) {
          handleNext();
        } else if (diffX > 0 && !isFirstChapterOfBible) {
          handlePrevious();
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
  };

  // Get transition animation variants
  const getTransitionVariants = () => {
    const direction = transitionDirection === 'next' ? 1 : -1;

    switch (pageTransition) {
      case 'slide':
        return {
          initial: { x: `${100 * direction}%`, opacity: 1 },
          animate: { x: 0, opacity: 1 },
          exit: { x: `${-100 * direction}%`, opacity: 1 }
        };

      case 'curl':
        const origin = direction > 0 ? 'left center' : 'right center';
        return {
          initial: {
            rotateY: 90 * direction,
            opacity: 0
          },
          animate: {
            rotateY: 0,
            opacity: 1
          },
          exit: {
            rotateY: -90 * direction,
            opacity: 0
          },
          style: {
            transformOrigin: origin
          }
        };

      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        };

      case 'scroll':
      default:
        return {
          initial: { y: direction > 0 ? 50 : -50, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: direction > 0 ? -50 : 50, opacity: 0 }
        };
    }
  };

  const transitionConfig: Record<string, any> = {
    slide: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
    curl: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
    fade: { duration: 0.5, ease: 'easeInOut' },
    scroll: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
  };

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
      bg: '#2e3737',
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

  // Handle verse navigation during narration
  useEffect(() => {
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

  // Trackpad swipe navigation (two-finger swipe on laptop trackpads)
  useEffect(() => {
    let swipeThreshold = 50; // Minimum deltaX to trigger navigation
    let lastSwipeTime = 0;
    const swipeDebounce = 800; // Prevent rapid navigation (ms)

    const handleWheel = (e: WheelEvent) => {
      // Only handle horizontal wheel events (two-finger swipes on trackpad)
      // deltaX represents horizontal scrolling
      const horizontalDelta = Math.abs(e.deltaX);
      const verticalDelta = Math.abs(e.deltaY);

      // Check if this is primarily a horizontal swipe
      if (horizontalDelta > verticalDelta && horizontalDelta > swipeThreshold) {
        const now = Date.now();

        // Debounce to prevent multiple triggers
        if (now - lastSwipeTime < swipeDebounce) {
          return;
        }

        lastSwipeTime = now;

        // Swipe right (deltaX positive) = go back to previous chapter
        // Swipe left (deltaX negative) = go forward to next chapter
        if (e.deltaX > 0) {
          handlePrevious();
        } else if (e.deltaX < 0) {
          handleNext();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [selectedChapter, selectedBook]); // Re-bind when chapter/book changes

  const getBibleContent = () => {
    return verses;
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

    // Start timer if time-based option is selected
    narrationStartTimeRef.current = Date.now();
    if (selectedTimer === '10-mins') {
      narrationTimerRef.current = setTimeout(() => {
        stopNarration();
      }, 10 * 60 * 1000); // 10 minutes
    } else if (selectedTimer === '15-mins') {
      narrationTimerRef.current = setTimeout(() => {
        stopNarration();
      }, 15 * 60 * 1000); // 15 minutes
    } else if (selectedTimer === '30-mins') {
      narrationTimerRef.current = setTimeout(() => {
        stopNarration();
      }, 30 * 60 * 1000); // 30 minutes
    } else if (selectedTimer === '1-hr') {
      narrationTimerRef.current = setTimeout(() => {
        stopNarration();
      }, 60 * 60 * 1000); // 1 hour
    } else if (selectedTimer === '2-hrs') {
      narrationTimerRef.current = setTimeout(() => {
        stopNarration();
      }, 2 * 60 * 60 * 1000); // 2 hours
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

        // Scroll to the verse being read
        setTimeout(() => {
          const verseElement = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verseNumber}`);
          if (verseElement) {
            const elementTop = verseElement.getBoundingClientRect().top;
            const currentScroll = window.scrollY;
            const targetScroll = currentScroll + elementTop - 180;

            window.scrollTo({
              top: targetScroll,
              behavior: 'smooth'
            });
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
      console.log('Finished chapter. Repeat mode:', repeatMode);

      // Handle repeat/loop modes
      if (repeatMode === 'verse') {
        // Not applicable here as verse repeat is handled when playing a verse
        // Just continue to next chapter or stop
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        return;
      } else if (repeatMode === 'chapter') {
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

      // For 'stop' (default) or time-based timers (10-mins, 15-mins, 30-mins, 1-hr, 2-hrs), continue to next chapter
      // Time-based timers will be stopped by the setTimeout in startNarration
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
        }, 1000); // Increased to 1000ms to ensure chapter announcement completes
      }, 1000); // 1 second delay between chapters

      return;
    }

    const verse = verses[index];
    const verseNumber = verse.number;
    const verseText = verse.text;

    setSelectedVerse(verseNumber);

    // Scroll to the verse being read
    setTimeout(() => {
      const verseElement = document.getElementById(`verse-${selectedBook}-${selectedChapter}-${verseNumber}`);
      if (verseElement) {
        const elementTop = verseElement.getBoundingClientRect().top;
        const currentScroll = window.scrollY;
        const targetScroll = currentScroll + elementTop - 180;

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
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

    // When verse finishes, read the next one (keep highlight until next verse starts)
    utterance.onend = () => {
      console.log('Speech ended for verse:', verseNumber, 'narrationPlayingRef:', narrationPlayingRef.current, 'repeatMode:', repeatMode);
      if (narrationPlayingRef.current) {
        if (repeatMode === 'verse') {
          // Repeat the same verse
          console.log('Verse repeat: replaying verse', verseNumber);
          readNextVerse(verses, index);
        } else {
          // Move to next verse
          narrationVerseIndexRef.current = index + 1;
          // Immediately read next verse (its highlight will replace this one)
          readNextVerse(verses, index + 1);
        }
      }
      // Don't clear currentReadingVerse when paused - keep the highlight for resume
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

    // If there was a timer active, calculate remaining time and restart it
    if (narrationStartTimeRef.current && (selectedTimer === '10-mins' || selectedTimer === '15-mins' || selectedTimer === '30-mins' || selectedTimer === '1-hr' || selectedTimer === '2-hrs')) {
      const elapsed = Date.now() - narrationStartTimeRef.current;
      let totalDuration = 0;

      if (selectedTimer === '10-mins') totalDuration = 10 * 60 * 1000;
      else if (selectedTimer === '15-mins') totalDuration = 15 * 60 * 1000;
      else if (selectedTimer === '30-mins') totalDuration = 30 * 60 * 1000;
      else if (selectedTimer === '1-hr') totalDuration = 60 * 60 * 1000;
      else if (selectedTimer === '2-hrs') totalDuration = 2 * 60 * 60 * 1000;

      const remaining = totalDuration - elapsed;

      if (remaining > 0) {
        // Restart timer with remaining time
        narrationTimerRef.current = setTimeout(() => {
          stopNarration();
        }, remaining);
      } else {
        // Timer already expired, don't resume
        console.log('Timer already expired, not resuming');
        return;
      }
    }

    // Resume from where we left off (currentReadingVerse) or start fresh
    const resumeFrom = currentReadingVerse || selectedVerse || 1;
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
      pauseNarration();
      setAudioPlaying(false);
    } else {
      console.log('Resuming/starting narration');
      resumeNarration();
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
      // Cancel and restart with new speed
      const currentVerseIndex = narrationVerseIndexRef.current;
      stopNarration();
      if (audioPlaying) {
        setTimeout(() => {
          startNarration(selectedVerse ?? undefined);
        }, 100);
      }
    }
  }, [playbackSpeed]);

  // Update audio progress while playing (only for non-narration audio)
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;

    // Only use time-based progress when NOT using narration
    // Narration updates progress in the utterance.onstart callback based on verse completion
    if (audioPlaying && !narrationPlayingRef.current) {
      // Update progress every 100ms for smooth animation
      progressInterval = setInterval(() => {
        setAudioCurrentTime(prev => {
          const newTime = prev + (0.1 * playbackSpeed); // 100ms * playback speed
          // Loop back to start if we exceed duration
          if (newTime >= audioDuration) {
            return 0;
          }
          return newTime;
        });
      }, 100);
    } else if (!audioPlaying && !audioControlExpanded) {
      // Reset to beginning when stopped (not paused)
      setAudioCurrentTime(0);
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [audioPlaying, playbackSpeed, audioDuration, audioControlExpanded]);

  // Reset progress tracker when chapter changes
  useEffect(() => {
    console.log('[Chapter Change Effect] Book:', selectedBook, 'Chapter:', selectedChapter);
    console.log('[Chapter Change Effect] audioPlaying:', audioPlaying, 'narrationPlayingRef:', narrationPlayingRef.current, 'isAutoAdvancing:', isAutoAdvancingRef.current);

    // Calculate duration based on chapter content
    const verses = getBibleContent();
    const estimatedSecondsPerVerse = 10; // Average time to read a verse
    const newDuration = verses.length * estimatedSecondsPerVerse;

    setAudioDuration(newDuration);
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

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex flex-col pb-20" style={{ "--header-height": "60px" } as any}>
      {/* Main Header/Navbar - SCROLLS AWAY */}
      <AppHeader className="!static" />

      {/* Sub Navigation Bar - BECOMES STICKY */}
      <div className="sticky top-0 left-0 right-0 z-40 glass-light border-b border-white/20 shadow-[var(--shadow-xs)]">
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
                className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
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
                className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
              >
                <span className="text-sm font-bold">{selectedChapter}</span>
                <ChevronDown className="size-3" />
              </button>

              {compareMode.isActive ? (
                <span className="text-sm font-bold text-[var(--color-text-primary)] opacity-70">
                  Comparing
                </span>
              ) : (
                <button
                  onClick={() => {
                    setShowVersionSelector(!showVersionSelector);
                    setShowBookSelector(false);
                    setShowChapterSelector(false);
                  }}
                  className="flex items-center space-x-1 text-[var(--color-text-primary)] hover:text-[var(--color-accent-rose)] transition-colors"
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
                <MdOutlineLibraryBooks
                  className={`size-5 transition-colors ${compareMode.isActive ? 'text-[#E23744]' : 'text-[var(--color-gray-900)]'
                    }`}
                />
              </button>
              <button
                onClick={() => setShowMusicSelector(true)}
                className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
              >
                <Music className="size-5 text-[var(--color-gray-900)]" />
              </button>
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

      {/* Selector panels */}
      {showBookSelector && (
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowBookSelector(false)}>
          <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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

                <button onClick={() => setShowBookSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="size-6 text-[var(--color-text-primary)]/60" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="grid grid-cols-2 gap-8">
                {/* Old Testament */}
                <div>
                  <h4 className="sticky top-0 bg-white text-[var(--color-text-primary)] mb-3 pt-2 pb-2 text-sm font-semibold z-10">Old Testament</h4>
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
                  <h4 className="sticky top-0 bg-white text-[var(--color-text-primary)] mb-3 pt-2 pb-2 text-sm font-semibold z-10">New Testament</h4>
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
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowChapterSelector(false)}>
          <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header with Done button */}
            <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
              <div className="w-16"></div> {/* Spacer for centering */}
              <h3 className="text-base font-normal text-[#31393a]">Select chapter</h3>
              <button
                onClick={() => setShowChapterSelector(false)}
                className="text-sm text-[#31393a] hover:text-[#E23744] transition-colors px-2"
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
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowVerseSelector(false)}>
          <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header with Back and Done buttons */}
            <div className="flex items-center justify-between p-4 border-b border-[#31393a]/10">
              <button
                onClick={() => {
                  setShowVerseSelector(false);
                  setShowChapterSelector(true);
                }}
                className="flex items-center space-x-1 text-sm text-[#31393a] hover:text-[#E23744] transition-colors"
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
                className="text-sm text-[#31393a] hover:text-[#E23744] transition-colors px-2"
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
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowVersionSelector(false)}>
          <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button onClick={() => setShowVersionSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="size-6 text-[#31393a]/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <h4 className="font-bold text-[#E23744] mb-4 text-sm">Bible Versions</h4>
              <div className="space-y-3">
                {/* English Section */}
                <div className="space-y-2">
                  <p className="text-sm text-[#31393a]/60 mb-2">English</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'English').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded transition-colors ${selectedVersion === version.name
                        ? 'bg-[#fde8ea] text-[#E23744]'
                        : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                        }`}
                    >
                      <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                    </button>
                  ))}
                </div>

                {/* Telugu Section */}
                <div className="space-y-2">
                  <p className="text-sm text-[#31393a]/60 mb-2">Telugu</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'Telugu').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded transition-colors ${selectedVersion === version.name
                        ? 'bg-[#fde8ea] text-[#E23744]'
                        : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                        }`}
                    >
                      <div className="text-base font-medium">{version.fullName} ({version.name})</div>
                    </button>
                  ))}
                </div>

                {/* Hindi Section */}
                <div className="space-y-2">
                  <p className="text-sm text-[#31393a]/60 mb-2">Hindi</p>
                  {(apiVersions || fallbackVersions).filter(v => v.language === 'Hindi').map(version => (
                    <button
                      key={version.name}
                      onClick={() => {
                        setSelectedVersion(version.name);
                        setShowVersionSelector(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 rounded transition-colors ${selectedVersion === version.name
                        ? 'bg-[#fde8ea] text-[#E23744]'
                        : 'bg-[#f1f3f3] text-[#31393a] hover:bg-[#e5e7e7]'
                        }`}
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
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowMusicSelector(false)}>
          <div className="absolute top-20 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg sm:w-full sm:max-w-[400px] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                  className="flex items-center space-x-1.5 px-3 py-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  {musicLoopMode === 'shuffle' ? (
                    <>
                      <Shuffle className="size-5 text-[#31393a]" />
                      <span className="text-sm text-[#31393a]">Shuffle</span>
                    </>
                  ) : musicLoopMode === 'repeat-all' ? (
                    <>
                      <Repeat className="size-5 text-[#31393a]" />
                      <span className="text-sm text-[#31393a]">Repeat All</span>
                    </>
                  ) : (
                    <>
                      <Repeat1 className="size-5 text-[#31393a]" />
                      <span className="text-sm text-[#31393a]">Repeat One</span>
                    </>
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
                  className={`p-2 rounded-full transition-colors ${selectedMusic && selectedMusic !== 'none'
                    ? 'hover:bg-gray-100 cursor-pointer'
                    : 'opacity-40 cursor-not-allowed'
                    }`}
                >
                  {audioPlaying ? (
                    <Pause className="size-5 text-[var(--color-primary-teal)] fill-current" />
                  ) : (
                    <Play className="size-5 text-[var(--color-primary-teal)] fill-current" />
                  )}
                </button>

                {/* Close button */}
                <button onClick={() => setShowMusicSelector(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="size-6 text-[#31393a]/60" />
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
                      <span className={`text-base ${selectedMusic === track.id
                        ? 'text-[#E23744] font-medium'
                        : 'text-[#31393a]'
                        }`}>
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
        isOpen={showAudioControlPanel}
        onClose={() => setShowAudioControlPanel(false)}
        selectedVerse={narrationPlayingRef.current ? (currentReadingVerse ?? 1) : (selectedVerse ?? 1)}
        audioCurrentTime={narrationPlayingRef.current ? (currentReadingVerse ?? 1) : audioCurrentTime}
        audioDuration={narrationPlayingRef.current ? getBibleContent().length : audioDuration}
        audioPlaying={audioPlaying}
        playbackSpeed={playbackSpeed}
        onVerseChange={setSelectedVerse}
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
          setSelectedChapter(chapter);
          setTransitionDirection(chapter > selectedChapter ? 'next' : 'prev');
          setChapterKey(prev => prev + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="fixed inset-0 z-[110] bg-black/20" onClick={() => setShowTimerMenu(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border-t border-white/30 rounded-t-[32px] shadow-[0px_8px_12px_6px_rgba(0,0,0,0.15),0px_4px_4px_0px_rgba(0,0,0,0.3)] max-w-[600px] mx-auto max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <button
                onClick={() => setShowTimerMenu(false)}
                className="flex items-center gap-1 text-[#31393a]"
              >
                <ChevronLeft className="size-5" />
                <span className="text-base">Back</span>
              </button>
              <h3 className="text-lg font-semibold text-[#31393a]">Timer</h3>
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
                {/* Stop the timer */}
                <button
                  onClick={() => setSelectedTimer('stop')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">Timer Off</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === 'stop'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* End of this chapter */}
                <button
                  onClick={() => setSelectedTimer('end-chapter')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">End of this chapter</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === 'end-chapter'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* 10 mins */}
                <button
                  onClick={() => setSelectedTimer('10-mins')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">10 mins</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === '10-mins'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* 15 mins */}
                <button
                  onClick={() => setSelectedTimer('15-mins')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">15 mins</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === '15-mins'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* 30 mins */}
                <button
                  onClick={() => setSelectedTimer('30-mins')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">30 mins</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === '30-mins'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* 1 hr */}
                <button
                  onClick={() => setSelectedTimer('1-hr')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">1 hr</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === '1-hr'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>

                {/* 2 hrs */}
                <button
                  onClick={() => setSelectedTimer('2-hrs')}
                  className="w-full flex items-center justify-between py-4 border-b border-gray-200"
                >
                  <span className="text-base text-[#31393a]">2 hrs</span>
                  <div className={`size-6 rounded-full border-2 transition-all ${selectedTimer === '2-hrs'
                    ? 'bg-[#E23744] border-[#E23744]'
                    : 'border-gray-300'
                    }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* More Menu (Three Dots) - Simple menu with options */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute top-20 right-4 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[280px] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="py-2">
              {/* Fonts & Settings Option */}
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowSettingsMenu(true);
                }}
                className="w-full px-4 py-3 text-left text-base text-[#31393a] hover:bg-gray-100/50 transition-colors"
              >
                Fonts & Settings
              </button>

              {/* Hide Footnotes Toggle */}
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors">
                <span className="text-base text-[#31393a]">Hide footnotes</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setHideFootnotes(!hideFootnotes);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${hideFootnotes ? 'bg-[var(--color-primary-teal)]' : 'bg-gray-300'
                    }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${hideFootnotes ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
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
        className="transition-colors duration-300 relative overflow-hidden"
        style={{ backgroundColor: currentTheme.bg }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
                  version={selectedVersion}
                  scrollToVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBook ? selectedVerse : undefined}
                  readingVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBook ? currentReadingVerse : null}
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
                  version={selectedVersion}
                  scrollToVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBook ? selectedVerse : undefined}
                  readingVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBook ? currentReadingVerse : null}
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
              {compareMode.isActive ? (
                <CompareView
                  book={selectedBook}
                  chapter={selectedChapter}
                  selectedVersions={compareMode.selectedVersions}
                  selectedTheme={selectedTheme}
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
                />
              )}
            </div>
          </>
        ) : (
          /* Normal transition modes */
          <AnimatePresence mode="wait" initial={false}>
            {(() => {
              const variants = getTransitionVariants();
              const { style, ...animationVariants } = variants;
              return (
                <motion.div
                  key={chapterKey}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={animationVariants}
                  transition={transitionConfig[pageTransition]}
                  style={style}
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
                      onVerseLongPress={onVerseLongPress}
                      onVerseTap={onVerseTap}
                    />
                  )}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        )}
      </div>

      {/* Audio Controls Floating Button */}
      {showAudioControls && (
        <AudioFloatingPlayer
          isPlaying={audioPlaying}
          progress={audioDuration > 0 ? audioCurrentTime / audioDuration : 0}
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
      />

      {/* Compare Versions Modal */}
      <CompareVersionsModal
        isOpen={showCompareSelector}
        onClose={() => setShowCompareSelector(false)}
        versions={apiVersions || fallbackVersions}
        selectedVersions={compareMode.selectedVersions}
        onToggleVersion={handleToggleCompareVersion}
        onStartCompare={handleStartCompare}
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
      />
      <AnimatePresence>
        {selectedVerses.length > 0 && (
          <VerseActionMenu
            isOpen={true}
            bookName={selectedBook}
            chapter={selectedChapter}
            selectedVerses={selectedVerses}
            onClose={() => onVerseTap?.(0)} // container handles clearing
            onHighlight={(color) => onSaveHighlight?.(selectedVerses, color)}
            onSave={(labels) => onSaveVerses?.(labels)}
            onNote={(note) => onSaveNote?.(selectedVerses, note)}
            onCompare={() => onCompareVerses?.()}
            onShare={() => onShareVerses?.()}
          />
        )}
      </AnimatePresence>
    </div>
  );
}