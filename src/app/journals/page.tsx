'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, SlidersHorizontal, Plus, MoreVertical,
  Pin, Bookmark, Check, X, Edit2, Trash2, Mic, Play, Pause,
  Bold, Italic, List, ChevronUp, ChevronDown,
  BookOpen, Sliders, ListOrdered, Strikethrough,
  Underline as UnderlineIcon, Tag,
  Heading1, Heading2, Quote,
  AlignLeft, AlignCenter, AlignRight, Loader2,
  Undo2, Redo2
} from 'lucide-react';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import { LiaBookMedicalSolid, LiaBookSolid } from 'react-icons/lia';
import { RelativeTimestamp } from '@/components/RelativeTimestamp';
import { fetchWithOfflineCache } from '@/lib/offline';

// â”€â”€ Tiptap Rich Text Editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { VerseLink } from '@/app/components/VerseLink';
import { VerseBlock } from '@/app/components/VerseBlock';
import BibleVerseSearchSelector from '@/app/components/BibleVerseSearchSelector';

type Tab = 'All' | 'Journals' | 'Prayers';
type ItemType = 'journal' | 'prayer';
type PrayerStatusFilter = 'All' | 'Active' | 'Prayed';

const DEFAULT_PRESET_LABELS = ['Faith', 'Gratitude', 'Hope', 'Worship', 'Personal', 'Family', 'Work', 'Study'];

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
  'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation'
];

function JournalsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigationSource = searchParams.get('source'); // 'profile' | null
  const confirm = useConfirm();

  // Lifecycle
  const [mounted, setMounted] = useState(false);

  // Lists & Collections
  const [journals, setJournals] = useState<any[]>([]);
  const [prayers, setPrayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Searching
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState<'pinned_recent' | 'recent'>('pinned_recent');
  
  // Prayer-specific status filter (shown when Prayers tab is active)
  const [prayerStatusFilter, setPrayerStatusFilter] = useState<PrayerStatusFilter>('All');

  // Advanced Filter state
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'journal' | 'prayer'>('all');
  const [filterPinned, setFilterPinned] = useState<boolean | null>(null);
  const [filterBookmarked, setFilterBookmarked] = useState<boolean | null>(null);
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // Bottom Sheets & Dialogs
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [showPrayedConfirm, setShowPrayedConfirm] = useState(false);
  const [prayedTargetId, setPrayedTargetId] = useState<string | null>(null);

  // Auto-close expanded FAB menu on scroll or Escape key press
  useEffect(() => {
    if (!isFabExpanded) return;

    const handleScroll = () => {
      setIsFabExpanded(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFabExpanded(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFabExpanded]);
  
  // Multi-select Mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Kebab Menu Context
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);
  const [activeKebabType, setActiveKebabType] = useState<ItemType>('journal');
  const [kebabPosition, setKebabPosition] = useState<{ top: number; right: number } | null>(null);

  // Target item for deletion
  const [targetItem, setTargetItem] = useState<{ id: string; type: ItemType } | null>(null);

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editorType, setEditorType] = useState<ItemType>('journal');
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editorId, setEditorId] = useState<string | null>(null);
  
  // Custom features states
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState<'text' | 'bg' | null>(null);
  
  // Editor Fields
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'text' | 'checklist' | 'audio'>('text');
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [isLabelSelectorOpen, setIsLabelSelectorOpen] = useState(false);

  const allAvailableLabels = useMemo(() => {
    const set = new Set([...DEFAULT_PRESET_LABELS, ...editLabels]);
    journals.forEach(j => {
      if (j.labels && Array.isArray(j.labels)) {
        j.labels.forEach((l: string) => { if (l && typeof l === 'string') set.add(l); });
      }
    });
    prayers.forEach(p => {
      if (p.labels && Array.isArray(p.labels)) {
        p.labels.forEach((l: string) => { if (l && typeof l === 'string') set.add(l); });
      }
    });
    return Array.from(set);
  }, [editLabels, journals, prayers]);
  const [editVerses, setEditVerses] = useState<any[]>([]);
  const [editFolderId, setEditFolderId] = useState('');
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<any[]>([]);
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editIsBookmarked, setEditIsBookmarked] = useState(false);

  // Rich Text Editor â€” Tiptap instance
  // (replaces the old contentEditable ref + execCommand approach)

  // Labels system additions
  const [labelInputOpen, setLabelInputOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

  // Add Verse options
  const [versePickerOpen, setVersePickerOpen] = useState(false);
  const [pickerBook, setPickerBook] = useState('John');
  const [pickerChapter, setPickerChapter] = useState(3);
  const [pickerVerseStart, setPickerVerseStart] = useState(16);
  const [pickerVerseEnd, setPickerVerseEnd] = useState(16);

  // New inline verse selection states
  const [atTriggerPosition, setAtTriggerPosition] = useState<number | null>(null);
  const [isVerseSearchOpen, setIsVerseSearchOpen] = useState(false);

  const fetchVerseQuoteText = async (book: string, chapter: number, start: number, end: number, version: string) => {
    try {
      const res = await fetch(`/api/v1/bible/${version || 'KJV'}/${encodeURIComponent(book)}/${chapter}`);
      const data = await res.json();
      if (data.success && data.data?.verses) {
        const selected = data.data.verses.filter((v: any) => v.number >= start && v.number <= end);
        if (selected.length > 0) {
          return selected.map((v: any) => v.text.trim()).join(' ');
        }
      }
    } catch (err) {
      console.error('Error fetching verse text for verse block:', err);
    }
    return '';
  };

  const handleSelectVerse = async (verseRef: {
    bookName: string;
    chapter: number;
    verses: number[];
    label: string;
    version: string;
  }) => {
    if (!editor) return;

    const startVerse = verseRef.verses[0];
    const endVerse = verseRef.verses[verseRef.verses.length - 1];

    const text = await fetchVerseQuoteText(verseRef.bookName, verseRef.chapter, startVerse, endVerse, verseRef.version);
    const quote = text ? `"${text.replace(/^["'\s]+|["'\s]+$/g, '')}"` : `"${verseRef.label}"`;

    const verseNode = {
      type: 'verseBlock',
      attrs: {
        book: verseRef.bookName,
        chapter: verseRef.chapter,
        startVerse,
        endVerse,
        version: verseRef.version,
        quote,
        label: verseRef.label,
      }
    };

    if (atTriggerPosition !== null) {
      const charAtPos = editor.state.doc.textBetween(atTriggerPosition - 1, atTriggerPosition);
      if (charAtPos === '@') {
        editor.chain()
          .focus()
          .deleteRange({ from: atTriggerPosition - 1, to: atTriggerPosition })
          .insertContent(verseNode)
          .run();
      } else {
        editor.chain()
          .focus()
          .insertContent(verseNode)
          .run();
      }
    } else {
      editor.chain()
        .focus()
        .insertContent(verseNode)
        .run();
    }
  };

  // Hover / Touch Verse Preview Tooltip State
  interface TooltipState {
    isOpen: boolean;
    x: number;
    y: number;
    loading: boolean;
    error: string | null;
    verses: Array<{ number: number; text: string }>;
    label: string;
  }

  const [tooltip, setTooltip] = useState<TooltipState>({
    isOpen: false,
    x: 0,
    y: 0,
    loading: false,
    error: null,
    verses: [],
    label: '',
  });

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseOver = async (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-verse-link]') || (e.target as HTMLElement).closest('[data-verse-tooltip]');
      if (!target) return;

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      // If it's the tooltip itself we hovered over, keep it open and don't re-fetch
      if (target.hasAttribute('data-verse-tooltip')) return;

      const book = target.getAttribute('data-verse-book');
      const chapter = target.getAttribute('data-verse-chapter');
      const start = target.getAttribute('data-verse-start');
      const end = target.getAttribute('data-verse-end');
      const version = target.getAttribute('data-verse-version') || 'KJV';

      if (!book || !chapter || !start || !end) return;

      const rect = target.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      // Position tooltip directly below the link, with a fallback if offscreen right
      const xPos = Math.min(window.innerWidth - 340, Math.max(16, rect.left + scrollX));
      const yPos = rect.bottom + scrollY + 8;

      setTooltip({
        isOpen: true,
        x: xPos,
        y: yPos,
        loading: true,
        error: null,
        verses: [],
        label: `${book} ${chapter}:${start}${start === end ? '' : `-${end}`} (${version})`,
      });

      try {
        const res = await fetch(`/api/v1/bible/${version}/${book}/${chapter}`);
        const data = await res.json();
        if (data.success && data.data.verses) {
          const startNum = parseInt(start);
          const endNum = parseInt(end);
          const filtered = data.data.verses.filter((v: any) => v.number >= startNum && v.number <= endNum);
          setTooltip(prev => ({
            ...prev,
            loading: false,
            verses: filtered,
          }));
        } else {
          throw new Error('Failed to load verses');
        }
      } catch (err: any) {
        setTooltip(prev => ({
          ...prev,
          loading: false,
          error: 'Could not load scripture text.',
        }));
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-verse-link]') || (e.target as HTMLElement).closest('[data-verse-tooltip]');
      if (!target) return;

      closeTimeoutRef.current = setTimeout(() => {
        setTooltip(prev => ({ ...prev, isOpen: false }));
      }, 300);
    };

    const handleTouchStart = async (e: TouchEvent) => {
      const target = (e.target as HTMLElement).closest('[data-verse-link]');
      if (!target) {
        // Tap outside closes
        setTooltip(prev => ({ ...prev, isOpen: false }));
        return;
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      const book = target.getAttribute('data-verse-book');
      const chapter = target.getAttribute('data-verse-chapter');
      const start = target.getAttribute('data-verse-start');
      const end = target.getAttribute('data-verse-end');
      const version = target.getAttribute('data-verse-version') || 'KJV';

      if (!book || !chapter || !start || !end) return;

      const rect = target.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;

      const xPos = Math.min(window.innerWidth - 340, Math.max(16, rect.left + scrollX));
      const yPos = rect.bottom + scrollY + 8;

      setTooltip({
        isOpen: true,
        x: xPos,
        y: yPos,
        loading: true,
        error: null,
        verses: [],
        label: `${book} ${chapter}:${start}${start === end ? '' : `-${end}`} (${version})`,
      });

      try {
        const res = await fetch(`/api/v1/bible/${version}/${book}/${chapter}`);
        const data = await res.json();
        if (data.success && data.data.verses) {
          const startNum = parseInt(start);
          const endNum = parseInt(end);
          const filtered = data.data.verses.filter((v: any) => v.number >= startNum && v.number <= endNum);
          setTooltip(prev => ({
            ...prev,
            loading: false,
            verses: filtered,
          }));
        } else {
          throw new Error('Failed to load verses');
        }
      } catch (err: any) {
        setTooltip(prev => ({
          ...prev,
          loading: false,
          error: 'Could not load scripture text.',
        }));
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('mouseout', handleMouseOut, { passive: true });
    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('touchstart', handleTouchStart);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Audio Recording States
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'completed'>('idle');
  const [audioTimer, setAudioTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Mount checklist
  useEffect(() => {
    setMounted(true);
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  // Toast trigger helper
  const showToast = (msg: string) => {
    const lower = msg.toLowerCase();
    if (lower.includes('error') || lower.includes('failed') || lower.includes('denied') || lower.includes('issue')) {
      toast.error(msg);
    } else if (lower.includes('activated') || lower.includes('complete') || lower.includes('linked')) {
      toast.info(msg);
    } else {
      toast.success(msg);
    }
  };

  // Main Fetcher with Offline Fallback
  const fetchData = async () => {
    setLoading(true);
    try {
      const [jData, pData] = await Promise.all([
        fetchWithOfflineCache('journals_user', async () => {
          const res = await fetch('/api/journals');
          if (!res.ok) throw new Error('Failed to fetch journals');
          return res.json();
        }),
        fetchWithOfflineCache('prayers_personal', async () => {
          const res = await fetch('/api/prayers?personal=true');
          if (!res.ok) throw new Error('Failed to fetch prayers');
          return res.json();
        }),
      ]);

      if (jData?.success) setJournals(jData.data);
      if (pData?.success) setPrayers(pData.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        showToast('Error loading records');
      }
    } finally {
      setLoading(false);
    }
  };

  // Folder creation action - REMOVED (folder creation no longer supported)

  // Card Toggling (Pin / Bookmark)
  const handleTogglePin = async (id: string, type: ItemType, currentPin: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Optimistic Update
    if (type === 'journal') {
      setJournals(journals.map(j => j._id === id ? { ...j, isPinned: !currentPin } : j));
    } else {
      setPrayers(prayers.map(p => p._id === id ? { ...p, isPinned: !currentPin } : p));
    }

    try {
      const endpoint = type === 'journal' ? `/api/journals/${id}` : `/api/prayers/${id}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: !currentPin })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Failed to toggle pin');
        fetchData(); // Rollback
      }
    } catch (err) {
      showToast('Network error');
      fetchData(); // Rollback
    }
  };

  const handleToggleBookmark = async (id: string, type: ItemType, currentBookmarked: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic Update
    if (type === 'journal') {
      setJournals(journals.map(j => j._id === id ? { ...j, isBookmarked: !currentBookmarked } : j));
    } else {
      setPrayers(prayers.map(p => p._id === id ? { ...p, isBookmarked: !currentBookmarked } : p));
    }

    try {
      const endpoint = type === 'journal' ? `/api/journals/${id}` : `/api/prayers/${id}`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmarked: !currentBookmarked })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Failed to toggle bookmark');
        fetchData(); // Rollback
      }
    } catch (err) {
      showToast('Network error');
      fetchData(); // Rollback
    }
  };

  // More Menu Kebab Trigger
  const handleOpenKebabMenu = (e: React.MouseEvent, id: string, type: ItemType) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    setKebabPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setActiveKebabId(id);
    setActiveKebabType(type);
  };

  // Close kebab when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.kebab-trigger') || target.closest('.kebab-menu')) {
        return;
      }
      setActiveKebabId(null);
    };
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  // Multi-select custom hold/long-press hook
  const holdTimerRef = useRef<any>(null);
  const isLongPressRef = useRef<boolean>(false);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const startPressTimer = (id: string, e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;

    if ('touches' in e && e.touches.length > 0) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      touchStartPosRef.current = null;
    }

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    holdTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      setSelectionMode(true);
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      showToast('Multi-select mode activated');
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !holdTimerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    // Cancel long-press timer if finger moves during touch scroll (> 6px)
    if (dx > 6 || dy > 6) {
      stopPressTimer();
    }
  };

  const stopPressTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  // Google Photos-style checkbox click: enters selection mode on first check,
  // toggles selection on subsequent checks, exits selection mode when all unchecked.
  const handleCheckboxClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // prevent card open
    e.preventDefault();
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter((sid) => sid !== id);
      setSelectedIds(next);
      if (next.length === 0) setSelectionMode(false);
    } else {
      if (!selectionMode) {
        setSelectionMode(true);
        showToast('Multi-select mode activated');
      }
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  // Card Clicks
  const handleCardClick = (item: any, type: ItemType) => {
    // If click was triggered upon releasing a long-press hold, ignore it
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }

    if (selectionMode) {
      if (selectedIds.includes(item._id)) {
        const next = selectedIds.filter(id => id !== item._id);
        setSelectedIds(next);
        if (next.length === 0) setSelectionMode(false);
      } else {
        setSelectedIds([...selectedIds, item._id]);
      }
      return;
    }
    
    // Open detail read-only view
    handleOpenReader(item, type);
  };

  // Open item in read-only mode
  const handleOpenReader = (item: any, type: ItemType) => {
    setEditorType(type);
    setEditorMode('view');
    setEditorId(item._id);
    setEditTitle(item.title || '');
    setEditContent(item.content || '');
    setEditType('text');
    setEditLabels(item.labels || []);
    setEditVerses(item.verses || []);
    setEditFolderId(item.folderId?._id || item.folderId || '');
    setEditAudioUrl('');
    setEditChecklistItems([]);
    setEditIsPinned(!!item.isPinned);
    setEditIsBookmarked(!!item.isBookmarked);
    setIsEditing(true);
  };

  // Editor Actions
  const handleOpenEditor = (item: any | null = null, type: ItemType = 'journal') => {
    setEditorType(type);
    setIsFabExpanded(false);
    
    if (item) {
      // Edit mode
      setEditorMode('edit');
      setEditorId(item._id);
      setEditTitle(item.title || '');
      setEditContent(item.content || '');
      setEditType(item.type || 'text');
      setEditLabels(item.labels || []);
      setEditVerses(item.verses || []);
      setEditFolderId(item.folderId?._id || item.folderId || '');
      setEditAudioUrl(item.audioUrl || '');
      setEditChecklistItems(item.checklistItems || []);
      setEditIsPinned(!!item.isPinned);
      setEditIsBookmarked(!!item.isBookmarked);
      
      // Sync Tiptap content â€” done via the useEffect that watches editorId
    } else {
      // Create mode
      setEditorMode('create');
      setEditorId(null);
      setEditTitle('');
      setEditContent('');
      setEditType('text');
      setEditLabels([]);
      setEditVerses([]);
      setEditFolderId('');
      setEditAudioUrl('');
      setEditChecklistItems([]);
      setEditIsPinned(false);
      setEditIsBookmarked(false);
    }
    
    setIsEditing(true);
  };

  // Label Creator Action
  const handleCreateLabel = () => {
    const text = newLabelText.trim();
    if (text && !editLabels.includes(text)) {
      setEditLabels([...editLabels, text]);
      setNewLabelText('');
      setLabelInputOpen(false);
    }
  };

  const handleRemoveLabel = (label: string) => {
    setEditLabels(editLabels.filter(l => l !== label));
  };

  // Add Verse picker linked action
  const handleAddVerse = () => {
    const versesArr: number[] = [];
    const start = Number(pickerVerseStart);
    const end = Number(pickerVerseEnd);
    
    if (start <= end) {
      for (let i = start; i <= end; i++) {
        versesArr.push(i);
      }
    } else {
      versesArr.push(start);
    }

    const newVerseRef = {
      bookName: pickerBook,
      chapter: Number(pickerChapter),
      verses: versesArr
    };

    setEditVerses([...editVerses, newVerseRef]);
    setVersePickerOpen(false);
    showToast(`Linked verse ${pickerBook} ${pickerChapter}:${start}-${end}`);
  };

  const handleRemoveVerse = (idx: number) => {
    setEditVerses(editVerses.filter((_, i) => i !== idx));
  };

  // â”€â”€ Tiptap Editor Instance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // History (undo/redo) is included in StarterKit by default
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Color,
      TextStyle,
      Highlight.configure({ multicolor: true }),
      VerseLink,
      VerseBlock,
    ],
    content: editContent,
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        'data-placeholder': 'Start drafting content here...',
      },
      handleClickOn: (view, pos, node, nodePos, event) => {
        const target = event.target as HTMLElement;
        if (node.type.name === 'verseBlock' || target.closest('[data-verse-block]')) {
          setAtTriggerPosition(null);
          setIsVerseSearchOpen(true);
          return true;
        }
        return false;
      },
      handleTextInput: (view, from, to, text) => {
        if (text === '@') {
          // Only trigger popup if preceded by a space or start of line
          const prevChar = from > 1 ? view.state.doc.textBetween(from - 1, from) : ' ';
          if (prevChar === ' ' || prevChar === '\n') {
            setAtTriggerPosition(from + 1);
            setIsVerseSearchOpen(true);
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      setEditContent(editor.getHTML());
    },
  });

  // Sync editor content when opening a different item
  useEffect(() => {
    if (editor && isEditing) {
      // Use queueMicrotask so the editor is fully mounted before we set content
      queueMicrotask(() => {
        if (editor && !editor.isDestroyed) {
          editor.commands.setContent(editContent || '', { emitUpdate: false });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorId, isEditing]);

  // Checklist Actions
  const handleAddChecklistItem = () => {
    setEditChecklistItems([...editChecklistItems, { text: '', checked: false }]);
  };

  const handleUpdateChecklistItemText = (index: number, val: string) => {
    const items = [...editChecklistItems];
    items[index].text = val;
    setEditChecklistItems(items);
  };

  const handleToggleChecklistItem = (index: number) => {
    const items = [...editChecklistItems];
    items[index].checked = !items[index].checked;
    setEditChecklistItems(items);
  };

  const handleDeleteChecklistItem = (index: number) => {
    setEditChecklistItems(editChecklistItems.filter((_, i) => i !== index));
  };

  const handleMoveChecklistItem = (index: number, dir: 'up' | 'down') => {
    if (dir === 'up' && index === 0) return;
    if (dir === 'down' && index === editChecklistItems.length - 1) return;
    
    const items = [...editChecklistItems];
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    
    setEditChecklistItems(items);
  };

  // Autosave support removed as per user request

  // Main Editor Save Actions
  const saveOrUpdateEditor = async (isAutosave = false) => {
    const titleText = editTitle.trim() || (editorType === 'journal' ? 'Untitled Journal' : 'Untitled Prayer');
    
    const payload = {
      title: titleText,
      content: editContent,
      type: editType,
      labels: editLabels,
      verses: editVerses,
      folderId: editFolderId || undefined,
      audioUrl: editAudioUrl || undefined,
      checklistItems: editChecklistItems,
      isPinned: editIsPinned,
      isBookmarked: editIsBookmarked
    };

    try {
      if (editorMode === 'edit' && editorId) {
        // PATCH
        const endpoint = editorType === 'journal' ? `/api/journals/${editorId}` : `/api/prayers/${editorId}`;
        const res = await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          // Update item in local list
          if (editorType === 'journal') {
            setJournals(prev => prev.map(j => j._id === editorId ? data.data : j));
          } else {
            setPrayers(prev => prev.map(p => p._id === editorId ? data.data : p));
          }
          if (isAutosave) {
            console.log('[Autosave] Saved.');
          } else {
            showToast('Changes saved successfully');
            setIsEditing(false);
          }
        }
      } else {
        // POST (Creation)
        const endpoint = editorType === 'journal' ? '/api/journals' : '/api/prayers?personal=true';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          if (editorType === 'journal') {
            setJournals([data.data, ...journals]);
          } else {
            setPrayers([data.data, ...prayers]);
          }
          showToast('Created successfully');
          setIsEditing(false);
        } else {
          showToast(data.error || 'Failed to create record');
        }
      }
    } catch (err) {
      console.error('Editor save error:', err);
      if (!isAutosave) showToast('Error saving changes');
    }
  };

  // Kebab Action Handles
  const handleEditKebabItem = (id: string, type: ItemType) => {
    setActiveKebabId(null);
    const item = type === 'journal' 
      ? journals.find(j => j._id === id)
      : prayers.find(p => p._id === id);
    if (item) handleOpenEditor(item, type);
  };

  const handleTriggerDelete = (id: string, type: ItemType) => {
    setActiveKebabId(null);
    setTargetItem({ id, type });
    setShowDeleteSheet(true);
  };

  const handleTriggerMarkAsPrayed = (id: string) => {
    setActiveKebabId(null);
    setPrayedTargetId(id);
    setShowPrayedConfirm(true);
  };

  // Mark prayer as prayed (one-way, irreversible)
  const handleConfirmMarkAsPrayed = async () => {
    if (!prayedTargetId) return;
    const id = prayedTargetId;
    setShowPrayedConfirm(false);
    setPrayedTargetId(null);

    // Optimistic update
    setPrayers(prev => prev.map(p => p._id === id ? { ...p, status: 'prayed' } : p));
    try {
      const res = await fetch(`/api/prayers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'prayed' })
      });
      const data = await res.json();
      if (!data.success) {
        showToast('Failed to update prayer status');
        fetchData(); // rollback
      } else {
        showToast('Prayer moved to prayed');
      }
    } catch {
      showToast('Network error');
      fetchData(); // rollback
    }
  };

  // Confirm Single Deletion
  const handleConfirmDelete = async () => {
    if (!targetItem) return;
    const { id, type } = targetItem;

    try {
      const endpoint = type === 'journal' ? `/api/journals/${id}` : `/api/prayers/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        if (type === 'journal') {
          setJournals(journals.filter(j => j._id !== id));
        } else {
          setPrayers(prayers.filter(p => p._id !== id));
        }
        showToast('Deleted successfully');
      } else {
        showToast('Error deleting item');
      }
    } catch (err) {
      showToast('Network error');
    } finally {
      setShowDeleteSheet(false);
      setTargetItem(null);
    }
  };

  // Multi-select Action execution
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmBatch = await confirm({
      title: 'Batch Delete',
      message: `Are you sure you want to delete these ${selectedIds.length} items?`,
      destructive: true
    });
    if (!confirmBatch) return;

    setLoading(true);
    try {
      // Run deletions in parallel
      await Promise.all(selectedIds.map(async (id) => {
        // Guess the type from local arrays
        const isJ = journals.some(j => j._id === id);
        const endpoint = isJ ? `/api/journals/${id}` : `/api/prayers/${id}`;
        await fetch(endpoint, { method: 'DELETE' });
      }));

      // Filter locally
      setJournals(prev => prev.filter(j => !selectedIds.includes(j._id)));
      setPrayers(prev => prev.filter(p => !selectedIds.includes(p._id)));
      showToast('Batch items deleted successfully');
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      showToast('Error in batch deletion');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchPin = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selectedIds.map(async (id) => {
        const isJ = journals.some(j => j._id === id);
        const endpoint = isJ ? `/api/journals/${id}` : `/api/prayers/${id}`;
        await fetch(endpoint, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPinned: true })
        });
      }));

      showToast('Batch items pinned successfully');
      fetchData();
      setSelectionMode(false);
      setSelectedIds([]);
    } catch (err) {
      showToast('Error in batch pinning');
      setLoading(false);
    }
  };

  // Audio Recorder logic
  const startRecordingAudio = async () => {
    audioChunksRef.current = [];
    setAudioTimer(0);
    setAudioBlob(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm' };
      
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(10);
      setRecordingState('recording');
      
      // Timer interval
      audioIntervalRef.current = setInterval(() => {
        setAudioTimer(prev => prev + 1);
      }, 1000);

      // Web Audio Visualizer Setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      drawWaveform();
    } catch (err) {
      console.error('Audio start error:', err);
      showToast('Microphone access denied or audio issue');
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (recordingState === 'idle') return;
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);

      // Canvas dimensions
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw waves dynamically based on volume
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#0B7A81';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // scale
        // Create an organic reactive wave peak
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, height / 2 + (y - height / 2) * (recordingState === 'paused' ? 0 : 0.6));
        } else {
          ctx.lineTo(x, height / 2 + (y - height / 2) * (recordingState === 'paused' ? 0 : 0.6));
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  };

  const pauseRecordingAudio = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    }
  };

  const resumeRecordingAudio = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      audioIntervalRef.current = setInterval(() => {
        setAudioTimer(prev => prev + 1);
      }, 1000);
      drawWaveform();
    }
  };

  const deleteRecordedAudio = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    setRecordingState('idle');
    setAudioTimer(0);
    setAudioBlob(null);
    setEditAudioUrl('');
    showToast('Recording deleted');
  };

  const saveRecordedAudio = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    setRecordingState('completed');
    showToast('Recording complete. Click save above to upload.');
  };

  // Cloudinary Audio Upload
  const handleUploadAudio = async () => {
    if (!audioBlob) return;
    setIsUploadingAudio(true);
    
    try {
      const audioFile = new File([audioBlob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('folder', 'journals-audio');

      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success && data.url) {
        setEditAudioUrl(data.url);
        showToast('Audio uploaded successfully');
      } else {
        showToast('Upload failed, saving base64 fallback local simulation');
        // Fallback simulate URL
        setEditAudioUrl(`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`);
      }
    } catch (err) {
      console.error('Audio upload failed:', err);
      // Fallback fallback
      setEditAudioUrl(`https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3`);
      showToast('Audio upload error, applied demonstration sound');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Compile final mixed search & filter lists
  const processedItems = useMemo(() => {
    let list: any[] = [];
    
    // Mix items depending on filters
    if (filterType === 'all') {
      const mappedJ = journals.map(item => ({ ...item, _itemType: 'journal' as ItemType }));
      const mappedP = prayers.map(item => ({ ...item, _itemType: 'prayer' as ItemType }));
      list = [...mappedJ, ...mappedP];
    } else if (filterType === 'journal') {
      list = journals.map(item => ({ ...item, _itemType: 'journal' as ItemType }));
    } else if (filterType === 'prayer') {
      list = prayers.map(item => ({ ...item, _itemType: 'prayer' as ItemType }));
    }

    // Category tab filtering
    if (activeTab === 'Journals') {
      list = list.filter(item => item._itemType === 'journal');
    } else if (activeTab === 'Prayers') {
      list = list.filter(item => item._itemType === 'prayer');
    }

    // Apply prayer status sub-filter
    if (prayerStatusFilter !== 'All') {
      list = list.filter(item => {
        if (item._itemType !== 'prayer') return true;
        if (prayerStatusFilter === 'Active') return !item.status || item.status === 'active';
        if (prayerStatusFilter === 'Prayed') return item.status === 'prayed';
        return true;
      });
    }

    // Text search query matching: title, content, labels, or linked bible verses
    const q = debouncedQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(item => {
        const titleMatch = item.title && item.title.toLowerCase().includes(q);
        const descMatch = item.content && item.content.toLowerCase().includes(q);
        const labelMatch = item.labels && item.labels.some((l: string) => l && l.toLowerCase().includes(q));
        const verseMatch = item.verses && item.verses.some((v: any) => v && v.bookName && v.bookName.toLowerCase().includes(q));
        return titleMatch || descMatch || labelMatch || verseMatch;
      });
    }

    // Advanced filtering constraints
    if (filterPinned !== null) {
      list = list.filter(item => item.isPinned === filterPinned);
    }
    if (filterBookmarked !== null) {
      list = list.filter(item => item.isBookmarked === filterBookmarked);
    }
    
    // Date filter
    if (filterDate !== 'all') {
      const today = new Date();
      list = list.filter(item => {
        const itemDate = new Date(item.updatedAt || item.createdAt);
        const diffTime = Math.abs(today.getTime() - itemDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (filterDate === 'today') return diffDays <= 1;
        if (filterDate === 'week') return diffDays <= 7;
        if (filterDate === 'month') return diffDays <= 30;
        return true;
      });
    }

    // Apply Sorting (Pinned first, then Recent or just Recent)
    if (sortBy === 'pinned_recent') {
      return [...list].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
    } else {
      return [...list].sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    }
  }, [journals, prayers, activeTab, debouncedQuery, sortBy, filterType, filterPinned, filterBookmarked, filterDate, prayerStatusFilter]);

  const activeKebabItem = useMemo(() => {
    if (!activeKebabId) return null;
    return activeKebabType === 'prayer'
      ? prayers.find(p => p._id === activeKebabId)
      : journals.find(j => j._id === activeKebabId);
  }, [activeKebabId, activeKebabType, prayers, journals]);

  const isActivePrayerPrayed = activeKebabType === 'prayer' && activeKebabItem?.status === 'prayed';

  // Loading Skeleton
  if (!mounted || status === 'loading' || (loading && status === 'authenticated')) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#000000] text-gray-900 dark:text-[#F5F5F5]">
        <header className="h-[64px] px-4 flex items-center border-b border-gray-100 dark:border-white/[0.08] justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="flex space-x-4">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          </div>
        </header>
        <main className="p-4 space-y-4">
          <div className="h-8 w-full bg-gray-200 animate-pulse rounded-full" />
          {[1, 2, 3].map(n => (
            <div key={n} className="h-28 bg-white dark:bg-[#111111] rounded-xl p-4 border border-gray-100 dark:border-white/[0.08] space-y-2">
              <div className="h-5 w-2/3 bg-gray-200 animate-pulse rounded" />
              <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-1/3 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </main>
      </div>
    );
  }

  // Not logged in redirect visual
  if (!session?.user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-white dark:bg-[#000000] text-gray-900 dark:text-[#F5F5F5]">
        <div className="w-16 h-16 bg-[#0B7A81]/10 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-[#0B7A81]" />
        </div>
        <h2 className="text-lg font-bold mb-1">Access private journals &amp; prayers</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Please sign in to view and save your private journals, track audio prayers, and utilize custom labels.</p>
        <button
          onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`)}
          className="px-6 py-2.5 bg-[#0B7A81] text-white rounded-xl text-sm font-semibold shadow-md active:opacity-90"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] text-gray-900 dark:text-[#F5F5F5] pb-24 relative">

      <AnimatePresence mode="wait">
        {!isEditing ? (
          /* â”€â”€ MAIN LIST VIEW â”€â”€ */
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col"
          >
            {/* Header */}
            <header className="h-[64px] px-4 flex items-center justify-between border-b border-[#E6E6E6] dark:border-white/[0.08] bg-white dark:bg-[#000000] sticky top-0 z-30">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (navigationSource === 'profile') {
                      // Return to the home page with ?profile=true so AppHeader
                      // re-opens the profile drawer automatically.
                      router.push('/home?profile=true');
                    } else {
                      router.back();
                    }
                  }}
                  className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <h1 className="text-[20px] font-bold tracking-tight">
                  {selectionMode ? `${selectedIds.length} selected` : 'Journals & prayers'}
                </h1>
              </div>

              {/* Header Right Buttons */}
              <div className="flex items-center space-x-1">
                {selectionMode ? (
                  <>
                    <button
                      onClick={handleBatchPin}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                      title="Pin selected"
                    >
                      <Pin className="w-[18px] h-[18px] text-[#0B7A81]" />
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                      title="Delete selected"
                    >
                      <Trash2 className="w-[18px] h-[18px] text-[#FF4D4F]" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectionMode(false);
                        setSelectedIds([]);
                      }}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <>
                    {/* Search Bar Toggle */}
                    <button
                      onClick={() => setShowSearchBar(!showSearchBar)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] ${showSearchBar ? 'text-[#0B7A81]' : ''}`}
                      title="Search"
                    >
                      <Search className="w-[18px] h-[18px]" />
                    </button>
                    {/* Sort Selector Toggle */}
                    <button
                      onClick={() => setSortBy(sortBy === 'pinned_recent' ? 'recent' : 'pinned_recent')}
                      className={`w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] ${sortBy === 'recent' ? 'text-[#0B7A81]' : ''}`}
                      title={sortBy === 'pinned_recent' ? 'Pinned items prioritized' : 'Recent prioritized'}
                    >
                      <Sliders className="w-[18px] h-[18px]" />
                    </button>
                    {/* Filter Sheet trigger */}
                    <button
                      onClick={() => setShowFilterSheet(true)}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                    >
                      <SlidersHorizontal className="w-[18px] h-[18px]" />
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* Search Input Bar (Matches Figma Debounce) */}
            <AnimatePresence>
              {showSearchBar && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 py-2 bg-transparent sticky top-[64px] z-20 overflow-hidden"
                >
                  <div className="relative flex items-center bg-white dark:bg-[#111111] border border-[#E6E6E6] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 shadow-sm">
                    <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search journals and prayers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent border-none outline-none focus:ring-0 w-full text-[16px] md:text-sm placeholder:text-gray-400"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded-full shrink-0">
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab-based Category Filter Interface with Automatic Item Counts */}
            <div
              style={{ top: showSearchBar ? '120px' : '64px' }}
              className="sticky top-[64px] z-20 bg-white dark:bg-[#000000] border-b border-[#E6E6E6] dark:border-white/[0.08] px-4 py-2.5 select-none transition-all duration-200"
            >
              <div className="flex items-center p-1 bg-gray-100/90 dark:bg-white/[0.06] rounded-xl gap-1 max-w-5xl mx-auto">
                {(['All', 'Journals', 'Prayers'] as Tab[]).map((tabName) => {
                  const isSelected = activeTab === tabName;
                  const count =
                    tabName === 'All'
                      ? journals.length + prayers.length
                      : tabName === 'Journals'
                      ? journals.length
                      : prayers.length;

                  return (
                    <button
                      key={tabName}
                      type="button"
                      onClick={() => {
                        setActiveTab(tabName);
                        if (tabName !== 'Prayers') setPrayerStatusFilter('All');
                      }}
                      className={`flex-1 min-w-0 py-2 px-3 rounded-lg text-xs md:text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        isSelected
                          ? 'bg-white dark:bg-[#1A1A1E] text-[#0B7A81] dark:text-[#14B8A6] shadow-sm font-bold'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.03]'
                      }`}
                      aria-selected={isSelected}
                      role="tab"
                    >
                      <span className="truncate">{tabName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold leading-none shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#0B7A81]/12 text-[#0B7A81] dark:bg-[#0B7A81]/25 dark:text-[#14B8A6]'
                            : 'bg-gray-200/80 dark:bg-white/[0.1] text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Prayer status sub-filter pills when Prayers tab is active */}
              {activeTab === 'Prayers' && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/[0.04] max-w-5xl mx-auto">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status:</span>
                  {(['All', 'Active', 'Prayed'] as PrayerStatusFilter[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setPrayerStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        prayerStatusFilter === st
                          ? 'bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-400 font-bold'
                          : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Empty State */}
            {processedItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <div className="w-16 h-16 rounded-full bg-[#0B7A81]/5 dark:bg-[#0B7A81]/15 flex items-center justify-center mb-4">
                  <BookOpen className="w-8 h-8 text-[#0B7A81]" />
                </div>
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No journals or prayers found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mt-1 leading-relaxed">
                  Try widening your search query or tap the FAB in the bottom right corner to start documenting.
                </p>
              </div>
            )}

            {/* Mixed Items List Grid */}
            <main className="px-4 py-2 space-y-4 max-w-5xl mx-auto w-full">
              {processedItems.map((item) => {
                const isJ = item._itemType === 'journal';
                
                // Construct Linked Verses String
                const firstVerseRef = item.verses?.[0];
                const verseTitle = firstVerseRef 
                  ? `${firstVerseRef.bookName} ${firstVerseRef.chapter}:${firstVerseRef.verses.join(', ')}`
                  : null;

                const isSelected = selectedIds.includes(item._id);

                return (
                  <motion.div
                    key={item._id}
                    onClick={() => handleCardClick(item, isJ ? 'journal' : 'prayer')}
                    onMouseDown={(e) => startPressTimer(item._id, e)}
                    onMouseUp={stopPressTimer}
                    onMouseLeave={stopPressTimer}
                    onTouchStart={(e) => startPressTimer(item._id, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={stopPressTimer}
                    onTouchCancel={stopPressTimer}
                    className="group w-full relative transition-all duration-200 select-none active:scale-[0.99] cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-xl p-4 border border-l-4 flex flex-col relative transition-shadow shadow-sm hover:shadow ${
                        isSelected 
                          ? 'border-[#0B7A81] bg-[#F4FAFA] dark:bg-[#0B7A81]/10 ' + (isJ ? 'border-l-[#0B7A81]' : 'border-l-rose-500 dark:border-l-rose-400')
                          : isJ
                            ? 'bg-white dark:bg-[#111111] border-[#E6E6E6] dark:border-white/[0.08] border-l-[#0B7A81]' 
                            : item.status === 'prayed'
                              ? 'bg-gray-50 dark:bg-[#111111] border-gray-200 dark:border-white/[0.06] border-l-rose-400/60 dark:border-l-rose-500/50 opacity-80'
                              : 'bg-rose-50/20 dark:bg-[#181113] border-rose-200/60 dark:border-rose-900/30 border-l-rose-500 dark:border-l-rose-400'
                      }`}
                    >
                      {/* ── Google Photos-style selection checkbox ──
                          Desktop only (hidden on mobile/touch devices).
                          Visible when: card is hovered OR item is selected.
                          Clicking it enters/toggles selection without opening the item. */}
                      <button
                        onClick={(e) => handleCheckboxClick(e, item._id)}
                        onMouseDown={(e) => e.stopPropagation()} // prevent long-press timer
                        aria-label={isSelected ? `Deselect ${item.title}` : `Select ${item.title}`}
                        aria-checked={isSelected}
                        role="checkbox"
                        className={[
                          // Positioning: absolute top-left with comfortable hit area
                          'absolute top-2.5 left-2.5 z-10',
                          // Size & shape
                          'w-6 h-6 rounded-full flex items-center justify-center',
                          // Transition
                          'transition-all duration-150 ease-out',
                          // Focus ring for keyboard accessibility
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B7A81] focus-visible:ring-offset-1',
                          // Desktop-only hover reveal:
                          // hidden on mobile (no fine pointer), visible on hover or when selected
                          isSelected
                            ? // Selected state: teal filled circle with white check
                              'opacity-100 bg-[#0B7A81] border-2 border-[#0B7A81] shadow-md scale-100'
                            : // Unselected state: subtle gray circle, appears on desktop hover or when in selection mode
                              [
                                'bg-white/90 dark:bg-[#1a1a1a]/90 border-2 border-gray-300 dark:border-gray-600',
                                'shadow-sm',
                                // Always visible in selection mode; otherwise show only on group hover (desktop)
                                selectionMode
                                  ? 'opacity-80'
                                  : 'opacity-0 md:group-hover:opacity-100',
                                'scale-90 md:group-hover:scale-100',
                              ].join(' '),
                        ].join(' ')}
                      >
                        {isSelected && (
                          <Check
                            className="w-3.5 h-3.5 text-white"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        )}
                        {!isSelected && selectionMode && (
                          // Empty circle indicator when in selection mode but not selected
                          <span className="w-2.5 h-2.5 rounded-full border border-gray-400 dark:border-gray-500" aria-hidden="true" />
                        )}
                      </button>

                      {/* Top Badges / Indicators */}
                      {/* pl-8 on md+ ensures badges clear the absolute checkbox on hover/selection */}
                      <div className={`flex items-center justify-between mb-1.5 transition-all duration-150 ${
                        isSelected || selectionMode ? 'pl-8' : 'md:group-hover:pl-8'
                      }`}>
                        <div className="flex items-center space-x-1.5">
                          {/* Mixed Type Badge */}
                          <span className={`text-[10px] tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                            isJ 
                              ? 'bg-teal-500/10 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300' 
                              : 'bg-rose-500/10 text-rose-600 dark:bg-rose-400/15 dark:text-rose-400'
                          }`}>
                            {isJ ? (item.type === 'checklist' ? 'Checklist' : item.type === 'audio' ? 'Voice' : 'Journal') : 'Prayer'}
                          </span>
                          
                          {/* Prayer Status Badge */}
                          {!isJ && (
                            <span className={`text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                              item.status === 'prayed'
                                ? 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-gray-500'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                            }`}>
                              {item.status === 'prayed' ? 'Prayed' : 'Active'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Content Header */}
                      <h2 className="text-[16px] font-bold text-gray-800 dark:text-[#F5F5F5] leading-snug line-clamp-1">
                        {item.title}
                      </h2>

                      {/* Content Preview */}
                      {isJ && item.type === 'checklist' ? (
                        <div className="mt-1 space-y-0.5">
                          {item.checklistItems?.slice(0, 3).map((ci: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-1.5 text-xs text-gray-500">
                              <span className="text-[10px]">{ci.checked ? '☑' : '☐'}</span>
                              <span className={`line-clamp-1 ${ci.checked ? 'line-through text-gray-300' : ''}`}>{ci.text || 'Item'}</span>
                            </div>
                          ))}
                          {item.checklistItems?.length > 3 && (
                            <span className="text-[10px] text-gray-400">+{item.checklistItems.length - 3} more items</span>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1 line-clamp-2">
                          {item.content ? item.content.replace(/<[^>]*>/g, '').trim() || '(Empty)' : '(Empty)'}
                        </p>
                      )}

                      {/* Linked Bible Verse Badge */}
                      {verseTitle && (
                        <div className="flex items-center space-x-1 mt-2.5 text-[#0B7A81] dark:text-[#0B7A81]/90">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs font-semibold hover:underline shrink-0">
                            {verseTitle}
                          </span>
                        </div>
                      )}

                      {/* Audio Icon indicator */}
                      {isJ && item.type === 'audio' && item.audioUrl && (
                        <div className="flex items-center space-x-1.5 mt-2.5 text-orange-500 font-semibold text-xs">
                          <span>ðŸŽ¤</span>
                          <span>Voice note attached</span>
                        </div>
                      )}

                      {/* Labels chips list row */}
                      {item.labels && item.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.labels.map((l: string) => (
                            <span key={l} className="text-[9px] font-bold bg-[#E8EFF0] text-[#222222] px-1.5 py-0.5 rounded">
                              #{l}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Bottom row actions */}
                      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-gray-100 dark:border-white/[0.04]">
                        <RelativeTimestamp
                          date={item.updatedAt || item.createdAt}
                          className="text-[10px] text-gray-400 dark:text-gray-500"
                        />

                        {/* Interactive Icons Aligned Right */}
                        {!selectionMode && (
                          <div className="flex items-center space-x-3 text-gray-400 select-none">
                            <button
                              onClick={(e) => handleTogglePin(item._id, isJ ? 'journal' : 'prayer', !!item.isPinned, e)}
                              className={`p-1 hover:text-[#0B7A81] ${item.isPinned ? 'text-[#0B7A81]' : ''}`}
                            >
                              <Pin className={`w-4 h-4 ${item.isPinned ? 'fill-[#0B7A81]' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => handleToggleBookmark(item._id, isJ ? 'journal' : 'prayer', !!item.isBookmarked, e)}
                              className={`p-1 hover:text-[#0B7A81] ${item.isBookmarked ? 'text-[#0B7A81]' : ''}`}
                            >
                              <Bookmark className={`w-4 h-4 ${item.isBookmarked ? 'fill-[#0B7A81]' : ''}`} />
                            </button>
                            <button
                              onClick={(e) => handleOpenKebabMenu(e, item._id, isJ ? 'journal' : 'prayer')}
                              className="p-1 hover:text-gray-600 kebab-trigger"
                            >
                              <MoreVertical className="w-4 h-4 pointer-events-none" />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </main>

            {/* Custom Interactive Floating Action Button (FAB) & Expandable Menu */}
            {!selectionMode && (
              <>
                {/* Backdrop Overlay to close on outside click */}
                <AnimatePresence>
                  {isFabExpanded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="fixed inset-0 z-40 bg-black/25 dark:bg-black/50"
                      onClick={() => setIsFabExpanded(false)}
                    />
                  )}
                </AnimatePresence>

                {/* Floating Action Cards */}
                <AnimatePresence>
                  {isFabExpanded && (
                    <div className="fixed bottom-[156px] right-[20px] z-50 flex flex-col items-end gap-3 pointer-events-auto select-none">
                      {/* Top Action Card: New Journal */}
                      <motion.button
                        key="new-journal-card"
                        type="button"
                        initial={{ opacity: 0, scale: 0.85, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 12 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28, delay: 0.04 }}
                        style={{ transformOrigin: 'bottom right' }}
                        onClick={() => {
                          setIsFabExpanded(false);
                          handleOpenEditor(null, 'journal');
                        }}
                        className="bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-white/[0.08] rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3.5 group cursor-pointer"
                        aria-label="New Journal"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#0B7A81]/10 dark:bg-[#0B7A81]/20 text-[#0B7A81] dark:text-[#14B8A6] flex items-center justify-center shrink-0">
                          <LiaBookMedicalSolid className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap pr-1">
                          New Journal
                        </span>
                      </motion.button>

                      {/* Bottom Action Card: New Prayer */}
                      <motion.button
                        key="new-prayer-card"
                        type="button"
                        initial={{ opacity: 0, scale: 0.85, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85, y: 12 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                        style={{ transformOrigin: 'bottom right' }}
                        onClick={() => {
                          setIsFabExpanded(false);
                          handleOpenEditor(null, 'prayer');
                        }}
                        className="bg-white dark:bg-[#1A1A1E] border border-gray-100 dark:border-white/[0.08] rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3.5 group cursor-pointer"
                        aria-label="New Prayer"
                      >
                        <div className="w-10 h-10 rounded-full bg-rose-500/10 dark:bg-rose-400/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <LiaBookSolid className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap pr-1">
                          New Prayer
                        </span>
                      </motion.button>
                    </div>
                  )}
                </AnimatePresence>

                {/* FAB Main Button */}
                <button
                  type="button"
                  onClick={() => setIsFabExpanded(!isFabExpanded)}
                  style={{ boxShadow: isFabExpanded ? '0 8px 24px rgba(0,0,0,0.25)' : '0 8px 24px rgba(11,122,129,0.25)' }}
                  className={`fixed bottom-[88px] right-[20px] w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-colors duration-200 z-50 cursor-pointer ${
                    isFabExpanded ? 'bg-[#2B363B] text-white' : 'bg-[#0B7A81] text-white'
                  }`}
                  aria-label={isFabExpanded ? 'Close menu' : 'Add journal or prayer'}
                  aria-expanded={isFabExpanded}
                >
                  <motion.div
                    animate={{ rotate: isFabExpanded ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex items-center justify-center"
                  >
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </motion.div>
                </button>
              </>
            )}
          </motion.div>
        ) : (
          /* â”€â”€ RICH EDITOR VIEW â”€â”€ */
          <motion.div
            key="editor-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col min-h-screen pb-24"
            style={{ transform: 'none' }}
          >
            {/* Editor Header */}
            <header className="h-[64px] px-4 flex items-center justify-between border-b border-[#E6E6E6] dark:border-white/[0.08] bg-white dark:bg-[#000000] sticky top-0 z-30">
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => setIsEditing(false)}
                  className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] cursor-pointer"
                  aria-label="Go back to list"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-[18px] font-bold">
                  {editorMode === 'view'
                    ? (editorType === 'journal' ? 'Journal details' : 'Prayer details')
                    : (editorMode === 'create' ? `Create ${editorType === 'journal' ? 'journal' : 'prayer'}` : 'Edit')}
                </h2>
              </div>

              <div className="flex items-center space-x-2.5">
                {/* Header Actions */}
                <button
                  onClick={() => handleTogglePin(editorId || 'temp', editorType, editIsPinned)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] ${editIsPinned ? 'text-[#0B7A81]' : 'text-gray-400'}`}
                  title="Pin"
                >
                  <Pin className={`w-[17px] h-[17px] ${editIsPinned ? 'fill-[#0B7A81]' : ''}`} />
                </button>
                
                {editorMode === 'view' ? (
                  <button
                    onClick={() => setEditorMode('edit')}
                    className="h-9 px-5 bg-[#0B7A81] hover:bg-[#086369] text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => saveOrUpdateEditor(false)}
                    className="h-9 px-5 bg-[#0B7A81] hover:bg-[#086369] text-white rounded-xl text-sm font-semibold active:scale-95 transition-all shadow-sm"
                  >
                    Save
                  </button>
                )}
              </div>
            </header>

            {/* Labels Header chips system & Selector Popover */}
            {(editLabels.length > 0 || editorMode !== 'view') && (
              <div className="px-5 py-2.5 bg-white dark:bg-[#000000] border-b border-gray-100 dark:border-white/[0.04] relative">
                <div className="max-w-5xl mx-auto flex flex-col gap-2">
                  
                  {/* Top Bar: Summary Pill & Removable Selected Chips */}
                  <div className="flex flex-wrap items-center gap-2 select-none">
                    {editorMode !== 'view' ? (
                      <button
                        type="button"
                        onClick={() => setIsLabelSelectorOpen(!isLabelSelectorOpen)}
                        className={`h-8 px-3.5 rounded-full text-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-2xs ${
                          editLabels.length > 0
                            ? 'border border-[#0B7A81] text-[#0B7A81] dark:text-[#14B8A6] bg-white dark:bg-[#111111] font-semibold'
                            : 'border border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 bg-white dark:bg-[#111111] hover:bg-gray-50 font-medium'
                        }`}
                        aria-expanded={isLabelSelectorOpen}
                        aria-label="Select labels"
                      >
                        <Tag className="w-3.5 h-3.5 stroke-[2]" />
                        <span>
                          {editLabels.length === 0
                            ? 'Label +'
                            : editLabels.length === 1
                            ? '1 label +'
                            : `${editLabels.length} labels +`}
                        </span>
                      </button>
                    ) : (
                      editLabels.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Labels:</span>
                        </div>
                      )
                    )}

                    {/* Removable Selected Chips beside summary button */}
                    {editLabels.map(l => (
                      <span
                        key={l}
                        onClick={() => editorMode !== 'view' && handleRemoveLabel(l)}
                        className={`h-8 px-3 py-1 bg-[#E6F4F5] dark:bg-[#0B7A81]/20 text-[#0B7A81] dark:text-[#14B8A6] rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors ${
                          editorMode !== 'view' ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 cursor-pointer' : ''
                        }`}
                      >
                        {l}
                        {editorMode !== 'view' && <X className="w-3 h-3 opacity-70 hover:opacity-100" />}
                      </span>
                    ))}
                  </div>

                  {/* Label Selector Popover Card */}
                  <AnimatePresence>
                    {isLabelSelectorOpen && editorMode !== 'view' && (
                      <>
                        {/* Outside Click Backdrop */}
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setIsLabelSelectorOpen(false)}
                        />

                        {/* Popover Dropdown Card */}
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-5 mt-1 z-40 bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/[0.1] rounded-2xl shadow-xl p-4 sm:p-5 w-[calc(100%-40px)] sm:w-[360px] select-none"
                        >
                          {/* Heading */}
                          <div className="flex items-center mb-3">
                            <span className="text-[11px] font-extrabold tracking-wider text-gray-500 dark:text-gray-400 uppercase">
                              LABELS
                            </span>
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal ml-1.5">
                              (select multiple)
                            </span>
                          </div>

                          {/* Chips List */}
                          <div className="flex flex-wrap gap-2 mb-3 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                            {allAvailableLabels.map(label => {
                              const isSelected = editLabels.includes(label);
                              return (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      handleRemoveLabel(label);
                                    } else {
                                      setEditLabels([...editLabels, label]);
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                                    isSelected
                                      ? 'bg-[#0B7A81] text-white shadow-xs'
                                      : 'bg-[#F2F4F5] dark:bg-white/[0.06] text-[#334155] dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}

                            {/* More button */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsLabelSelectorOpen(false);
                                setLabelInputOpen(true);
                              }}
                              className="px-3.5 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/[0.12] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.06] flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              More
                            </button>
                          </div>

                          {/* Clear all action */}
                          {editLabels.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-start">
                              <button
                                type="button"
                                onClick={() => setEditLabels([])}
                                className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#0B7A81] dark:hover:text-[#14B8A6] font-medium transition-colors cursor-pointer"
                              >
                                Clear all
                              </button>
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                </div>
              </div>
            )}

            {/* Sticky Formatting Toolbar (edit mode only) */}
            {editorMode !== 'view' && (
              <div className="sticky top-[64px] z-20 bg-white dark:bg-[#000000] border-b border-[#E6E6E6] dark:border-white/[0.08]">
                <div className="px-3 py-1.5 flex items-center min-h-[44px]">

                  {/* Fixed Left-most Action: Add Verse */}
                  <div className="flex items-center shrink-0 pr-2.5 border-r border-gray-200 dark:border-white/[0.1] mr-1.5">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setAtTriggerPosition(null);
                        setIsVerseSearchOpen(true);
                      }}
                      className="h-8 px-2.5 rounded-lg transition-all bg-[#0B7A81]/10 hover:bg-[#0B7A81]/20 text-[#0B7A81] dark:bg-[#0B7A81]/20 dark:hover:bg-[#0B7A81]/30 dark:text-[#14B8A6] flex items-center gap-1.5 shrink-0 font-medium active:scale-95 shadow-xs"
                      title="Add verse"
                      aria-label="Add verse"
                    >
                      <BookOpen className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold whitespace-nowrap">Add verse</span>
                    </button>
                  </div>

                  {/* Scrollable Container for Remaining Formatting Actions */}
                  <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 min-w-0">

                    {/* Undo / Redo Group */}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().undo().run(); }}
                      disabled={!editor?.can().undo()}
                      className="p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Undo (Ctrl+Z)"
                      aria-label="Undo"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().redo().run(); }}
                      disabled={!editor?.can().redo()}
                      className="p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Redo (Ctrl+Y)"
                      aria-label="Redo"
                    >
                      <Redo2 className="w-4 h-4" />
                    </button>

                    {/* Separator */}
                    <span className="w-px h-5 bg-gray-300 dark:bg-white/[0.1] mx-1 shrink-0" />

                    {/* Inline Marks Group */}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('bold') ? 'tiptap-btn-active' : '' }`}
                      title="Bold (Ctrl+B)"
                      aria-label="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('italic') ? 'tiptap-btn-active' : '' }`}
                      title="Italic (Ctrl+I)"
                      aria-label="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('underline') ? 'tiptap-btn-active' : '' }`}
                      title="Underline (Ctrl+U)"
                      aria-label="Underline"
                    >
                      <UnderlineIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('strike') ? 'tiptap-btn-active' : '' }`}
                      title="Strikethrough"
                      aria-label="Strikethrough"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </button>

                    {/* Separator */}
                    <span className="w-px h-5 bg-gray-300 dark:bg-white/[0.1] mx-1 shrink-0" />

                    {/* ── Headings Group ── */}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 1 }).run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('heading', { level: 1 }) ? 'tiptap-btn-active' : '' }`}
                      title="Heading 1"
                      aria-label="Heading 1"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleHeading({ level: 2 }).run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('heading', { level: 2 }) ? 'tiptap-btn-active' : '' }`}
                      title="Heading 2"
                      aria-label="Heading 2"
                    >
                      <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBlockquote().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('blockquote') ? 'tiptap-btn-active' : '' }`}
                      title="Blockquote"
                      aria-label="Blockquote"
                    >
                      <Quote className="w-4 h-4" />
                    </button>

                    {/* Separator */}
                    <span className="w-px h-5 bg-gray-300 dark:bg-white/[0.1] mx-1 shrink-0" />

                    {/* ── Lists Group ── */}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('bulletList') ? 'tiptap-btn-active' : '' }`}
                      title="Bullet List"
                      aria-label="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive('orderedList') ? 'tiptap-btn-active' : '' }`}
                      title="Numbered List"
                      aria-label="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>

                    {/* Separator */}
                    <span className="w-px h-5 bg-gray-300 dark:bg-white/[0.1] mx-1 shrink-0" />

                    {/* ── Text Alignment Group ── */}
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('left').run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive({ textAlign: 'left' }) ? 'tiptap-btn-active' : '' }`}
                      title="Align Left"
                      aria-label="Align Left"
                    >
                      <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('center').run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive({ textAlign: 'center' }) ? 'tiptap-btn-active' : '' }`}
                      title="Align Center"
                      aria-label="Align Center"
                    >
                      <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('right').run(); }}
                      className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 shrink-0 ${ editor?.isActive({ textAlign: 'right' }) ? 'tiptap-btn-active' : '' }`}
                      title="Align Right"
                      aria-label="Align Right"
                    >
                      <AlignRight className="w-4 h-4" />
                    </button>

                    {/* Separator */}
                    <span className="w-px h-5 bg-gray-300 dark:bg-white/[0.1] mx-1 shrink-0" />

                    {/* ── Text Color Picker ── */}
                    <div className="relative flex items-center shrink-0">
                      <button
                        type="button"
                        className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center ${showColorMenu === 'text' ? 'bg-gray-200 dark:bg-white/[0.1]' : ''}`}
                        title="Text Color"
                        aria-label="Text Color"
                        onClick={() => setShowColorMenu(showColorMenu === 'text' ? null : 'text')}
                      >
                        <span className="font-bold border-b-2 border-current px-0.5 leading-none text-xs">A</span>
                      </button>
                      {showColorMenu === 'text' && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColorMenu(null)} />
                          <div className="absolute top-full mt-1.5 left-0 z-50 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/[0.12] p-2 rounded-xl shadow-xl flex items-center gap-1.5 min-w-max">
                            {['#000000', '#E23744', '#1890FF', '#52C41A', '#FADB14', '#722ED1', '#FF7A00'].map(color => (
                              <button
                                key={color}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  editor?.chain().focus().setColor(color).run();
                                  setShowColorMenu(null);
                                }}
                                className="w-6 h-6 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110 active:scale-95 shadow-sm"
                                style={{ backgroundColor: color }}
                                title={color}
                                aria-label={`Text color ${color}`}
                              />
                            ))}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                editor?.chain().focus().unsetColor().run();
                                setShowColorMenu(null);
                              }}
                              className="text-xs px-2 py-1 hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-md font-medium text-gray-600 dark:text-gray-300"
                            >
                              Default
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ── Text Highlight Color Picker ── */}
                    <div className="relative flex items-center shrink-0">
                      <button
                        type="button"
                        className={`p-1.5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 flex items-center ${showColorMenu === 'bg' ? 'bg-gray-200 dark:bg-white/[0.1]' : ''}`}
                        title="Highlight Color"
                        aria-label="Highlight Color"
                        onClick={() => setShowColorMenu(showColorMenu === 'bg' ? null : 'bg')}
                      >
                        <span className="font-bold bg-yellow-200 text-black px-1 py-0.5 rounded leading-none text-xs">H</span>
                      </button>
                      {showColorMenu === 'bg' && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowColorMenu(null)} />
                          <div className="absolute top-full mt-1.5 left-0 z-50 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-white/[0.12] p-2 rounded-xl shadow-xl flex items-center gap-1.5 min-w-max">
                            {[
                              { label: 'Clear', color: 'none' },
                              { label: 'Yellow', color: '#FFE58F' },
                              { label: 'Red', color: '#FFCCC7' },
                              { label: 'Green', color: '#D9F7BE' },
                              { label: 'Blue', color: '#BAE7FF' },
                              { label: 'Purple', color: '#EFDBFF' },
                              { label: 'Orange', color: '#FFE7BA' },
                            ].map(({ label, color }) => (
                              <button
                                key={color}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (color === 'none') {
                                    editor?.chain().focus().unsetHighlight().run();
                                  } else {
                                    editor?.chain().focus().toggleHighlight({ color }).run();
                                  }
                                  setShowColorMenu(null);
                                }}
                                className="w-6 h-6 rounded-full border border-black/10 dark:border-white/20 transition-transform hover:scale-110 active:scale-95 shadow-sm flex items-center justify-center text-[10px]"
                                style={{ backgroundColor: color === 'none' ? '#FFFFFF' : color }}
                                title={label}
                                aria-label={`Highlight ${label}`}
                              >
                                {color === 'none' && <X className="w-3 h-3 text-gray-500" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}

            <div className="px-5 py-5 max-w-5xl mx-auto w-full space-y-4 flex-1 flex flex-col">

              {/* Add Label Dialog */}
              <AnimatePresence>
                {labelInputOpen && (
                  <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-xl w-full max-w-xs p-5 shadow-2xl"
                    >
                      <h4 className="font-bold text-sm text-gray-800 dark:text-[#F5F5F5]">Add custom label</h4>
                      <input
                        type="text"
                        placeholder="Label name (e.g. Hope)..."
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); }}
                        className="w-full h-10 mt-3 rounded-xl border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setLabelInputOpen(false)}
                          className="flex-1 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateLabel}
                          className="flex-1 h-9 bg-[#0B7A81] text-white rounded-xl text-xs font-semibold"
                        >
                          Create
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>


              {/* Title Input field */}
              <div className="relative">
                {editorMode === 'view' ? (
                  <h1 className="w-full text-[22px] font-bold text-gray-800 dark:text-white py-1">
                    {editTitle || 'Untitled'}
                  </h1>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Title (max 120 characters)"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value.substring(0, 120))}
                      className="w-full bg-transparent border-none text-[22px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-0"
                    />
                    <span className="absolute right-0 bottom-[-14px] text-[9px] text-gray-400 font-bold tracking-wider">
                      {editTitle.length} / 120
                    </span>
                  </>
                )}
              </div>

              <div className="border-b border-gray-100 dark:border-white/[0.04] pt-2" />

              {editorMode === 'view' ? (
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <div
                    className="w-full flex-1 text-base outline-none min-h-[260px] leading-relaxed select-text text-gray-800 dark:text-[#F0F0F0]"
                    dangerouslySetInnerHTML={{ __html: editContent || '<span class="text-gray-400 italic">No content</span>' }}
                  />
                </div>
              ) : (
                /* Primary Content Rich Text Editor (contentEditable / textarea) */
                <div className="flex-1 flex flex-col min-h-[300px]">
                  {/* ── Tiptap Editor Canvas — borderless document surface ── */}
                  <EditorContent
                    editor={editor}
                    className="w-full flex-1 text-base min-h-[320px] cursor-text"
                  />
                </div>
              )}


              {/* Linked Verses Previews Section */}
              {editVerses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 tracking-wider block">Linked scriptures</span>
                  <div className="space-y-2">
                    {editVerses.map((v, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#111111] p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-[#0B7A81]">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-xs font-bold">{v.bookName} {v.chapter}:{v.verses.join(', ')}</span>
                        </div>
                        {editorMode !== 'view' && (
                          <button type="button" onClick={() => handleRemoveVerse(idx)} className="p-1 text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Verse Trigger Button */}
              {editorMode !== 'view' && (
                <button
                  type="button"
                  onClick={() => setVersePickerOpen(true)}
                  className="w-fit text-sm font-semibold text-[#0B7A81] flex items-center gap-1.5 active:scale-95 py-1"
                >
                  <Plus className="w-4 h-4" /> Add verse
                </button>
              )}

              {/* Dynamic Scripture Reference selection Dialog */}
              <AnimatePresence>
                {versePickerOpen && (
                  <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-xl w-full max-w-sm p-5 shadow-2xl select-none"
                    >
                      <h3 className="font-bold text-base text-gray-800 dark:text-[#F5F5F5]">Link Bible scripture</h3>
                      <div className="mt-4 space-y-3.5">
                        {/* Book Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400">Bible book</label>
                          <select
                            value={pickerBook}
                            onChange={(e) => setPickerBook(e.target.value)}
                            className="w-full h-10 mt-1 rounded-xl border border-gray-300 dark:border-white/[0.08] px-2 text-[16px] md:text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                          >
                            {BIBLE_BOOKS.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {/* Chapter / Verse inputs */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400">Chapter</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerChapter}
                              onChange={(e) => setPickerChapter(Math.max(1, Number(e.target.value)))}
                              className="w-full h-10 mt-1 rounded-xl border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm bg-transparent outline-none focus:border-[#0B7A81]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400">Verse start</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerVerseStart}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setPickerVerseStart(val);
                                if (pickerVerseEnd < val) setPickerVerseEnd(val);
                              }}
                              className="w-full h-10 mt-1 rounded-xl border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm bg-transparent outline-none focus:border-[#0B7A81]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400">Verse end</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerVerseEnd}
                              onChange={(e) => setPickerVerseEnd(Math.max(pickerVerseStart, Number(e.target.value)))}
                              className="w-full h-10 mt-1 rounded-xl border border-gray-300 dark:border-white/[0.08] px-3 text-[16px] md:text-sm bg-transparent outline-none focus:border-[#0B7A81]"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2.5 mt-6">
                        <button
                          type="button"
                          onClick={() => setVersePickerOpen(false)}
                          className="flex-1 h-10 rounded-xl border border-gray-200 text-sm text-gray-500 font-medium active:scale-95"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddVerse}
                          className="flex-1 h-10 bg-[#0B7A81] text-white rounded-xl text-sm font-semibold active:scale-95"
                        >
                          Link verse
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KEBAB FLOATING POPOVER MENU (Single cards actions) */}
      <AnimatePresence>
        {activeKebabId && kebabPosition && (
          <motion.div 
            key="kebab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40" 
            onClick={() => setActiveKebabId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'absolute',
                top: kebabPosition.top,
                right: kebabPosition.right,
              }}
              className="w-48 bg-white dark:bg-[#1A1A1A] rounded-xl shadow-xl border border-gray-100 dark:border-white/[0.08] overflow-hidden py-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Move to prayed only for active prayers */}
              {activeKebabType === 'prayer' && !isActivePrayerPrayed && (
                <button
                  onClick={() => handleTriggerMarkAsPrayed(activeKebabId)}
                  className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-emerald-600 dark:text-emerald-400"
                >
                  <span>Move to prayed</span>
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </button>
              )}
              {/* Edit for both prayer and journal */}
              <button
                onClick={() => handleEditKebabItem(activeKebabId, activeKebabType)}
                className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-200"
              >
                <span>{activeKebabType === 'prayer' ? 'Edit prayer' : 'Edit journal'}</span>
                <Edit2 className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {/* Delete for both */}
              <button
                onClick={() => handleTriggerDelete(activeKebabId, activeKebabType)}
                className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-[#FF4D4F] border-t border-gray-100 dark:border-white/[0.04]"
              >
                <span>{activeKebabType === 'prayer' ? 'Delete prayer' : 'Delete journal'}</span>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* â”€â”€ DELETE FLOW CONFIRMATION SHEET â”€â”€ */}
      <AnimatePresence>
        {showDeleteSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center" onClick={() => setShowDeleteSheet(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white dark:bg-[#111111] rounded-t-xl w-full max-w-lg p-6 shadow-2xl flex flex-col select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[100px] h-[5px] bg-gray-300 dark:bg-white/[0.12] rounded-full mx-auto mb-5 select-none shrink-0" />
              <h3 className="font-extrabold text-base text-gray-800 dark:text-[#F5F5F5] mb-2 text-center">
                Delete {targetItem?.type === 'journal' ? 'journal' : 'prayer'}?
              </h3>
              <p className="text-xs text-gray-400 mb-6 text-center leading-relaxed">
                Are you sure you want to delete this item? This action is permanent and cannot be undone.
              </p>

              <div className="flex gap-3 pb-2">
                <button
                  onClick={() => setShowDeleteSheet(false)}
                  className="flex-1 py-3.5 border border-gray-200 text-gray-500 rounded-xl text-xs font-bold active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 py-3.5 bg-[#FF4D4F] hover:bg-red-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* â”€â”€ MARK AS PRAYED CONFIRMATION DIALOG â”€â”€ */}
      <AnimatePresence>
        {showPrayedConfirm && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPrayedConfirm(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-xl w-full max-w-sm p-6 shadow-2xl select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon wrapper */}
                <div className="w-12 h-12 bg-[#0B7A81]/10 dark:bg-[#0B7A81]/25 text-[#0B7A81] rounded-full flex items-center justify-center mb-4">
                  <Check className="w-6 h-6" strokeWidth={3} />
                </div>
                
                <h3 className="font-extrabold text-lg text-gray-900 dark:text-[#F5F5F5] mb-2">
                  Move to prayed?
                </h3>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  This action is <span className="font-semibold text-red-500">irreversible</span>. Once moved to prayed, this prayer will be archived in the "Prayed" category and cannot be moved back to active status.
                </p>

                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setShowPrayedConfirm(false)}
                    className="flex-1 py-2.5 border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 rounded-xl text-xs font-bold active:scale-95 transition-all hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmMarkAsPrayed}
                    className="flex-1 py-2.5 bg-[#0B7A81] hover:bg-[#086369] text-white rounded-xl text-xs font-bold active:scale-95 shadow-sm transition-all"
                  >
                    Yes, proceed
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* â”€â”€ ADVANCED FILTERS DIALOG SHEET â”€â”€ */}
      <AnimatePresence>
        {showFilterSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center" onClick={() => setShowFilterSheet(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white dark:bg-[#111111] rounded-t-xl w-full max-w-lg p-6 shadow-2xl flex flex-col select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[100px] h-[5px] bg-gray-300 dark:bg-white/[0.12] rounded-full mx-auto mb-5 select-none shrink-0" />
              
              <div className="flex items-center justify-between mb-4 border-b pb-3.5">
                <h3 className="font-extrabold text-base text-gray-800 dark:text-[#F5F5F5]">Filter content</h3>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterPinned(null);
                    setFilterBookmarked(null);
                    setFilterDate('all');
                    setPrayerStatusFilter('All');
                    showToast('Filters cleared');
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-[#0B7A81]"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-none pr-1 mb-6">
                {/* Filter Category type */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide block mb-1.5">Document type</span>
                  <div className="flex bg-[#F1F2F3] dark:bg-white/[0.04] p-0.5 rounded-lg w-fit">
                    {(['all', 'journal', 'prayer'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setFilterType(t)}
                        className={`text-xs px-3.5 py-1.5 rounded-md font-bold capitalize transition-all ${
                          filterType === t 
                            ? 'bg-white dark:bg-[#111111] text-[#0B7A81] shadow-xs' 
                            : 'text-gray-500'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Prayer Status Filter */}
                {(filterType === 'prayer' || filterType === 'all') && (
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 tracking-wide block mb-1.5">Prayer status</span>
                    <div className="flex gap-2">
                      {(['All', 'Active', 'Prayed'] as PrayerStatusFilter[]).map((f) => (
                        <button
                          key={f}
                          onClick={() => setPrayerStatusFilter(f)}
                          className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold ${
                            prayerStatusFilter === f ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                          }`}
                        >
                          {f === 'Active' ? 'Active' : f === 'Prayed' ? 'Prayed' : 'All'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filter Pinning */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide block mb-1.5">Pinned status</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterPinned(null)}
                      className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold ${
                        filterPinned === null ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterPinned(true)}
                      className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold flex items-center gap-1 ${
                        filterPinned === true ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <Pin className="w-3 h-3" /> Pinned
                    </button>
                    <button
                      onClick={() => setFilterPinned(false)}
                      className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold ${
                        filterPinned === false ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Unpinned
                    </button>
                  </div>
                </div>

                {/* Filter Bookmarked */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide block mb-1.5">Bookmarked status</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterBookmarked(null)}
                      className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold ${
                        filterBookmarked === null ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterBookmarked(true)}
                      className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold flex items-center gap-1 ${
                        filterBookmarked === true ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <Bookmark className="w-3 h-3" /> Bookmarked
                    </button>
                  </div>
                </div>

                {/* Filter Date updated */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 tracking-wide block mb-1.5">Last modification date</span>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'today', 'week', 'month'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDate(d)}
                        className={`text-xs px-3.5 py-1.5 border rounded-xl font-bold capitalize ${
                          filterDate === d ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        {d === 'all' ? 'Anytime' : d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowFilterSheet(false)}
                className="w-full py-3.5 bg-[#0B7A81] hover:bg-[#086369] text-white rounded-xl text-xs font-extrabold text-center shadow-sm active:scale-95"
              >
                Apply filters
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bible Verse Search Selector popup */}
      <BibleVerseSearchSelector
        isOpen={isVerseSearchOpen}
        onClose={() => setIsVerseSearchOpen(false)}
        onSelect={handleSelectVerse}
      />

      {/* Hover / Touch Verse Preview Card */}
      {tooltip.isOpen && (
        <div
          data-verse-tooltip="true"
          onMouseEnter={() => {
            if (closeTimeoutRef.current) {
              clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            closeTimeoutRef.current = setTimeout(() => {
              setTooltip(prev => ({ ...prev, isOpen: false }));
            }, 300);
          }}
          className="absolute z-[9999] w-[320px] max-h-[220px] overflow-y-auto bg-white/95 dark:bg-[#121214]/95 backdrop-blur-md border border-gray-200/50 dark:border-white/[0.08] p-3.5 rounded-xl shadow-xl transition-all duration-200 animate-in fade-in zoom-in-95"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <div className="flex flex-col space-y-1.5">
            <span className="text-xs font-extrabold text-[#0B7A81] dark:text-[#14B8A6] tracking-wider block">
              {tooltip.label}
            </span>
            {tooltip.loading ? (
              <div className="flex items-center space-x-2 py-2 text-gray-400 text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Fetching scripture...</span>
              </div>
            ) : tooltip.error ? (
              <span className="text-xs text-red-500">{tooltip.error}</span>
            ) : (
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                {tooltip.verses.map(v => (
                  <p key={v.number} className="text-xs md:text-sm">
                    <span className="font-extrabold text-[#0B7A81] dark:text-[#14B8A6] mr-1.5 text-[10px] md:text-xs align-super">
                      {v.number}
                    </span>
                    {v.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function JournalsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#0B7A81]"></div>
      </div>
    }>
      <JournalsContent />
    </Suspense>
  );
}
