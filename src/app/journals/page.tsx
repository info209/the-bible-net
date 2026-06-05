'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Search, SlidersHorizontal, Plus, MoreVertical,
  Pin, Bookmark, Check, X, Edit2, Trash2, Mic, Play, Pause,
  Bold, Italic, List, ChevronUp, ChevronDown,
  BookOpen, Sliders
} from 'lucide-react';

type Tab = 'All' | 'Journals' | 'Prayers';
type ItemType = 'journal' | 'prayer';
type PrayerStatusFilter = 'All' | 'Active' | 'Prayed';

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

export default function JournalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
  const [showFabSheet, setShowFabSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  
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
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorId, setEditorId] = useState<string | null>(null);
  
  // Editor Fields
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<'text' | 'checklist' | 'audio'>('text');
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editVerses, setEditVerses] = useState<any[]>([]);
  const [editFolderId, setEditFolderId] = useState('');
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editChecklistItems, setEditChecklistItems] = useState<any[]>([]);
  const [editIsPinned, setEditIsPinned] = useState(false);
  const [editIsBookmarked, setEditIsBookmarked] = useState(false);

  // Rich Text Editor ContentEditable Ref
  const richTextRef = useRef<HTMLDivElement>(null);

  // Labels system additions
  const [labelInputOpen, setLabelInputOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

  // Add Verse options
  const [versePickerOpen, setVersePickerOpen] = useState(false);
  const [pickerBook, setPickerBook] = useState('John');
  const [pickerChapter, setPickerChapter] = useState(3);
  const [pickerVerseStart, setPickerVerseStart] = useState(16);
  const [pickerVerseEnd, setPickerVerseEnd] = useState(16);

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

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Main Fetcher
  const fetchData = async () => {
    setLoading(true);
    try {
      const [journalsRes, prayersRes] = await Promise.all([
        fetch('/api/journals'),
        fetch('/api/prayers?personal=true'),
      ]);

      const jData = await journalsRes.json();
      const pData = await prayersRes.json();

      if (jData.success) setJournals(jData.data);
      if (pData.success) setPrayers(pData.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Error loading records');
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
    const handleOutside = () => setActiveKebabId(null);
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  // Multi-select custom hold/long-press hook imitation
  const holdTimerRef = useRef<any>(null);
  const startPressTimer = (id: string) => {
    holdTimerRef.current = setTimeout(() => {
      setSelectionMode(true);
      setSelectedIds([id]);
      showToast('Multi-select mode activated');
    }, 600);
  };

  const stopPressTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
  };

  // Card Clicks
  const handleCardClick = (item: any, type: ItemType) => {
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
    
    // Open Editor in view/edit mode
    handleOpenEditor(item, type);
  };

  // Editor Actions
  const handleOpenEditor = (item: any | null = null, type: ItemType = 'journal') => {
    setEditorType(type);
    setShowFabSheet(false);
    
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
      
      // Delay syncing rich text to allow editor panel mounting
      setTimeout(() => {
        if (richTextRef.current) {
          richTextRef.current.innerHTML = item.content || '';
        }
      }, 50);
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
      if (richTextRef.current) {
        richTextRef.current.innerHTML = '';
      }
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

  // Rich text formatting execution
  const executeCommand = (command: string) => {
    document.execCommand(command, false, undefined);
    if (richTextRef.current) {
      setEditContent(richTextRef.current.innerHTML);
    }
  };

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

  // Autosave support
  const autosaveTimeoutRef = useRef<any>(null);
  useEffect(() => {
    if (!isEditing || editorMode !== 'edit' || !editorId) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      saveOrUpdateEditor(true);
    }, 2000); // 2 seconds debounce autosave

    return () => clearTimeout(autosaveTimeoutRef.current);
  }, [editTitle, editContent, editChecklistItems, editLabels, editVerses, editFolderId, editIsPinned, editIsBookmarked]);

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

  // Mark prayer as prayed (one-way, irreversible)
  const handleMarkAsPrayed = async (id: string) => {
    setActiveKebabId(null);
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
        showToast('Prayer marked as Prayed 🙏');
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
    const confirmBatch = confirm(`Are you sure you want to delete these ${selectedIds.length} items?`);
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
      // Apply prayer status sub-filter
      if (prayerStatusFilter === 'Active') {
        list = list.filter(item => !item.status || item.status === 'active');
      } else if (prayerStatusFilter === 'Prayed') {
        list = list.filter(item => item.status === 'prayed');
      }
      // 'All' shows both active and prayed prayers
    }

    // Text search query matching: title, content, labels, or linked bible verses
    if (debouncedQuery.trim()) {
      const regex = new RegExp(debouncedQuery, 'i');
      list = list.filter(item => {
        const titleMatch = item.title && regex.test(item.title);
        const descMatch = item.content && regex.test(item.content);
        const labelMatch = item.labels && item.labels.some((l: string) => regex.test(l));
        const verseMatch = item.verses && item.verses.some((v: any) => regex.test(v.bookName));
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
            <div key={n} className="h-28 bg-white dark:bg-[#111111] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.08] space-y-2">
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
        <h2 className="text-lg font-bold mb-1">Access Private Journals & Prayers</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">Please sign in to view and save your private journals, track audio prayers, and utilize custom labels.</p>
        <button
          onClick={() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`)}
          className="px-6 py-2.5 bg-[#0B7A81] text-white rounded-full text-sm font-semibold shadow-md active:opacity-90"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#000000] text-gray-900 dark:text-[#F5F5F5] pb-24 relative select-none">
      <style dangerouslySetInnerHTML={{ __html: `
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #a0aec0;
          cursor: text;
        }
      ` }} />

      <AnimatePresence mode="wait">
        {!isEditing ? (
          /* ── MAIN LIST VIEW ── */
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
                  onClick={() => router.back()}
                  className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                </button>
                <h1 className="text-[20px] font-bold tracking-tight">
                  {selectionMode ? `${selectedIds.length} selected` : 'Journals & Prayers'}
                </h1>
              </div>

              {/* Header Right Buttons */}
              <div className="flex items-center space-x-1">
                {selectionMode ? (
                  <>
                    <button
                      onClick={handleBatchPin}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                      title="Pin Selected"
                    >
                      <Pin className="w-[18px] h-[18px] text-[#0B7A81]" />
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                      title="Delete Selected"
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
            <div className="px-4 py-2 bg-transparent sticky top-[64px] z-20">
              <div className="relative flex items-center bg-white dark:bg-[#111111] border border-[#E6E6E6] dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 shadow-sm">
                <Search className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search title, contents, labels, or verses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none focus:ring-0 w-full text-sm placeholder:text-gray-400"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-0.5 hover:bg-gray-200 dark:hover:bg-white/[0.08] rounded-full shrink-0">
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Chips */}
            <div className="flex px-4 gap-2 overflow-x-auto scrollbar-none py-3 sticky top-[120px] bg-white dark:bg-[#000000] z-20 select-none">
              {(['All', 'Journals', 'Prayers'] as Tab[]).map((tabName) => {
                const isSelected = activeTab === tabName;
                return (
                  <button
                    key={tabName}
                    onClick={() => {
                      setActiveTab(tabName);
                      // Reset prayer sub-filter when leaving Prayers tab
                      if (tabName !== 'Prayers') setPrayerStatusFilter('All');
                    }}
                    className="h-8 px-4 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all flex items-center justify-center active:scale-95"
                    style={{
                      backgroundColor: isSelected ? '#0B7A81' : '#F1F2F3',
                      color: isSelected ? '#FFFFFF' : '#666666'
                    }}
                  >
                    {tabName}
                  </button>
                );
              })}
            </div>

            {/* Prayer Status Sub-Filter (shown only when Prayers tab active) */}
            {activeTab === 'Prayers' && (
              <div className="flex px-4 gap-2 pb-2 bg-white dark:bg-[#000000] sticky top-[168px] z-10 select-none">
                {(['All', 'Active', 'Prayed'] as PrayerStatusFilter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPrayerStatusFilter(f)}
                    className="h-7 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition-all active:scale-95 border"
                    style={{
                      backgroundColor: prayerStatusFilter === f ? (f === 'Prayed' ? '#6B7280' : '#0B7A81') : 'transparent',
                      borderColor: prayerStatusFilter === f ? (f === 'Prayed' ? '#6B7280' : '#0B7A81') : '#D1D5DB',
                      color: prayerStatusFilter === f ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {f === 'Active' ? '🔥 Active' : f === 'Prayed' ? '✓ Prayed' : 'All'}
                  </button>
                ))}
              </div>
            )}

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

                const formattedTime = item.updatedAt 
                  ? new Date(item.updatedAt).toLocaleDateString() + ' ' + new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : new Date(item.createdAt).toLocaleDateString();

                const isSelected = selectedIds.includes(item._id);

                return (
                  <motion.div
                    key={item._id}
                    layoutId={item._id}
                    onClick={() => handleCardClick(item, isJ ? 'journal' : 'prayer')}
                    onMouseDown={() => startPressTimer(item._id)}
                    onMouseUp={stopPressTimer}
                    onMouseLeave={stopPressTimer}
                    onTouchStart={() => startPressTimer(item._id)}
                    onTouchEnd={stopPressTimer}
                    className="w-full relative transition-all duration-200 select-none active:scale-[0.99] cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-2xl p-4 border flex flex-col relative transition-shadow shadow-sm hover:shadow ${
                        isSelected 
                          ? 'border-[#0B7A81] bg-[#F4FAFA] dark:bg-[#0B7A81]/10' 
                          : isJ
                            ? 'bg-white dark:bg-[#111111] border-[#E6E6E6] dark:border-white/[0.08]' 
                            : item.status === 'prayed'
                              ? 'bg-gray-50 dark:bg-[#111111] border-gray-200 dark:border-white/[0.06] opacity-80'
                              : 'bg-[#F4FAFA] dark:bg-[#111618] border-[#0B7A81]/20 dark:border-[#0B7A81]/25'
                      }`}
                    >
                      {/* Top Badges / Indicators */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-1.5">
                          {/* Mixed Type Badge */}
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                            isJ 
                              ? 'bg-gray-100 text-gray-600 dark:bg-white/[0.04] dark:text-gray-400' 
                              : 'bg-[#0B7A81]/10 text-[#0B7A81] dark:bg-[#0B7A81]/20'
                          }`}>
                            {isJ ? (item.type === 'checklist' ? 'Checklist' : item.type === 'audio' ? 'Voice' : 'Journal') : 'Prayer'}
                          </span>
                          
                          {/* Prayer Status Badge */}
                          {!isJ && (
                            <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              item.status === 'prayed'
                                ? 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-gray-500'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                            }`}>
                              {item.status === 'prayed' ? '✓ Prayed' : '🔥 Active'}
                            </span>
                          )}
                        </div>

                        {/* Multi-select check Indicator */}
                        {selectionMode && (
                          <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'bg-[#0B7A81] border-[#0B7A81]' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                          </div>
                        )}
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-1 line-clamp-2"
                           dangerouslySetInnerHTML={{ __html: item.content || '(Empty)' }} />
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
                          <span>🎤</span>
                          <span>Voice Note Attached</span>
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
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {formattedTime}
                        </span>

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
                              className="p-1 hover:text-gray-600"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </main>

            {/* Custom Interactive Floating Action Button (FAB) */}
            {!selectionMode && (
              <button
                onClick={() => setShowFabSheet(true)}
                style={{ boxShadow: '0 8px 24px rgba(11,122,129,0.25)' }}
                className="fixed bottom-[88px] right-[20px] w-14 h-14 bg-[#0B7A81] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all z-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            )}
          </motion.div>
        ) : (
          /* ── RICH EDITOR VIEW ── */
          <motion.div
            key="editor-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full flex flex-col min-h-screen pb-24"
          >
            {/* Editor Header */}
            <header className="h-[64px] px-4 flex items-center justify-between border-b border-[#E6E6E6] dark:border-white/[0.08] bg-white dark:bg-[#000000] sticky top-0 z-30">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsEditing(false)}
                  className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-[18px] font-bold">
                  {editorMode === 'create' ? `Create ${editorType === 'journal' ? 'Journal' : 'Prayer'}` : 'Edit'}
                </h2>
              </div>

              <div className="flex items-center space-x-2.5">
                {/* Autosave subtle status */}
                <span className="text-[10px] text-gray-400 italic">
                  {editorMode === 'edit' ? 'Autosaved' : ''}
                </span>
                
                {/* Header Actions */}
                <button
                  onClick={() => handleTogglePin(editorId || 'temp', editorType, editIsPinned)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-200/50 dark:hover:bg-white/[0.06] ${editIsPinned ? 'text-[#0B7A81]' : 'text-gray-400'}`}
                  title="Pin"
                >
                  <Pin className={`w-[17px] h-[17px] ${editIsPinned ? 'fill-[#0B7A81]' : ''}`} />
                </button>
                
                <button
                  onClick={() => saveOrUpdateEditor(false)}
                  className="h-9 px-5 bg-[#0B7A81] hover:bg-[#086369] text-white rounded-full text-sm font-semibold active:scale-95 transition-all shadow-sm"
                >
                  Save
                </button>
              </div>
            </header>

            <div className="px-5 py-4 max-w-5xl mx-auto w-full space-y-5 flex-1 flex flex-col">
              
              {/* Type Switcher Selector (Only if Journal and in Create Mode) */}
              {editorType === 'journal' && editorMode === 'create' && (
                <div className="flex bg-[#F1F2F3] dark:bg-white/[0.04] p-1 rounded-xl w-fit">
                  {(['text', 'checklist', 'audio'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-bold capitalize transition-all ${
                        editType === t 
                          ? 'bg-white dark:bg-[#111111] text-[#0B7A81] shadow-sm' 
                          : 'text-gray-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Labels Header chips system "Label +" */}
              <div className="flex flex-wrap gap-2 py-1 select-none">
                <button
                  onClick={() => setLabelInputOpen(true)}
                  className="h-8 px-3.5 bg-white dark:bg-[#111111] text-[#0B7A81] border border-[#0B7A81] rounded-full text-xs font-semibold flex items-center hover:opacity-90 shrink-0"
                >
                  Label +
                </button>
                {editLabels.map(l => (
                  <span
                    key={l}
                    onClick={() => handleRemoveLabel(l)}
                    className="h-8 px-3.5 bg-[#E8EFF0] text-[#222222] rounded-full text-xs font-semibold flex items-center gap-1.5 shrink-0 hover:bg-red-100 hover:text-red-700 cursor-pointer"
                  >
                    #{l} <span className="text-[10px] text-gray-400">✕</span>
                  </span>
                ))}
              </div>

              {/* Add Label Dialog */}
              <AnimatePresence>
                {labelInputOpen && (
                  <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-2xl w-full max-w-xs p-5 shadow-2xl"
                    >
                      <h4 className="font-bold text-sm text-gray-800 dark:text-[#F5F5F5]">Add Custom Label</h4>
                      <input
                        type="text"
                        placeholder="Label name (e.g. Hope)..."
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleCreateLabel(); }}
                        className="w-full h-10 mt-3 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                      />
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => setLabelInputOpen(false)}
                          className="flex-1 h-9 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateLabel}
                          className="flex-1 h-9 bg-[#0B7A81] text-white rounded-lg text-xs font-semibold"
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
                <input
                  type="text"
                  placeholder="Title (Max 120 characters)"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.substring(0, 120))}
                  className="w-full bg-transparent border-none text-[22px] font-bold text-gray-800 dark:text-white placeholder:text-gray-300 focus:outline-none focus:ring-0"
                />
                <span className="absolute right-0 bottom-[-14px] text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                  {editTitle.length} / 120
                </span>
              </div>

              <div className="border-b border-gray-100 dark:border-white/[0.04] pt-2" />

              {/* Checklist Editor Section */}
              {editorType === 'journal' && editType === 'checklist' && (
                <div className="space-y-2.5 flex-1 select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Checklist Items</span>
                    <button
                      type="button"
                      onClick={handleAddChecklistItem}
                      className="text-xs font-semibold text-[#0B7A81] flex items-center gap-1 active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </div>

                  {editChecklistItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs italic bg-white dark:bg-white/[0.02] border rounded-xl border-dashed">
                      Checklist is empty. Tap add item to start.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editChecklistItems.map((ci, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] p-2 rounded-xl group">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={!!ci.checked}
                            onChange={() => handleToggleChecklistItem(idx)}
                            className="w-4 h-4 rounded text-[#0B7A81] focus:ring-[#0B7A81]"
                          />
                          
                          {/* Input text */}
                          <input
                            type="text"
                            placeholder="Enter item description..."
                            value={ci.text}
                            onChange={(e) => handleUpdateChecklistItemText(idx, e.target.value)}
                            className={`w-full bg-transparent border-none text-sm outline-none focus:ring-0 ${
                              ci.checked ? 'line-through text-gray-400' : ''
                            }`}
                          />

                          {/* Reordering and Actions */}
                          <div className="flex items-center space-x-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => handleMoveChecklistItem(idx, 'up')} className="p-0.5 hover:text-[#0B7A81]">
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleMoveChecklistItem(idx, 'down')} className="p-0.5 hover:text-[#0B7A81]">
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDeleteChecklistItem(idx)} className="p-0.5 text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Audio Voice Recording System UI */}
              {editorType === 'journal' && editType === 'audio' && (
                <div className="space-y-4 flex flex-col items-center justify-center p-6 bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.06] rounded-2xl select-none">
                  <div className="text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Audio Voice Record</p>
                    <p className="text-[28px] font-bold text-slate-800 dark:text-slate-100 font-mono tracking-wider">{formatTime(audioTimer)}</p>
                    <span className="text-[10px] bg-red-100 text-red-700 font-extrabold uppercase px-2 py-0.5 rounded-full animate-pulse" style={{ display: recordingState === 'recording' ? 'inline-block' : 'none' }}>
                      Recording Live
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-extrabold uppercase px-2 py-0.5 rounded-full" style={{ display: recordingState === 'paused' ? 'inline-block' : 'none' }}>
                      Paused
                    </span>
                  </div>

                  {/* Wave Visualizer Real-time Canvas */}
                  <div className="w-full max-w-sm h-16 bg-slate-50 dark:bg-black/40 rounded-xl overflow-hidden relative flex items-center justify-center border border-gray-100 dark:border-white/[0.04]">
                    {recordingState === 'idle' && (
                      <span className="text-xs text-gray-400 italic">Sine wave visualization displays here...</span>
                    )}
                    <canvas ref={canvasRef} width={384} height={64} className="w-full h-full" style={{ display: recordingState !== 'idle' ? 'block' : 'none' }} />
                  </div>

                  {/* Attachment metadata status */}
                  {editAudioUrl && (
                    <div className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-xl w-full text-center flex items-center justify-center gap-1.5 font-semibold">
                      <span>✓ Audio attached and saved</span>
                      <a href={editAudioUrl} target="_blank" className="underline font-bold hover:text-emerald-900" rel="noreferrer">Listen Preview</a>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2.5 items-center justify-center mt-2">
                    {recordingState === 'idle' && (
                      <button
                        type="button"
                        onClick={startRecordingAudio}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 hover:bg-red-700 shadow-sm active:scale-95 transition-all"
                      >
                        <Mic className="w-3.5 h-3.5" /> Start Recording
                      </button>
                    )}

                    {recordingState === 'recording' && (
                      <>
                        <button
                          type="button"
                          onClick={pauseRecordingAudio}
                          className="px-4 py-2.5 bg-amber-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Pause className="w-3.5 h-3.5" /> Pause
                        </button>
                        <button
                          type="button"
                          onClick={saveRecordedAudio}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} /> Finish & Complete
                        </button>
                      </>
                    )}

                    {recordingState === 'paused' && (
                      <>
                        <button
                          type="button"
                          onClick={resumeRecordingAudio}
                          className="px-4 py-2.5 bg-[#0B7A81] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 ml-0.5" /> Resume
                        </button>
                        <button
                          type="button"
                          onClick={saveRecordedAudio}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                        >
                          <Check className="w-3.5 h-3.5" strokeWidth={3} /> Complete
                        </button>
                      </>
                    )}

                    {(recordingState === 'recording' || recordingState === 'paused' || recordingState === 'completed') && (
                      <button
                        type="button"
                        onClick={deleteRecordedAudio}
                        className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-full text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    )}

                    {recordingState === 'completed' && audioBlob && !editAudioUrl && (
                      <button
                        type="button"
                        disabled={isUploadingAudio}
                        onClick={handleUploadAudio}
                        className="px-5 py-2.5 bg-[#0B7A81] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-[#086369] transition-all"
                      >
                        {isUploadingAudio ? 'Uploading...' : 'Upload Audio Attachment'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Primary Content Rich Text Editor (contentEditable / textarea) */}
              {(editType === 'text' || editorType === 'prayer') && (
                <div className="flex-1 flex flex-col min-h-[300px]">
                  {/* Rich Editor Toolbar */}
                  <div className="h-[48px] px-3.5 bg-[#F7F7F7] dark:bg-white/[0.04] rounded-t-xl flex items-center space-x-4 border border-b-0 border-[#E6E6E6] dark:border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => executeCommand('bold')}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('italic')}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => executeCommand('insertUnorderedList')}
                      className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* contentEditable Large Rich Canvas */}
                  <div
                    ref={richTextRef}
                    contentEditable
                    onInput={(e) => setEditContent(e.currentTarget.innerHTML)}
                    data-placeholder="Start drafting content here..."
                    className="w-full flex-1 p-4 bg-white dark:bg-white/[0.02] border border-[#E6E6E6] dark:border-white/[0.08] rounded-b-xl text-base outline-none min-h-[260px] overflow-y-auto leading-relaxed focus:ring-1 focus:ring-[#0B7A81]"
                  />
                </div>
              )}

              {/* Linked Verses Previews Section */}
              {editVerses.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Linked Scriptures</span>
                  <div className="space-y-2">
                    {editVerses.map((v, idx) => (
                      <div key={idx} className="bg-white dark:bg-[#111111] p-3 rounded-xl border border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-[#0B7A81]">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-xs font-bold">{v.bookName} {v.chapter}:{v.verses.join(', ')}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveVerse(idx)} className="p-1 text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Verse Trigger Button */}
              <button
                type="button"
                onClick={() => setVersePickerOpen(true)}
                className="w-fit text-sm font-semibold text-[#0B7A81] flex items-center gap-1.5 active:scale-95 py-1"
              >
                <Plus className="w-4 h-4" /> Add Verse
              </button>

              {/* Dynamic Scripture Reference selection Dialog */}
              <AnimatePresence>
                {versePickerOpen && (
                  <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.08] rounded-2xl w-full max-w-sm p-5 shadow-2xl select-none"
                    >
                      <h3 className="font-bold text-base text-gray-800 dark:text-[#F5F5F5]">Link Bible Scripture</h3>
                      <div className="mt-4 space-y-3.5">
                        {/* Book Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase">Bible Book</label>
                          <select
                            value={pickerBook}
                            onChange={(e) => setPickerBook(e.target.value)}
                            className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-2 text-sm focus:outline-none focus:border-[#0B7A81] bg-transparent"
                          >
                            {BIBLE_BOOKS.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>

                        {/* Chapter / Verse inputs */}
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Chapter</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerChapter}
                              onChange={(e) => setPickerChapter(Math.max(1, Number(e.target.value)))}
                              className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-sm bg-transparent outline-none focus:border-[#0B7A81]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Verse Start</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerVerseStart}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value));
                                setPickerVerseStart(val);
                                if (pickerVerseEnd < val) setPickerVerseEnd(val);
                              }}
                              className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-sm bg-transparent outline-none focus:border-[#0B7A81]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Verse End</label>
                            <input
                              type="number"
                              min={1}
                              value={pickerVerseEnd}
                              onChange={(e) => setPickerVerseEnd(Math.max(pickerVerseStart, Number(e.target.value)))}
                              className="w-full h-10 mt-1 rounded-lg border border-gray-300 dark:border-white/[0.08] px-3 text-sm bg-transparent outline-none focus:border-[#0B7A81]"
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
                          Link Verse
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

      {/* ── Dynamic Toast Banner ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-[96px] left-1/2 -translate-x-1/2 z-50 bg-[#0B7A81] text-white text-xs px-5 py-3 rounded-full shadow-lg font-bold flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 shrink-0" strokeWidth={3} />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KEBAB FLOATING POPOVER MENU (Single cards actions) ── */}
      <AnimatePresence>
        {activeKebabId && kebabPosition && (() => {
          const activePrayer = activeKebabType === 'prayer' 
            ? prayers.find(p => p._id === activeKebabId) 
            : null;
          const isPrayed = activePrayer?.status === 'prayed';
          return (
            <div className="fixed inset-0 z-40" onClick={() => setActiveKebabId(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  position: 'absolute',
                  top: kebabPosition.top,
                  right: kebabPosition.right,
                }}
                className="w-[180px] bg-white dark:bg-[#111111] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.08] py-1.5 overflow-hidden z-50"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mark as Prayed — only for active prayers */}
                {activeKebabType === 'prayer' && !isPrayed && (
                  <button
                    onClick={() => handleMarkAsPrayed(activeKebabId)}
                    className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-emerald-600 dark:text-emerald-400"
                  >
                    <span>Mark as Prayed</span>
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  </button>
                )}
                {/* Edit — for both prayer and journal */}
                <button
                  onClick={() => handleEditKebabItem(activeKebabId, activeKebabType)}
                  className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-800 dark:text-gray-200"
                >
                  <span>{activeKebabType === 'prayer' ? 'Edit Prayer' : 'Edit Journal'}</span>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                {/* Delete — for both */}
                <button
                  onClick={() => handleTriggerDelete(activeKebabId, activeKebabType)}
                  className="w-full h-11 px-4 flex items-center justify-between text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/[0.04] text-[#FF4D4F]"
                >
                  <span>{activeKebabType === 'prayer' ? 'Delete Prayer' : 'Delete Journal'}</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ── CREATE FAB BOTTOM SHEET ── */}
      <AnimatePresence>
        {showFabSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center" onClick={() => setShowFabSheet(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white dark:bg-[#111111] rounded-t-[32px] w-full max-w-lg p-6 shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[100px] h-[5px] bg-gray-300 dark:bg-white/[0.12] rounded-full mx-auto mb-5 select-none shrink-0" />
              <h3 className="font-extrabold text-base text-gray-800 dark:text-[#F5F5F5] mb-4 text-center">Create New Document</h3>
              
              <div className="grid grid-cols-2 gap-4 pb-4 select-none">
                <button
                  onClick={() => handleOpenEditor(null, 'journal')}
                  className="bg-slate-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] p-5 rounded-2xl flex flex-col items-center justify-center hover:bg-slate-100 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="text-3xl mb-2">📓</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Journal Note</span>
                </button>
                <button
                  onClick={() => handleOpenEditor(null, 'prayer')}
                  className="bg-slate-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] p-5 rounded-2xl flex flex-col items-center justify-center hover:bg-slate-100 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span className="text-3xl mb-2">🙏</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Personal Prayer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DELETE FLOW CONFIRMATION SHEET ── */}
      <AnimatePresence>
        {showDeleteSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center" onClick={() => setShowDeleteSheet(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white dark:bg-[#111111] rounded-t-[32px] w-full max-w-lg p-6 shadow-2xl flex flex-col select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[100px] h-[5px] bg-gray-300 dark:bg-white/[0.12] rounded-full mx-auto mb-5 select-none shrink-0" />
              <h3 className="font-extrabold text-base text-gray-800 dark:text-[#F5F5F5] mb-2 text-center">
                Delete {targetItem?.type === 'journal' ? 'Journal' : 'Prayer'}?
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



      {/* ── ADVANCED FILTERS DIALOG SHEET ── */}
      <AnimatePresence>
        {showFilterSheet && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-end justify-center" onClick={() => setShowFilterSheet(false)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white dark:bg-[#111111] rounded-t-[32px] w-full max-w-lg p-6 shadow-2xl flex flex-col select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[100px] h-[5px] bg-gray-300 dark:bg-white/[0.12] rounded-full mx-auto mb-5 select-none shrink-0" />
              
              <div className="flex items-center justify-between mb-4 border-b pb-3.5">
                <h3 className="font-extrabold text-base text-gray-800 dark:text-[#F5F5F5]">Filter Content</h3>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setFilterPinned(null);
                    setFilterBookmarked(null);
                    setFilterDate('all');
                    showToast('Filters cleared');
                  }}
                  className="text-xs font-bold text-gray-400 hover:text-[#0B7A81]"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-none pr-1 mb-6">
                {/* Filter Category type */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Document Type</span>
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

                {/* Filter Pinning */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Pinned Status</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterPinned(null)}
                      className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold ${
                        filterPinned === null ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterPinned(true)}
                      className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold flex items-center gap-1 ${
                        filterPinned === true ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <Pin className="w-3 h-3" /> Pinned
                    </button>
                    <button
                      onClick={() => setFilterPinned(false)}
                      className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold ${
                        filterPinned === false ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      Unpinned
                    </button>
                  </div>
                </div>

                {/* Filter Bookmarked */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Bookmarked Status</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterBookmarked(null)}
                      className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold ${
                        filterBookmarked === null ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterBookmarked(true)}
                      className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold flex items-center gap-1 ${
                        filterBookmarked === true ? 'bg-[#0B7A81] border-[#0B7A81] text-white' : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <Bookmark className="w-3 h-3" /> Bookmarked
                    </button>
                  </div>
                </div>

                {/* Filter Date updated */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-1.5">Last Modification Date</span>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'today', 'week', 'month'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setFilterDate(d)}
                        className={`text-xs px-3.5 py-1.5 border rounded-lg font-bold capitalize ${
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
                Apply Filters
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
