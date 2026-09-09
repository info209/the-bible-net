'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiSearch } from 'react-icons/fi';
import { X, Clock, Trash2, BookOpen, ChevronRight, Heart, Loader2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BibleOfflineService } from '@/lib/offline/BibleOfflineService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BookSearchResult {
    mode: 'book';
    book: string;
    displayName?: string;
    abbreviation: string;
    testament: string;
    totalChapters: number;
    chapters: number[];
    focusChapter?: number;
}

interface ExactVerseResult {
    mode: 'exact';
    reference: string;
    book: string;
    chapter: number;
    verse: number;
    text: string;
    versionCode: string;
    themes: string[];
    emotions: string[];
    availableVersions: { versionCode: string; text: string }[];
}

interface EmotionResult {
    mode: 'emotion';
    emotion: string;
    total: number;
    results: {
        verseId: string;
        reference: string;
        displayReference?: string;
        text: string;
        versionCode: string;
        emotions: string[];
        themes: string[];
    }[];
}

interface HybridResult {
    mode: 'hybrid';
    results: {
        verseId: string;
        number: number;
        text: string;
        book: { name: string; abbreviation: string; displayName?: string };
        chapter: { number: number };
        version: { abbreviation: string; name: string };
        emotions: string[];
        themes: string[];
    }[];
    total: number;
    query: string;
}

type SearchData = BookSearchResult | ExactVerseResult | EmotionResult | HybridResult | null;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BibleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Currently active version abbreviation (e.g. "KJV") — used as default for exact verse lookup */
    activeVersionCode?: string;
    /** Called when user taps a book chapter chip → navigate reader */
    onNavigateToChapter: (book: string, chapter: number) => void;
    /** Called when user taps "Read Full Chapter" on an exact verse card */
    onNavigateToVerse: (book: string, chapter: number, verse: number, version?: string) => void;
    isDark?: boolean;
    selectedTheme?: 'light' | 'sepia' | 'cream' | 'dark';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEARCH_HISTORY_KEY = 'bible_search_history_v2';
const MAX_HISTORY = 10;
const DEBOUNCE_MS = 250;

const EMOTION_EMOJI: Record<string, string> = {
    joy: '😊', peace: '🕊️', hope: '🌟', faith: '✝️', fear: '😰',
    anxiety: '😟', depression: '💙', loneliness: '🕯️', love: '❤️',
    anger: '🔥', grief: '💧', sorrow: '💧', comfort: '🤗',
    strength: '💪', courage: '🦁', trust: '🙏', forgiveness: '🤍',
    gratitude: '🌸', praise: '🎵', worship: '✨', patience: '⏳',
    wisdom: '💡', humility: '🌱', guilt: '😔', shame: '😞',
    healing: '🌿', rest: '😴', refuge: '🏔️', protection: '🛡️',
    salvation: '🌊', doubt: '❓', suffering: '💔', perseverance: '⚡',
    grace: '🌺', mercy: '🕊️', righteousness: '⚖️', holiness: '🕊️',
};

// ---------------------------------------------------------------------------
// Theme helpers
// ---------------------------------------------------------------------------

