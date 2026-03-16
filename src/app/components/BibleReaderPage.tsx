"use client";
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown, Home, Book, BookOpen, Compass, Play, Pause, Music, MoreVertical, X, ChevronLeft, ChevronRight, Check, Repeat, Repeat1, Shuffle, List, BarChart3, ArrowRightLeft, FileText, Zap, ScrollText, Volume2, SkipBack, SkipForward, RotateCcw, RotateCw, Download, Gauge, Timer, Circle, Activity } from 'lucide-react';
import { RiSortDesc, RiSortAlphabetAsc, RiEqualizer3Fill as EqualizerIcon, RiEqualizer3Fill } from 'react-icons/ri';
import { FiSearch } from 'react-icons/fi';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import AppHeader from './AppHeader';
import ChapterContent, { mockBibleContent } from './ChapterContent';
import ComparisonContent from './ComparisonContent';
// import AudioControlPanel from './AudioControlPanel';
// import BibleSearch from './BibleSearch';
import { teluguBible, hindiBible } from './BibleData';

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
  // determine whether we are on bible page; if not, render only nav bar
  const pathname = usePathname();
  const isBiblePage = pathname?.startsWith('/bible') || false;

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [displayBookName, setDisplayBookName] = useState('Genesis');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [displayVersionName, setDisplayVersionName] = useState('KJV');
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
  const [selectedTimer, setSelectedTimer] = useState<'stop' | 'end-chapter' | '10-mins' | '15-mins' | '30-mins' | '1-hr' | '2-hrs'>('stop');
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');
  const [selectedFont, setSelectedFont] = useState('Times New Roman');
  const [fontSize, setFontSize] = useState(18);
  const [pageTransition, setPageTransition] = useState<'slide' | 'curl' | 'fade' | 'scroll'>('slide');
  const [chapterKey, setChapterKey] = useState(0);
  const [transitionDirection, setTransitionDirection] = useState<'next' | 'prev'>('next');
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

  // Fetch verses for narration
  useEffect(() => {
    // Optimization: Don't hit Bible APIs if not on Bible page
    if (!isBiblePage) return;

    const fetchVerses = async () => {
      if (!selectedVersionId || !selectedBookId || !selectedChapter) return;
      
      

      console.log("Bible request:", { 
          book: selectedBookId, 
          chapter: selectedChapter, 
          version: selectedVersionId, 
          comparisonMode, 
          secondVersion: secondVersionId 
      });
      
      setIsLoadingContent(true);
      try {
        const response = await fetch(`/api/v1/bible/${selectedVersionId}/${selectedBookId}/${selectedChapter}`);
        const result = await response.json();
        if (result.success) {
          setCurrentChapterVerses(result.data.verses);
        }
      } catch (err) {
        console.error('Failed to fetch verses:', err);
      } finally {
        setIsLoadingContent(false);
      }
    };
    fetchVerses();
  }, [selectedBookId, selectedChapter, selectedVersionId, bibleVersions]);

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
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    setTransitionDirection('prev');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    setTimeout(() => {
      if (selectedChapter > 1) {
        // Go to previous chapter in same book
        setSelectedChapter(selectedChapter - 1);
      } else if (currentBookIndex > 0) {
        // Go to last chapter of previous book
        const prevBook = allBooks[currentBookIndex - 1];
        setSelectedBookId(prevBook.id);
        setDisplayBookName(prevBook.name);
        setSelectedChapter(bookChapters[prevBook.name] || 50);
      }
    }, 50);
  };

  const handleNext = () => {
    setTransitionDirection('next');
    setChapterKey(prev => prev + 1);

    // Scroll to top immediately
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    setTimeout(() => {
      if (selectedChapter < totalChapters) {
        // Go to next chapter in same book
        setSelectedChapter(selectedChapter + 1);
      } else if (currentBookIndex < allBooks.length - 1) {
        // Go to first chapter of next book
        const nextBook = allBooks[currentBookIndex + 1];
        setSelectedBookId(nextBook.id);
        setDisplayBookName(nextBook.name);
        setSelectedChapter(1);
      }
    }, 50);
  };

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
          initial: { x: `${100 * direction}%`, opacity: 1 },
          animate: { x: 0, opacity: 1 },
          exit: { x: `${-100 * direction}%`, opacity: 1 }
        };

      case 'curl':
        return {
          initial: {
            rotateY: direction > 0 ? 60 : -60,
            skewY: direction > 0 ? -5 : 5,
            x: direction > 0 ? '100%' : '-100%',
            z: -200,
            opacity: 0,
            scale: 0.9,
            transformOrigin: direction > 0 ? 'right center' : 'left center',
          },
          animate: {
            rotateY: 0,
            skewY: 0,
            x: 0,
            z: 0,
            opacity: 1,
            scale: 1,
            transition: {
              type: "spring" as const,
              stiffness: 70,
              damping: 18,
              mass: 1.1
            }
          },
          exit: {
            rotateY: direction > 0 ? -140 : 140,
            skewY: direction > 0 ? 10 : -10,
            x: direction > 0 ? '-100%' : '100%',
            z: 0,
            opacity: 0,
            scale: 0.95,
            filter: "brightness(0.6)",
            transformOrigin: direction > 0 ? 'left center' : 'right center',
            transition: {
              duration: 0.9,
              ease: [0.645, 0.045, 0.355, 1] as const
            }
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

  const transitionConfig = {
    slide: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    curl: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
    fade: { duration: 0.2, ease: 'easeInOut' },
    scroll: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
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

  // Scroll detection logic
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;

      const currentScrollY = scrollContainerRef.current.scrollTop;
      const scrollHeight = scrollContainerRef.current.scrollHeight;
      const clientHeight = scrollContainerRef.current.clientHeight;
      const scrolledToBottom = scrollHeight - currentScrollY - clientHeight < 100;

      setIsAtBottom(scrolledToBottom);

      // If at bottom, show both nav and audio controls
      if (scrolledToBottom) {
        setShowBottomNav(true);
        setShowAudioControls(true);
        return;
      }

      const isScrollingDown = currentScrollY > lastScrollY.current;
      const isScrollingUp = currentScrollY < lastScrollY.current;

      if (currentScrollY > 100) {
        if (isScrollingDown) {
          setShowBottomNav(false);
          setShowAudioControls(false);
        } else if (isScrollingUp) {
          setShowBottomNav(true);
          setShowAudioControls(true);
        }
      } else {
        setShowBottomNav(true);
        setShowAudioControls(true);
      }

      lastScrollY.current = currentScrollY;

      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      if (currentScrollY > 100 && !scrolledToBottom) {
        scrollTimeout.current = setTimeout(() => {
          setShowBottomNav(false);
          setShowAudioControls(false);
        }, 3000);
      }
    };

    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Dispatch reading mode event to client layout
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('bible-reading-mode', { detail: { isReadingMode: !showBottomNav } })
    );
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
      const chapterAnnouncement = `${displayBookName} Chapter ${selectedChapter}`;
      console.log('Announcing chapter:', chapterAnnouncement);

      const announcementUtterance = new SpeechSynthesisUtterance(chapterAnnouncement);
      announcementUtterance.rate = playbackSpeed;
      announcementUtterance.pitch = 1;
      announcementUtterance.volume = 1;

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
          const verseElement = document.getElementById(`verse-${selectedBookId}-${selectedChapter}-${verseNumber}`);
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
        }, 100);

        // Create speech utterance for the verse
        const verseUtterance = new SpeechSynthesisUtterance(verseText);
        verseUtterance.rate = playbackSpeed;
        verseUtterance.pitch = 1;
        verseUtterance.volume = 1;

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
      console.log('Finished chapter. Timer setting:', selectedTimer);

      // Check timer setting to determine behavior
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
      const totalChapters = bookChapters[displayBookName] || 50;
      const currentBookIndex = allBooks.findIndex((b) => b.id === selectedBookId);

      let nextBookObj = allBooks[currentBookIndex] || { id: selectedBookId, name: displayBookName };
      let nextChapter = selectedChapter;

      if (selectedChapter < totalChapters) {
        // Move to next chapter in same book
        nextChapter = selectedChapter + 1;
      } else if (currentBookIndex < allBooks.length - 1) {
        // Move to first chapter of next book
        nextBookObj = allBooks[currentBookIndex + 1];
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

      console.log('Auto-continuing to next chapter:', nextBookObj.name, nextChapter);

      // Set progress to 100% before moving to next chapter
      setAudioCurrentTime(audioDuration);

      console.log('[Auto-Advance] Starting auto-advance to next chapter');
      console.log('[Auto-Advance] Current states - audioPlaying:', audioPlaying, 'narrationPlaying:', narrationPlayingRef.current);
      console.log('[Auto-Advance] Current chapter:', selectedBookId, selectedChapter, '-> Next chapter:', nextBookObj.name, nextChapter);

      // Set flag to indicate this is an auto-advance, not manual navigation
      isAutoAdvancingRef.current = true;

      // Fetch verses for the next chapter using the nextBookObj/nextChapter variables
      // (not getBibleContent() which uses state that hasn't updated yet)
      let bibleData = mockBibleContent;
      if (selectedVersionId === 'TEL' || selectedVersionId === 'TELBSI') {
        bibleData = teluguBible;
      } else if (selectedVersionId === 'HIN' || selectedVersionId === 'HINBSI') {
        bibleData = hindiBible;
      }
      const nextChapterVerses = bibleData[nextBookObj.name]?.[nextChapter]?.verses || [];

      console.log('Auto-advance: Fetched', nextChapterVerses.length, 'verses for', nextBookObj.name, nextChapter);

      if (nextChapterVerses.length === 0) {
        console.log('No verses found for next chapter, stopping');
        setNarrationPlaying(false);
        narrationPlayingRef.current = false;
        setCurrentReadingVerse(null);
        setAudioPlaying(false);
        isAutoAdvancingRef.current = false;
        return;
      }

      console.log('[Auto-Advance] Updating state to next chapter:', nextBookObj.name, nextChapter);

      // Update the book and chapter state
      setSelectedBookId(nextBookObj.id);
      setDisplayBookName(nextBookObj.name);
      setSelectedChapter(nextChapter);
      setSelectedVerse(1); // Reset to verse 1 for the new chapter

      // Small delay to allow state to update and new chapter to load
      setTimeout(() => {
        console.log('[Auto-Advance] Timeout fired - starting narration of new chapter');
        console.log('[Auto-Advance] State should now be:', nextBookObj.name, nextChapter);
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
      const verseElement = document.getElementById(`verse-${selectedBookId}-${selectedChapter}-${verseNumber}`);
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
    }, 100);

    // Create speech utterance
    const utterance = new SpeechSynthesisUtterance(verseText);
    utterance.rate = playbackSpeed;
    utterance.pitch = 1;
    utterance.volume = 1;

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
      console.log('Speech ended for verse:', verseNumber, 'narrationPlayingRef:', narrationPlayingRef.current);
      if (narrationPlayingRef.current) {
        narrationVerseIndexRef.current = index + 1;
        // Immediately read next verse (its highlight will replace this one)
        readNextVerse(verses, index + 1);
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
  }, [selectedBookId, selectedChapter]);

  // Update playback speed when it changes
  useEffect(() => {
    if (utteranceRef.current && window.speechSynthesis.speaking) {
      // Cancel and restart with new speed
      const currentVerseIndex = narrationVerseIndexRef.current;
      stopNarration();
      if (audioPlaying) {
        setTimeout(() => {
          startNarration(selectedVerse ?? 1);
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
    console.log('[Chapter Change Effect] Book:', displayBookName, 'Chapter:', selectedChapter);
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
  }, [selectedBookId, selectedChapter]);


  return (
    <div className="fixed inset-0 bg-[var(--app-bg)] flex flex-col z-[100]">
      {/* Scrollable Content Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Header Section Grouped for Reading Mode */}
        <div 
          className={`sticky top-0 left-0 right-0 z-50 flex flex-col transition-all duration-300 ease-in-out ${
            !showBottomNav ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Main Header/Navbar - SCROLLS AWAY */}
          <AppHeader onMenuOpen={() => setMenuOpen(true)} className="!static" />

          {/* Sub Navigation Bar - BECOMES STICKY */}
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
                  <span className="text-sm font-normal">{displayBookName}</span>
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
                  <span className="text-sm font-normal">{displayVersionName}</span>
                  <ChevronDown className="size-3" />
                </button>
              </div>

              {/* Right side tools - Audio, Music and Settings */}
              <div className="flex items-center -space-x-1 ml-auto mr-3">
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
        </div>

        {/* Selector panels */}
        {showBookSelector && (
          <div className="fixed inset-0 z-[100] bg-black/20" onClick={() => setShowBookSelector(false)}>
            <div className="absolute left-1/2 -translate-x-1/2 top-20 bg-white/85 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] rounded-lg w-full max-w-[360px] max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
                {isLoadingBooks ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-primary-teal)]"></div>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Loading books...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-8">
                    {/* Old Testament */}
                    <div>
                      <h4 className="sticky top-0 backdrop-blur-3xl backdrop-saturate-[180%] text-[var(--color-text-primary)] mb-3 pb-2 text-sm font-semibold z-10">Old Testament</h4>
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
                      <h4 className="sticky top-0 backdrop-blur-3xl backdrop-saturate-[180%] text-[var(--color-text-primary)] mb-3 pb-2 text-sm font-semibold z-10">New Testament</h4>
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
                  className="text-sm text-[#31393a] hover:text-[#d23952] transition-colors px-2"
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
                <h4 className="font-bold text-[#d23952] mb-4 text-sm">Bible Versions</h4>
                
                {isLoadingVersions ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--color-primary-teal)]"></div>
                    <p className="text-sm font-medium text-gray-500 animate-pulse">Loading versions...</p>
                  </div>
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
                      <Pause className="size-5 text-[#31393a] fill-current" />
                    ) : (
                      <Play className="size-5 text-[#31393a] fill-current" />
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
                        ? 'bg-[#fbebee]'
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
                          ? 'text-[#d23952] font-medium'
                          : 'text-[#31393a]'
                          }`}>
                          {track.name}
                        </span>
                      </div>

                      {/* Right side - Equalizer indicator */}
                      {selectedMusic === track.id && track.id !== 'none' ? (
                        <EqualizerIcon className="text-[#d23952] h-5" />
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
        {/* <AudioControlPanel
          isOpen={showAudioControlPanel}
          onClose={() => setShowAudioControlPanel(false)}
          selectedVerse={selectedVerse}
          audioCurrentTime={audioCurrentTime}
          audioDuration={audioDuration}
          audioPlaying={audioPlaying}
          playbackSpeed={playbackSpeed}
          onVerseChange={setSelectedVerse}
          onTimeChange={setAudioCurrentTime}
          onPlayPauseToggle={handleNarrationPlayPause}
          onSpeedChange={setPlaybackSpeed}
          onTimerClick={() => setShowTimerMenu(true)}
        /> */}

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
                  className="text-base text-[#006a6f] font-medium"
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                      ? 'bg-[#d23952] border-[#d23952]'
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
                  className="w-full px-4 py-3 text-left text-base text-[#31393a] hover:bg-gray-100/50 transition-colors flex items-center justify-between"
                >
                  <span>Fonts & Settings</span>
                  <ChevronRight className="size-4 text-[#31393a]/40" />
                </button>

                {/* Comparison Mode Toggle */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors">
                  <span className="text-base text-[#31393a]">Comparison Mode</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setComparisonMode(!comparisonMode);
                      if (!comparisonMode && !secondVersionId) {
                        // Set a default second version if not set
                        const defaultV2 = bibleVersions.find(v => v.id !== selectedVersionId) || bibleVersions[0];
                        if (defaultV2) {
                            setSecondVersionId(defaultV2.id);
                            setDisplaySecondVersionName(defaultV2.name);
                        }
                      }
                      setShowMoreMenu(false);
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${comparisonMode ? 'bg-[#006a6f]' : 'bg-gray-300'
                      }`}
                  >
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${comparisonMode ? 'translate-x-5' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {/* Hide Footnotes Toggle */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-100/50 transition-colors">
                  <span className="text-base text-[#31393a]">Hide footnotes</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHideFootnotes(!hideFootnotes);
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${hideFootnotes ? 'bg-[#006a6f]' : 'bg-gray-300'
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
        {showSettingsMenu && (
          <div className="fixed inset-0 z-[100] bg-white/5 shadow-2xl backdrop-blur-sm" onClick={() => setShowSettingsMenu(false)}>
            <div className="absolute top-24 left-1/2 -translate-x-1/2 apple-nav-floating w-[90%] max-w-[380px] max-h-[80vh] overflow-hidden flex flex-col transition-all duration-500 animate-in fade-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
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
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
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
            </div>
          </div>
        )}

        {/* Main Reading Content */}
        <div
          className="transition-colors duration-300 relative overflow-hidden"
          style={{ 
            backgroundColor: currentTheme.bg,
            perspective: pageTransition === 'curl' ? '2000px' : 'none',
            transformStyle: 'preserve-3d'
          }}
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
              displayVersionName1={displayVersionName}
              displayVersionName2={displaySecondVersionName}
            />
          ) : pageTransition === 'slide' && isDragging ? (
            /* Interactive slide mode ... */
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
                    version={selectedVersionId || undefined}
                    scrollToVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? selectedVerse : undefined}
                    readingVerse={nextChapterInfo.chapter === selectedChapter && nextChapterInfo.book === selectedBookId ? currentReadingVerse : null}
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
                    version={selectedVersionId || undefined}
                    scrollToVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? selectedVerse : undefined}
                    readingVerse={prevChapterInfo.chapter === selectedChapter && prevChapterInfo.book === selectedBookId ? currentReadingVerse : null}
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
                <ChapterContent
                  book={selectedBookId || ''}
                  chapter={selectedChapter}
                  font={selectedFont}
                  fontSize={fontSize}
                  version={selectedVersionId || undefined}
                  scrollToVerse={selectedVerse}
                  readingVerse={currentReadingVerse}
                  theme={currentTheme}
                />
              </div>
            </>
          ) : (
            /* Normal transition modes */
            <AnimatePresence mode={pageTransition === 'curl' ? 'popLayout' : 'wait'} initial={false}>
              <motion.div
                key={chapterKey}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={getTransitionVariants()}
                transition={transitionConfig[pageTransition]}
              >
                <ChapterContent
                  book={selectedBookId || ''}
                  chapter={selectedChapter}
                  font={selectedFont}
                  fontSize={fontSize}
                  version={selectedVersionId || undefined}
                  scrollToVerse={selectedVerse}
                  readingVerse={currentReadingVerse}
                  theme={currentTheme}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Audio Controls - MOVES UP/DOWN WITH SCROLL */}
      <div
        className={`fixed left-0 right-0 z-30 pointer-events-none transition-all duration-700 ease-in-out ${showAudioControls ? 'bottom-[90px]' : 'bottom-4'
          }`}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8">
          <div className="flex items-center justify-between pointer-events-auto">
            {/* Previous Button - Left side - Only show if not at first chapter */}
            {!isFirstChapterOfBible && (
              <button
                onClick={handlePrevious}
                className="ml-[7px] bg-white/50 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 p-2.5 rounded-full shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] hover:bg-white/70 transition-all"
              >
                <ChevronLeft className="size-4 text-[#006065]" />
              </button>
            )}

            {/* Spacer for alignment when left button is hidden */}
            {isFirstChapterOfBible && <div className="w-[44px]" />}

            {/* Play/Pause Button - Center - Expandable */}
            <AnimatePresence mode="wait">
              {audioControlExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{
                    width: 56,
                    opacity: 0,
                    scale: 0.95
                  }}
                  animate={{
                    width: 'auto',
                    opacity: 1,
                    scale: 1
                  }}
                  exit={{
                    width: 56,
                    opacity: 0,
                    scale: 0.95
                  }}
                  transition={{
                    width: {
                      duration: 0.4,
                      ease: [0.32, 0.72, 0, 1] as const // iOS-style easing
                    },
                    opacity: {
                      duration: 0.3,
                      ease: 'easeInOut'
                    },
                    scale: {
                      duration: 0.3,
                      ease: [0.32, 0.72, 0, 1] as const
                    }
                  }}
                  className="bg-white/70 backdrop-blur-xl backdrop-saturate-[180%] border border-white/40 rounded-full shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] px-1.5 py-0.5 flex items-center gap-2"
                >
                  {/* Equalizer Icon - Left */}
                  <motion.button
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{
                      duration: 0.25,
                      delay: 0.1,
                      ease: [0.32, 0.72, 0, 1] as const
                    }}
                    onClick={() => setShowAudioControlPanel(true)}
                    className="p-0.5 rounded-full hover:bg-white/40 transition-colors flex-shrink-0"
                  >
                    <RiEqualizer3Fill className="size-4 text-[#006a6f]" />
                  </motion.button>

                  {/* Play/Pause Button with Progress Circle - Center */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.25,
                      delay: 0.15,
                      ease: [0.32, 0.72, 0, 1] as const
                    }}
                    onClick={handleNarrationPlayPause}
                    className="relative flex-shrink-0 w-[40px] h-[40px]"
                  >
                    {/* Progress Circle */}
                    <svg className="absolute inset-0 w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="2"
                        opacity="0.3"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        fill="none"
                        stroke="#006a6f"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - audioCurrentTime / audioDuration)}`}
                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                      />
                    </svg>
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#a8d5d7] rounded-full w-[32px] h-[32px] flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {audioPlaying ? (
                          <motion.div
                            key="pause"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Pause className="size-4 text-[#006a6f] fill-[#006a6f]" strokeWidth={0} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="play"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Play className="size-4 text-[#006a6f] fill-[#006a6f] translate-x-[0.5px]" strokeWidth={0} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>

                  {/* Close Button - Right */}
                  <motion.button
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{
                      duration: 0.25,
                      delay: 0.2,
                      ease: [0.32, 0.72, 0, 1] as const
                    }}
                    onClick={() => {
                      console.log('[Close Button] Closing audio control and resetting narration to verse 1');
                      setAudioControlExpanded(false);
                      setAudioPlaying(false);
                      stopNarration();
                      // Reset narration position to verse 1 so next play starts from beginning
                      narrationVerseIndexRef.current = 0;
                      setCurrentReadingVerse(null);
                      setSelectedVerse(1); // Reset selected verse to 1 so resume starts from beginning
                      setAudioCurrentTime(0);
                    }}
                    className="p-0.5 rounded-full hover:bg-white/40 transition-colors flex-shrink-0"
                  >
                    <X className="size-4 text-gray-600" strokeWidth={2.5} />
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  key="collapsed"
                  initial={{
                    scale: 0.8,
                    opacity: 0,
                    y: 8
                  }}
                  animate={{
                    scale: 1,
                    opacity: 1,
                    y: 0
                  }}
                  exit={{
                    scale: 0.8,
                    opacity: 0,
                    y: 8
                  }}
                  transition={{
                    duration: 0.35,
                    ease: [0.32, 0.72, 0, 1] as const
                  }}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{
                    scale: 0.95,
                    transition: { duration: 0.1 }
                  }}
                  onClick={() => {
                    setAudioControlExpanded(true);
                    handleNarrationPlayPause();
                  }}
                  className="relative bg-white/70 backdrop-blur-xl backdrop-saturate-[180%] border border-white/40 p-4 rounded-full shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] hover:bg-white/80 transition-all"
                >
                  <Play className="size-6 text-[#006a6f] fill-current relative z-10" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Spacer for alignment when right button is hidden */}
            {isLastChapterOfBible && <div className="w-[52px]" />}

            {/* Next Button - Right side - Only show if not at last chapter */}
            {!isLastChapterOfBible && (
              <button
                onClick={handleNext}
                className="mr-[7px] bg-white/50 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/30 p-2.5 rounded-full shadow-[0px_4px_8px_3px_rgba(0,0,0,0.15),0px_1px_3px_0px_rgba(0,0,0,0.3)] hover:bg-white/70 transition-all"
              >
                <ChevronRight className="size-4 text-[#006065]" />
              </button>
            )}
          </div>
        </div>
      </div>

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