function useThemeVars(theme: 'light' | 'sepia' | 'cream' | 'dark') {
    return {
        backdropBg: { light: 'rgba(0,0,0,0.3)', sepia: 'rgba(0,0,0,0.45)', cream: 'rgba(0,0,0,0.45)', dark: 'rgba(0,0,0,0.85)' }[theme],
        backdropBlur: 'blur(6px)',
        modalBg: { light: 'rgba(255,255,255,0.97)', sepia: 'rgba(250,240,227,0.98)', cream: 'rgba(253,246,235,0.98)', dark: 'rgba(24,24,26,0.98)' }[theme],
        borderCol: { light: 'rgba(0,0,0,0.08)', sepia: 'rgba(92,74,58,0.15)', cream: 'rgba(74,63,42,0.15)', dark: 'rgba(255,255,255,0.1)' }[theme],
        innerBorder: { light: 'rgba(0,0,0,0.07)', sepia: 'rgba(92,74,58,0.12)', cream: 'rgba(74,63,42,0.12)', dark: 'rgba(255,255,255,0.07)' }[theme],
        textCol: { light: '#1f2937', sepia: '#5c4a3a', cream: '#4a3f2a', dark: '#e5e7e7' }[theme],
        subText: { light: '#6b7280', sepia: '#7d6855', cream: '#6e5f46', dark: 'rgba(255,255,255,0.42)' }[theme],
        hoverBg: { light: 'rgba(0,0,0,0.04)', sepia: 'rgba(92,74,58,0.07)', cream: 'rgba(74,63,42,0.07)', dark: 'rgba(255,255,255,0.07)' }[theme],
        cardBg: { light: '#ffffff', sepia: 'rgba(92,74,58,0.04)', cream: 'rgba(74,63,42,0.04)', dark: 'rgba(255,255,255,0.04)' }[theme],
        cardBorder: { light: 'rgba(0,0,0,0.08)', sepia: 'rgba(92,74,58,0.1)', cream: 'rgba(74,63,42,0.1)', dark: 'rgba(255,255,255,0.07)' }[theme],
        chipBg: { light: '#f3f4f6', sepia: 'rgba(92,74,58,0.1)', cream: 'rgba(74,63,42,0.09)', dark: 'rgba(255,255,255,0.09)' }[theme],
        chipBorder: { light: '#e5e7eb', sepia: 'rgba(92,74,58,0.2)', cream: 'rgba(74,63,42,0.2)', dark: 'rgba(255,255,255,0.12)' }[theme],
        inputBg: { light: 'rgba(0,0,0,0.03)', sepia: 'rgba(92,74,58,0.05)', cream: 'rgba(74,63,42,0.05)', dark: 'rgba(255,255,255,0.05)' }[theme],
        accent: '#E23744',
        accentLight: 'rgba(226,55,68,0.12)',
    };
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function SkeletonBook() {
    return (
        <div className="p-4 animate-pulse space-y-4">
            <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-gray-200" />
                <div className="h-6 w-32 rounded-lg bg-gray-200" />
                <div className="h-4 w-20 rounded-full bg-gray-100" />
            </div>
            <div className="h-3 w-40 rounded bg-gray-100" />
            <div className="flex gap-2">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-200" />
                ))}
            </div>
        </div>
    );
}

function SkeletonVerse() {
    return (
        <div className="p-4 animate-pulse space-y-3">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-100" />
            <div className="h-4 w-5/6 rounded bg-gray-100" />
            <div className="h-4 w-3/4 rounded bg-gray-100" />
        </div>
    );
}

function SkeletonList({ count = 4 }: { count?: number }) {
    return (
        <div className="p-4 space-y-3 animate-pulse">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-gray-100 space-y-2">
                    <div className="h-4 w-24 rounded bg-gray-200" />
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-4/5 rounded bg-gray-100" />
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Book Mode UI
// ---------------------------------------------------------------------------

function BookModeView({
    data,
    theme: t,
    onChapterTap,
}: {
    data: BookSearchResult;
    theme: ReturnType<typeof useThemeVars>;
    onChapterTap: (chapter: number) => void;
}) {
    const chipRowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (data.focusChapter && chipRowRef.current) {
            const chip = chipRowRef.current.querySelector(
                `[data-chapter="${data.focusChapter}"]`
            ) as HTMLElement | null;
            chip?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
        }
    }, [data.focusChapter]);

    return (
        <div className="p-4">
            {/* Book title */}
            <div className="flex items-center gap-2 mb-1">
                <BookOpen size={18} style={{ color: t.accent }} />
                <h2 className="text-xl font-bold" style={{ color: t.textCol }}>
                    {data.displayName || data.book}
                </h2>
                <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest"
                    style={{ backgroundColor: t.accentLight, color: t.accent }}
                >
                    {data.testament === 'OT' ? 'Old Testament' : 'New Testament'}
                </span>
            </div>
            <p className="text-xs mb-4" style={{ color: t.subText }}>
                {data.totalChapters} chapter{data.totalChapters !== 1 ? 's' : ''} · tap to open
            </p>

            {/* Chapter chips — horizontal scroll */}
            <div
                ref={chipRowRef}
                className="flex gap-2 overflow-x-auto pb-2"
                style={{ scrollbarWidth: 'none' }}
            >
                {data.chapters.map(ch => {
                    const isFocus = ch === data.focusChapter;
                    return (
                        <button
                            key={ch}
                            data-chapter={ch}
                            onClick={() => onChapterTap(ch)}
                            className="flex-shrink-0 w-11 h-11 rounded-xl text-sm font-bold transition-all duration-150 hover:scale-105 active:scale-95"
                            style={{
                                backgroundColor: isFocus ? t.accent : t.chipBg,
                                color: isFocus ? '#ffffff' : t.textCol,
                                border: `1.5px solid ${isFocus ? t.accent : t.chipBorder}`,
                                boxShadow: isFocus ? '0 2px 8px rgba(226,55,68,0.35)' : 'none',
                            }}
                        >
                            {ch}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Exact Verse Mode UI
// ---------------------------------------------------------------------------

function ExactVerseModeView({
    data,
    theme: t,
    onVersionChange,
    onReadChapter,
}: {
    data: ExactVerseResult;
    theme: ReturnType<typeof useThemeVars>;
    onVersionChange: (versionCode: string) => void;
    onReadChapter: () => void;
}) {
    return (
        <div className="p-4">
            <p className="text-xs font-bold tracking-widest mb-2" style={{ color: t.accent }}>
                {data.reference}
            </p>
            <blockquote
                className="text-base leading-relaxed mb-4 pl-3 border-l-2"
                style={{ color: t.textCol, borderColor: t.accent, whiteSpace: 'pre-line' }}
            >
                {data.text}
            </blockquote>

            {data.availableVersions.length > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: t.subText }}>
                        Version
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {data.availableVersions.map(v => {
                            const isActive = v.versionCode === data.versionCode;
                            return (
                                <button
                                    key={v.versionCode}
                                    onClick={() => onVersionChange(v.versionCode)}
                                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 hover:scale-105 active:scale-95"
                                    style={{
                                        backgroundColor: isActive ? t.accent : t.chipBg,
                                        color: isActive ? '#ffffff' : t.textCol,
                                        border: `1.5px solid ${isActive ? t.accent : t.chipBorder}`,
                                    }}
                                >
                                    {v.versionCode}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {(data.emotions.length > 0 || data.themes.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {[...data.emotions, ...data.themes].slice(0, 6).map(tag => (
                        <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                            style={{ backgroundColor: t.accentLight, color: t.accent }}
                        >
                            {EMOTION_EMOJI[tag] ?? '📖'} {tag}
                        </span>
                    ))}
                </div>
            )}

            <button
                onClick={onReadChapter}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: t.accent, color: '#ffffff' }}
            >
                <BookOpen size={15} />
                Read Full Chapter
                <ChevronRight size={15} />
            </button>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Emotion Mode UI
// ---------------------------------------------------------------------------

function EmotionModeView({
    data,
    theme: t,
    onVerseClick,
}: {
    data: EmotionResult;
    theme: ReturnType<typeof useThemeVars>;
    onVerseClick: (ref: string, versionCode: string) => void;
}) {
    const emoji = EMOTION_EMOJI[data.emotion] ?? '📖';
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{emoji}</span>
                <div>
                    <h2 className="text-base font-bold capitalize" style={{ color: t.textCol }}>{data.emotion}</h2>
                    <p className="text-xs" style={{ color: t.subText }}>{data.total} verse{data.total !== 1 ? 's' : ''} found</p>
                </div>
            </div>
            <div className="space-y-3">
                {data.results.map((r, i) => (
                    <button
                        key={`${r.verseId}-${i}`}
                        onClick={() => onVerseClick(r.reference, r.versionCode)}
                        className="w-full text-left p-3.5 rounded-xl border flex gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                        style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                    >
                        <Heart size={14} className="flex-shrink-0 mt-1" style={{ color: t.accent }} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold" style={{ color: t.accent }}>{r.displayReference || r.reference}</span>
                                {r.versionCode && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-bold"
                                        style={{ borderColor: t.chipBorder, color: t.subText }}>
                                        {r.versionCode}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs leading-relaxed line-clamp-3" style={{ color: t.textCol }}>{r.text}</p>
                        </div>
                    </button>
                ))}
                {data.total === 0 && (
                    <p className="text-center py-8 text-sm" style={{ color: t.subText }}>
                        No verses tagged with "{data.emotion}" found yet.
                    </p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hybrid Mode UI
// ---------------------------------------------------------------------------

function HybridModeView({
    data,
    theme: t,
    query,
    onVerseClick,
}: {
    data: HybridResult;
    theme: ReturnType<typeof useThemeVars>;
    query: string;
    onVerseClick: (book: string, chapter: number, verse: number, version?: string) => void;
}) {
    const highlightText = (text: string, q: string) => {
        if (!q.trim()) return text;
        const terms = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        const escaped = terms.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        let out = text;
        for (const term of escaped) {
            out = out.replace(
                new RegExp(`(${term})`, 'gi'),
                '<mark style="background:rgba(226,55,68,0.18);color:inherit;border-radius:2px;padding:0 1px">$1</mark>',
            );
        }
        return out;
    };

    if (data.results.length === 0) {
        return (
            <div className="text-center py-12" style={{ color: t.subText }}>
                <FiSearch size={40} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold">No results for "{query}"</p>
                <p className="text-xs mt-1">Try a different keyword or check spelling</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            <p className="text-[10px] font-bold tracking-wider" style={{ color: t.subText }}>
                {data.total} result{data.total !== 1 ? 's' : ''}
            </p>
            {data.results.slice(0, 50).map((r, i) => (
                <button
                    key={`${r.book?.name}-${r.chapter?.number}-${r.number}-${i}`}
                    onClick={() => onVerseClick(r.book?.name, r.chapter?.number, r.number, r.version?.abbreviation)}
                    className="w-full text-left p-3.5 rounded-xl border flex gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.99]"
                    style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
                >
                    <BookOpen size={14} className="flex-shrink-0 mt-1" style={{ color: t.accent }} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold" style={{ color: t.accent }}>
                                {r.book?.displayName || r.book?.name} {r.chapter?.number}:{r.number}
                            </span>
                            {r.version?.abbreviation && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase tracking-widest font-bold"
                                    style={{ borderColor: t.chipBorder, color: t.subText }}>
                                    {r.version.abbreviation}
                                </span>
                            )}
                        </div>
                        <p className="text-xs leading-relaxed line-clamp-3"
                            style={{ color: t.textCol }}
                            dangerouslySetInnerHTML={{ __html: highlightText(r.text, query) }}
                        />
                    </div>
                </button>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Modal
// ---------------------------------------------------------------------------

export default function BibleSearchModal({
    isOpen,
    onClose,
    activeVersionCode,
    onNavigateToChapter,
    onNavigateToVerse,
    isDark = false,
    selectedTheme,
}: BibleSearchModalProps) {
    const theme = selectedTheme ?? (isDark ? 'dark' : 'light');
    const t = useThemeVars(theme);
    const { toast } = useToast();

    const queryClient = useQueryClient();
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [history, setHistory] = useState<string[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    // Load history on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
            if (saved) setHistory(JSON.parse(saved));
        } catch { /* noop */ }
    }, []);

    // Debounce effect
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query.trim());
        }, DEBOUNCE_MS);
        return () => clearTimeout(handler);
    }, [query]);

    // Focus input when modal opens; reset when it closes
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 80);
        } else {
            setQuery('');
            setDebouncedQuery('');
        }
    }, [isOpen]);

    const { data: searchResultsData, isFetching: isRefreshing, isLoading } = useQuery({
        queryKey: ['bible-search', debouncedQuery, activeVersionCode],
        queryFn: async ({ signal }) => {
            const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
            if (!isOnline) {
                return await BibleOfflineService.searchOffline(debouncedQuery, activeVersionCode);
            }

            try {
                const params = new URLSearchParams({ q: debouncedQuery, limit: '50' });
                if (activeVersionCode) params.set('versionCode', activeVersionCode);

                const res = await fetch(`/api/v1/bible/search?${params}`, { signal });
                const json = await res.json();
                if (!json.success || !json.data) {
                    if (json.error) {
                        const isCompleteReference = /^[1-3]?\s*[a-zA-Z\s]+?\s+\d+\s*:\s*\d+(?:\s*-\s*\d+)?$/.test(debouncedQuery);
                        if (isCompleteReference) {
                            toast.error(json.error);
                        }
                    }
                    return await BibleOfflineService.searchOffline(debouncedQuery, activeVersionCode);
                }
                return json.data;
            } catch (err: any) {
                if (err?.name === 'AbortError') throw err;
                return await BibleOfflineService.searchOffline(debouncedQuery, activeVersionCode);
            }
        },
        enabled: debouncedQuery.length >= 2,
        staleTime: 5 * 60 * 1000, // 5 minutes cache
    });

    const searchData = searchResultsData || null;

    // History helpers
    const addHistory = (q: string) => {
        if (!q.trim()) return;
        const next = [q, ...history.filter(h => h !== q)].slice(0, MAX_HISTORY);
        setHistory(next);
        try { localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)); } catch { /* noop */ }
    };

    const clearHistory = () => {
        setHistory([]);
        try { localStorage.removeItem(SEARCH_HISTORY_KEY); } catch { /* noop */ }
    };

    const clearQuery = () => {
        setQuery('');
        setDebouncedQuery('');
        inputRef.current?.focus();
    };

    // Navigation handlers
    const handleChapterTap = (chapter: number) => {
        const data = searchData as BookSearchResult;
        addHistory(query);
        onNavigateToChapter(data.book, chapter);
        onClose();
    };

    const handleVersionChange = (versionCode: string) => {
        if (searchData?.mode !== 'exact') return;
        const ev = searchData as ExactVerseResult;
        const match = ev.availableVersions.find(v => v.versionCode === versionCode);
        if (match) {
            queryClient.setQueryData(
                ['bible-search', debouncedQuery, activeVersionCode],
                { ...ev, text: match.text, versionCode: match.versionCode }
            );
        }
    };

    const handleReadChapter = () => {
        if (searchData?.mode !== 'exact') return;
        const ev = searchData as ExactVerseResult;
        addHistory(query);
        onNavigateToVerse(ev.book, ev.chapter, ev.verse, ev.versionCode);
        onClose();
    };

    const handleEmotionVerseClick = (reference: string, versionCode: string) => {
        const m = reference.match(/^(.+?)\s+(\d+):(\d+)$/);
        if (m) {
            addHistory(query);
            onNavigateToVerse(m[1], parseInt(m[2]), parseInt(m[3]), versionCode);
            onClose();
        }
    };

    const handleHybridVerseClick = (book: string, chapter: number, verse: number, version?: string) => {
        addHistory(query);
        onNavigateToVerse(book, chapter, verse, version);
        onClose();
    };

    if (!isOpen) return null;

    // Determine what content area shows
    const hasQuery = query.trim().length >= 2;
    const showSkeleton = isLoading && !searchData;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-start justify-center"
            style={{ backgroundColor: t.backdropBg, backdropFilter: t.backdropBlur }}
            onClick={onClose}
        >
            <div
                className="absolute top-14 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-[620px] rounded-lg shadow-2xl max-h-[82vh] flex flex-col overflow-hidden border"
                style={{ backgroundColor: t.modalBg, borderColor: t.borderCol }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Search input bar ────────────────────────────────── */}
                <div
                    className="flex items-center gap-3 px-4 py-3 border-b"
                    style={{ borderColor: t.innerBorder, backgroundColor: t.modalBg }}
                >
                    {isRefreshing
                        ? <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: t.accent }} />
                        : <FiSearch size={18} style={{ color: t.subText, flexShrink: 0 }} />
                    }
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && query.trim()) {
                                addHistory(query.trim());
                                setDebouncedQuery(query.trim());
                            }
                            if (e.key === 'Escape') onClose();
                        }}
                        placeholder="Search books, John 3:16, joy, fear…"
                        className="flex-1 bg-transparent outline-none text-[16px] md:text-sm font-medium"
                        style={{ color: t.textCol }}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                    />
                    {query && (
                        <button
                            onClick={clearQuery}
                            className="p-1 rounded-full transition-colors"
                            style={{ backgroundColor: t.hoverBg }}
                            aria-label="Clear search"
                        >
                            <X size={15} style={{ color: t.subText }} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: t.hoverBg }}
                        aria-label="Close search"
                    >
                        <X size={17} style={{ color: t.subText }} />
                    </button>
                </div>

                {/* ── Content area ────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto overscroll-contain">

                    {/* First-load skeleton */}
                    {showSkeleton && (
                        <>
                            <SkeletonBook />
                            <SkeletonVerse />
                        </>
                    )}

                    {/* ── Mode-specific views — shown whenever data exists ── */}
                    {/* Note: NOT gated by isLoading/isRefreshing so results always show */}

                    {searchData?.mode === 'book' && (
                        <BookModeView
                            data={searchData as BookSearchResult}
                            theme={t}
                            onChapterTap={handleChapterTap}
                        />
                    )}

                    {searchData?.mode === 'exact' && (
                        <ExactVerseModeView
                            data={searchData as ExactVerseResult}
                            theme={t}
                            onVersionChange={handleVersionChange}
                            onReadChapter={handleReadChapter}
                        />
                    )}

                    {searchData?.mode === 'emotion' && (
                        <EmotionModeView
                            data={searchData as EmotionResult}
                            theme={t}
                            onVerseClick={handleEmotionVerseClick}
                        />
                    )}

                    {searchData?.mode === 'hybrid' && (
                        <HybridModeView
                            data={searchData as HybridResult}
                            theme={t}
                            query={query}
                            onVerseClick={handleHybridVerseClick}
                        />
                    )}

                    {/* ── No-results state (query present, search done, nothing found) ── */}
                    {hasQuery && !isLoading && !searchData && (
                        <div className="text-center py-12" style={{ color: t.subText }}>
                            <FiSearch size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-semibold">No results for "{query.trim()}"</p>
                            <p className="text-xs mt-1">Try a different keyword or check spelling</p>
                        </div>
                    )}

                    {/* ── Search history (empty query state) ── */}
                    {!hasQuery && history.length > 0 && (
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold tracking-wider" style={{ color: t.subText }}>Recent</h3>
                                <button
                                    onClick={clearHistory}
                                    className="flex items-center gap-1 text-xs font-bold"
                                    style={{ color: t.accent }}
                                >
                                    <Trash2 size={12} /> Clear
                                </button>
                            </div>
                            <div className="space-y-0.5">
                                {history.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setQuery(item)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                                        style={{ color: t.textCol }}
                                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = t.hoverBg)}
                                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                                    >
                                        <Clock size={13} style={{ color: t.subText, flexShrink: 0 }} />
                                        <span className="text-sm">{item}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Empty state (no query, no history) ── */}
                    {!hasQuery && history.length === 0 && (
                        <div className="py-16 text-center px-8" style={{ color: t.subText }}>
                            <FiSearch size={44} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-semibold mb-1">Search the Bible</p>
                            <p className="text-xs leading-relaxed opacity-75">
                                Try <span style={{ color: t.accent }}>"Psalms"</span> for a book,{' '}
                                <span style={{ color: t.accent }}>"John 3:16"</span> for a verse, or{' '}
                                <span style={{ color: t.accent }}>"joy"</span> for themed results
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
