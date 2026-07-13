import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Forward, MessageCircle, MoreVertical, CheckCircle2, CheckCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LikeButton } from './LikeButton';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from '@/context/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum seconds the devotional must be open before auto-completion fires */
const AUTO_COMPLETE_TIME_GATE_SECONDS = 30;

/** Fraction of scroll height that must be reached to trigger auto-completion */
const AUTO_COMPLETE_SCROLL_THRESHOLD = 0.90;

const CONTENT_TYPE = 'dailyDevotional';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProgressStatus = 'INCOMPLETE' | 'IN_PROGRESS' | 'COMPLETED';

interface DevotionalProgress {
    status: ProgressStatus;
    startedAt?: string | null;
    completedAt?: string | null;
}

interface IDailyContent {
    _id?: string;
    date: string;
    verse: string;
    verseReference: string;
    devotionalTitle?: string;
    devotionalContent?: string;
    // Legacy single-ref fields
    devotionalVerseRef?: string;
    devotionalVerseText?: string;
    // New: multiple resolved verse blocks
    devotionalVerseBlocks?: Array<{ ref: string; text: string }>;
    prayerTitle?: string;
    prayerContent?: string;
    backgroundImage?: string;
    devotionalBackgroundImage?: string;
    verseLikeCount?: number;
    devotionLikeCount?: number;
    isVerseLiked?: boolean;
    isDevotionLiked?: boolean;
    devotionCommentCount?: number;
    verseCommentCount?: number;
    verseShareCount?: number;
    devotionShareCount?: number;
    /** Progress enriched by /api/daily */
    devotionalProgress?: DevotionalProgress;
}

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    contents: IDailyContent[];
    initialIndex: number;
    initialSection?: 'verse' | 'devotional' | 'prayer';
    onCommentClick?: (contentId: string, type: 'daily-verse' | 'daily-devotion') => void;
    onShareClick?: (content: any, type: 'daily-verse' | 'daily-devotion') => void;
    onReadFullChapter?: (content: any) => void;
    /** Callback so HomeView can update its local cache after progress changes */
    onProgressChange?: (date: string, status: ProgressStatus) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getOrdinalSuffix = (day: number): string => {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
};

const formatVerseLabel = (dateStr: string): string => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Verse of the Day';
    const d = new Date(dateStr);
    const dayOfWeek = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month}`;
};

const formatDevotionLabel = (dateStr: string): string => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Devotion of the Day';
    const d = new Date(dateStr);
    const dayOfWeek = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month}`;
};

const getRelativeLabel = (dateStr: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';
    const contentDate = new Date(dateStr);
    const today = new Date(todayStr);
    const diffTime = Math.abs(today.getTime() - contentDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} Days Ago`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function DailyDetailModal({
    isOpen,
    onClose,
    contents,
    initialIndex,
    initialSection,
    onCommentClick,
    onShareClick,
    onReadFullChapter,
    onProgressChange,
}: DailyDetailModalProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const isAuthenticated = !!session?.user;

    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);
    const [openKebab, setOpenKebab] = React.useState(false);

    // Swipe gesture state
    const swipeStartXRef = useRef(0);
    const swipeStartYRef = useRef(0);
    const swipeStartTimeRef = useRef(0);
    const swipeIsHorizontalRef = useRef<boolean | null>(null);
    const swipeIsDraggingRef = useRef(false);

    // Progress state — keyed by date so switching days works correctly
    const [progressByDate, setProgressByDate] = React.useState<Record<string, ProgressStatus>>({});
    const [progressLoading, setProgressLoading] = React.useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const openedAtRef = useRef<number>(0);
    const hasAutoCompletedRef = useRef<Record<string, boolean>>({});

    const currentContent = contents[currentIndex];
    const currentDate = currentContent?.date;
    const currentProgress = progressByDate[currentDate] ?? currentContent?.devotionalProgress?.status ?? 'INCOMPLETE';

    // ── Derived: weekly completion count ─────────────────────────────────────
    const weeklyCompletedCount = React.useMemo(() => {
        let count = 0;
        for (const content of contents) {
            const status = progressByDate[content.date] ?? content.devotionalProgress?.status ?? 'INCOMPLETE';
            if (status === 'COMPLETED') count++;
        }
        return count;
    }, [contents, progressByDate]);

    // ── Hydrate progress from API data ────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || initialSection !== 'devotional') return;

        // Seed from enriched API data (instant, no extra request)
        const seed: Record<string, ProgressStatus> = {};
        for (const c of contents) {
            if (c.devotionalProgress?.status) {
                seed[c.date] = c.devotionalProgress.status;
            }
        }
        if (Object.keys(seed).length > 0) {
            setProgressByDate(prev => ({ ...seed, ...prev }));
        }
    }, [isOpen, initialSection, contents]);

    // ── Reset scroll + timers when switching day or opening ──────────────────
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            openedAtRef.current = Date.now();

            setTimeout(() => {
                if (scrollRef.current) {
                    const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
                    if (scrollContainer) {
                        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }
            }, 300);
        }
    }, [isOpen, initialIndex, initialSection]);

    // Reset timer when switching days in devotional view
    useEffect(() => {
        openedAtRef.current = Date.now();
    }, [currentIndex]);

    // ── Progress API call ─────────────────────────────────────────────────────
    const updateProgress = useCallback(
        async (date: string, newStatus: ProgressStatus) => {
            if (!isAuthenticated || !date) return;

            // Prevent regression
            const current = progressByDate[date] ?? 'INCOMPLETE';
            const rank: Record<ProgressStatus, number> = { INCOMPLETE: 0, IN_PROGRESS: 1, COMPLETED: 2 };
            if (rank[newStatus] <= rank[current] && current === newStatus) return;
            if (rank[newStatus] < rank[current]) return;

            // Optimistic update
            setProgressByDate(prev => ({ ...prev, [date]: newStatus }));
            onProgressChange?.(date, newStatus);

            try {
                const res = await fetch('/api/user/content-progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contentType: CONTENT_TYPE, date, status: newStatus }),
                });
                if (!res.ok) {
                    console.error('[progress update] Server responded with', res.status);
                    // Silently keep optimistic state — better UX than reverting
                }
            } catch (err) {
                console.error('[progress update] Network error:', err);
                // Silently keep optimistic state
            }
        },
        [isAuthenticated, progressByDate, onProgressChange]
    );

    // ── Scroll-based auto-completion ──────────────────────────────────────────
    useEffect(() => {
        if (!isOpen || initialSection !== 'devotional') return;

        const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (!scrollContainer) return;

        const handleScroll = () => {
            const date = currentDate;
            if (!date) return;
            if (progressByDate[date] === 'COMPLETED') return;
            if (hasAutoCompletedRef.current[date]) return;

            const el = scrollContainer as HTMLElement;
            const scrolledFraction = (el.scrollTop + el.clientHeight) / (el.scrollHeight || 1);
            const elapsedSeconds = (Date.now() - openedAtRef.current) / 1000;

            if (
                scrolledFraction >= AUTO_COMPLETE_SCROLL_THRESHOLD &&
                elapsedSeconds >= AUTO_COMPLETE_TIME_GATE_SECONDS
            ) {
                hasAutoCompletedRef.current[date] = true;
                updateProgress(date, 'COMPLETED');
            }
        };

        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [isOpen, initialSection, currentDate, progressByDate, updateProgress]);

    // ── Speech synthesis ──────────────────────────────────────────────────────
    const getNarrationText = useCallback(() => {
        if (!currentContent) return '';
        if (initialSection === 'verse') {
            const parts = ['Daily Verse'];
            if (currentContent.verseReference) parts.push(currentContent.verseReference);
            if (currentContent.verse) parts.push(currentContent.verse);
            return parts.join('. ');
        } else if (initialSection === 'devotional') {
            const parts = [];

            // Multi-ref verse blocks (new)
            if (currentContent.devotionalVerseBlocks && currentContent.devotionalVerseBlocks.length > 0) {
                for (const block of currentContent.devotionalVerseBlocks) {
                    if (block.ref) parts.push(block.ref);
                    if (block.text) parts.push(block.text);
                }
            } else {
                // Legacy fallback
                if (currentContent.devotionalVerseRef) {
                    parts.push('Devotional Verse');
                    parts.push(currentContent.devotionalVerseRef);
                }
                if (currentContent.devotionalVerseText) {
                    parts.push(currentContent.devotionalVerseText);
                }
            }

            if (currentContent.devotionalTitle) {
                parts.push('Devotional Reading');
                parts.push(currentContent.devotionalTitle);
            }
            if (currentContent.devotionalContent) {
                parts.push(currentContent.devotionalContent);
            }
            if (currentContent.prayerContent) {
                parts.push('Daily Prayer');
                if (currentContent.prayerTitle) parts.push(currentContent.prayerTitle);
                parts.push(currentContent.prayerContent);
            }
            return parts.join('. ');
        }
        return '';
    }, [currentContent, initialSection]);

    const stopNarration = useCallback(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
    }, []);

    const handlePlayPause = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        const synth = window.speechSynthesis;

        if (isSpeaking) {
            if (isPaused) {
                synth.resume();
                setIsPaused(false);
            } else {
                synth.pause();
                setIsPaused(true);
            }
        } else {
            synth.cancel();
            const textToSpeak = getNarrationText();
            if (!textToSpeak) return;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);

            utterance.onstart = () => {
                // Audio actually started — transition INCOMPLETE → IN_PROGRESS
                if (initialSection === 'devotional' && currentDate) {
                    const current = progressByDate[currentDate] ?? currentContent?.devotionalProgress?.status ?? 'INCOMPLETE';
                    if (current === 'INCOMPLETE') {
                        updateProgress(currentDate, 'IN_PROGRESS');
                    }
                }
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
            };

            utterance.onerror = () => {
                // Playback failed — do NOT transition to IN_PROGRESS
                setIsSpeaking(false);
                setIsPaused(false);
            };

            setIsSpeaking(true);
            setIsPaused(false);
            synth.speak(utterance);
        }
    };

    // ── Complete button handler ───────────────────────────────────────────────
    const handleCompleteDevotional = useCallback(() => {
        if (!isAuthenticated) {
            // Show login prompt (same pattern as verse highlight menu)
            toast.info('Sign in to track your devotional progress');
            setTimeout(() => {
                router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
            }, 800);
            return;
        }

        if (!currentDate) return;
        if (currentProgress === 'COMPLETED') return; // already done — idempotent guard

        updateProgress(currentDate, 'COMPLETED');
        toast.success('Devotional completed! Keep it up 🙏');
    }, [isAuthenticated, currentDate, currentProgress, updateProgress, router]);

    // Stop speaking when day, content, or section changes
    useEffect(() => {
        stopNarration();
    }, [currentIndex, initialSection, stopNarration]);

    useEffect(() => {
        if (!isOpen) stopNarration();
    }, [isOpen, stopNarration]);

    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    if (!isOpen || contents.length === 0) return null;

    // ── Swipe navigation ──────────────────────────────────────────────────────
    const handleSwipeStart = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        swipeStartXRef.current = e.clientX;
        swipeStartYRef.current = e.clientY;
        swipeStartTimeRef.current = Date.now();
        swipeIsHorizontalRef.current = null;
        swipeIsDraggingRef.current = true;
    };

    const handleSwipeMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!swipeIsDraggingRef.current) return;
        const deltaX = Math.abs(e.clientX - swipeStartXRef.current);
        const deltaY = Math.abs(e.clientY - swipeStartYRef.current);
        if (swipeIsHorizontalRef.current === null && (deltaX > 8 || deltaY > 8)) {
            swipeIsHorizontalRef.current = deltaX > deltaY;
        }
    };

    const handleSwipeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!swipeIsDraggingRef.current) return;
        swipeIsDraggingRef.current = false;
        if (swipeIsHorizontalRef.current !== true) return;

        const deltaX = e.clientX - swipeStartXRef.current;
        const elapsed = Date.now() - swipeStartTimeRef.current;
        const velocity = Math.abs(deltaX) / (elapsed || 1);
        const THRESHOLD = 50;
        const VELOCITY = 0.35;

        if (deltaX > THRESHOLD || (deltaX > 0 && velocity > VELOCITY)) {
            // Swipe right → go to older entry (higher index)
            if (currentIndex < contents.length - 1) setCurrentIndex(currentIndex + 1);
        } else if (deltaX < -THRESHOLD || (deltaX < 0 && velocity > VELOCITY)) {
            // Swipe left → go to newer entry (lower index)
            if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
        }
    };


    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[100] flex flex-col bg-slate-900 overflow-hidden"
                onPointerDown={handleSwipeStart}
                onPointerMove={handleSwipeMove}
                onPointerUp={handleSwipeEnd}
                onPointerCancel={() => { swipeIsDraggingRef.current = false; }}
            >
                {/* Dynamic Background Image */}
                {initialSection === 'devotional' && currentContent.devotionalBackgroundImage ? (
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 transition-all duration-700"
                        style={{ backgroundImage: `url(${currentContent.devotionalBackgroundImage})` }}
                    />
                ) : initialSection === 'verse' && currentContent.backgroundImage ? (
                    <div
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 transition-all duration-700"
                        style={{ backgroundImage: `url(${currentContent.backgroundImage})` }}
                    />
                ) : initialSection === 'devotional' ? (
                    <div className="absolute inset-0 z-0 transition-all duration-700" style={{ background: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)' }} />
                ) : (
                    <div className="absolute inset-0 z-0 transition-all duration-700" style={{ background: 'linear-gradient(135deg, #0B7A81 0%, #14b8a6 50%, #2dd4bf 100%)' }} />
                )}

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between p-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full shadow-sm bg-white/20 hover:bg-white/30 text-white transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft className="size-6" />
                    </button>

                    <div className="text-center flex-1">
                        <h2 className="text-white font-bold text-lg">{getRelativeLabel(currentContent.date)}</h2>
                        <p className="text-white/60 text-xs">{currentContent.date}</p>
                    </div>

                    <button
                        onClick={handlePlayPause}
                        className={`p-2 rounded-full shadow-sm text-white transition-all flex items-center justify-center ${
                            isSpeaking && !isPaused
                            ? 'bg-teal-500 hover:bg-teal-600 animate-pulse scale-105 shadow-teal-500/20'
                            : 'bg-white/20 hover:bg-white/30'
                        }`}
                        title={isSpeaking ? (isPaused ? 'Resume Narration' : 'Pause Narration') : 'Start Narration'}
                        aria-label="Narrate"
                    >
                        {isSpeaking && !isPaused ? (
                            <Pause className="size-6" />
                        ) : (
                            <Play className="size-6 ml-0.5" />
                        )}
                    </button>
                </div>

                {/* Top Carousel for Switching Days */}
                {/* <div className="relative z-10 w-full overflow-x-auto pb-2 scrollbar-hide px-4 flex space-x-3 snap-x">
                    {contents.map((item, index) => (
                        <button
                            key={item.date}
                            onClick={() => setCurrentIndex(index)}
                            className={`snap-center shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                currentIndex === index
                                ? 'bg-white text-slate-900 shadow-md scale-105'
                                : 'bg-white/20 text-white hover:bg-white/30'
                            }`}
                        >
                            {getRelativeLabel(item.date)}
                        </button>
                    ))}
                </div> */}

                {/* Content Sections */}
                <ScrollArea className="relative z-10 flex-1 px-4 sm:px-8 pb-12 mt-4" ref={scrollRef}>
                    <div className="max-w-2xl mx-auto flex flex-col space-y-12 py-8">

                        {/* ─── Section 1: Daily Verse ─────────────────────────────────────── */}
                        {initialSection === 'verse' && (
                            <div id="section-verse" className="flex flex-col space-y-2">
                                {currentContent.verse ? (
                                    <>
                                        <div className="w-full">
                                            <div className="text-center w-full">
                                                <p className="text-white/90 text-[17px] font-semibold mb-3">
                                                    {formatVerseLabel(currentContent.date)}
                                                </p>

                                                {/* Centered Pagination Dots — visual only; swipe to navigate */}
                                                {contents.length > 1 && (
                                                    <div className="flex justify-center space-x-2 mb-3">
                                                        {contents.map((_: any, displayPos: number) => {
                                                            const dataIndex = contents.length - 1 - displayPos;
                                                            return (
                                                                <div
                                                                    key={displayPos}
                                                                    className={`h-2 rounded-full transition-all ${currentIndex === dataIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                                                                    aria-label={`Slide ${dataIndex + 1} of ${contents.length}`}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight truncate mt-8">
                                                {currentContent.verseReference || 'Reference'} {(currentContent as any).version || 'KJV'}
                                            </h3>
                                        </div>

                                        <p className="text-white text-2xl md:text-3xl leading-relaxed font-serif italic text-left pl-2 drop-shadow-md w-full mt-8">
                                            &ldquo;{currentContent.verse}&rdquo;
                                        </p>
                                    </>
                                ) : (
                                    <div className="text-center py-10 opacity-70">
                                        <p className="text-white/70 text-xs mb-2 uppercase tracking-widest font-bold">Daily Verse</p>
                                        <p className="text-white text-lg">Today&apos;s verse will be available soon.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── Section 2: Daily Devotional ────────────────────────────────── */}
                        {initialSection === 'devotional' && (
                            <div id="section-devotional" className="flex flex-col space-y-12">
                                {currentContent.devotionalContent ? (
                                    <>
                                        {/* ── A. Aligned Header (matches Daily Verse) ─────────── */}
                                        <div className="flex flex-col items-center text-center w-full">
                                            {/* Title — "Devotion of the Day" or "Tuesday, 8th July" */}
                                            <p className="text-white/90 text-[17px] font-semibold mb-3">
                                                {formatDevotionLabel(currentContent.date)}
                                            </p>

                                            {/* Pagination dots — visual only; swipe to navigate */}
                                            {contents.length > 1 && (
                                                <div className="flex justify-center space-x-2 mb-3">
                                                    {contents.map((_: any, displayPos: number) => {
                                                        const dataIndex = contents.length - 1 - displayPos;
                                                        return (
                                                            <div
                                                                key={displayPos}
                                                                className={`h-2 rounded-full transition-all ${currentIndex === dataIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                                                                aria-label={`Slide ${dataIndex + 1} of ${contents.length}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* ── Multi-block verse references (new) ── */}
                                            {currentContent.devotionalVerseBlocks && currentContent.devotionalVerseBlocks.length > 0 ? (
                                                // New: render each verse block in order
                                                currentContent.devotionalVerseBlocks.map((block, blockIdx) => (
                                                    <React.Fragment key={blockIdx}>
                                                        <h3 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight mt-8">
                                                            {block.ref}
                                                        </h3>
                                                        {block.text && (
                                                            <div className="flex flex-col items-center text-center mt-4">
                                                                <p className="text-white text-xl md:text-2xl leading-relaxed font-serif italic max-w-xl mx-auto drop-shadow-md">
                                                                    &ldquo;{block.text}&rdquo;
                                                                </p>
                                                            </div>
                                                        )}
                                                        {/* Thin divider between multiple verse blocks (not after last) */}
                                                        {blockIdx < (currentContent.devotionalVerseBlocks?.length ?? 0) - 1 && (
                                                            <div className="h-px bg-white/10 w-2/3 mx-auto mt-8" />
                                                        )}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                // Legacy fallback: single verse ref + text
                                                <>
                                                    {currentContent.devotionalVerseRef && (
                                                        <h3 className="text-white text-4xl md:text-5xl font-extrabold tracking-tight mt-8">
                                                            {currentContent.devotionalVerseRef}
                                                        </h3>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        {/* ── B. Legacy single verse text (shown only for old records without blocks) ── */}
                                        {(!currentContent.devotionalVerseBlocks || currentContent.devotionalVerseBlocks.length === 0) &&
                                            currentContent.devotionalVerseText && (
                                                <div className="flex flex-col items-center text-center">
                                                    <p className="text-white text-xl md:text-2xl leading-relaxed font-serif italic max-w-xl mx-auto drop-shadow-md">
                                                        &ldquo;{currentContent.devotionalVerseText}&rdquo;
                                                    </p>
                                                </div>
                                            )}

                                        {/* Premium Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />

                                        {/* ── C. Devotional Content (Title & Body) ────────────── */}
                                        <div className="flex flex-col space-y-6">
                                            <p className="text-white/70 text-xs uppercase tracking-widest font-bold text-center">Devotional Reading</p>
                                            <h3 className="text-white text-3xl font-extrabold text-center tracking-tight leading-tight">{currentContent.devotionalTitle}</h3>
                                            <p className="text-white/90 text-lg leading-loose text-justify whitespace-pre-wrap drop-shadow-sm font-medium font-sans">
                                                {currentContent.devotionalContent}
                                            </p>
                                        </div>

                                        {/* ── D. Optional Prayer Section ──────────────────────── */}
                                        {currentContent.prayerContent && (
                                            <>
                                                {/* Premium Divider */}
                                                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />
                                                <div id="section-prayer" className="flex flex-col space-y-6">
                                                    <p className="text-white/70 text-xs uppercase tracking-widest font-bold text-center">Daily Prayer</p>
                                                    {currentContent.prayerTitle && (
                                                        <h4 className="text-white text-2xl font-extrabold text-center tracking-tight">{currentContent.prayerTitle}</h4>
                                                    )}
                                                    <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/25 shadow-2xl max-w-xl mx-auto">
                                                        <p className="text-white text-xl leading-relaxed font-serif italic text-center">
                                                            {currentContent.prayerContent}
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* ── E. Bottom CTA Area ───────────────────────────────── */}
                                        <div className="pt-6 pb-4 flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto">

                                            {/* Weekly Progress Indicator */}
                                            <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                                                <div>
                                                    <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-0.5">Weekly Progress</p>
                                                    <p className="text-white font-bold text-base">
                                                        {weeklyCompletedCount} of {contents.length} Completed
                                                    </p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {contents.map((c: IDailyContent) => {
                                                        const s = progressByDate[c.date] ?? c.devotionalProgress?.status ?? 'INCOMPLETE';
                                                        return (
                                                            <div
                                                                key={c.date}
                                                                className={`h-2 w-2 rounded-full transition-all ${
                                                                    s === 'COMPLETED'
                                                                        ? 'bg-emerald-400'
                                                                        : s === 'IN_PROGRESS'
                                                                        ? 'bg-amber-400'
                                                                        : 'bg-white/25'
                                                                }`}
                                                                title={s}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Completed Badge — shown only when COMPLETED */}
                                            {currentProgress === 'COMPLETED' && (
                                                <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-sm w-full justify-center">
                                                    <CheckCircle2 className="size-5 text-emerald-400 flex-shrink-0" />
                                                    <span className="text-emerald-300 text-sm font-semibold tracking-wide">Devotional Completed</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/10">
                                        <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Daily Devotional</p>
                                        <p className="text-white/50 text-sm mt-2">Not available for this day.</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </ScrollArea>

                {/* ── Sticky Bottom Action Bar ──────────────────────────────────── */}
                <div className="relative z-10 flex-shrink-0 border-t border-white/15 bg-black/30 backdrop-blur-md px-6 py-4">
                    {initialSection === 'verse' && currentContent.verse && (
                        <div className="flex items-center justify-around max-w-lg mx-auto">
                            <LikeButton
                                contentId={currentContent._id || ''}
                                contentType="daily-verse"
                                initialLiked={currentContent.isVerseLiked || false}
                                initialCount={currentContent.verseLikeCount || 0}
                                variant="carousel"
                            />
                            <button onClick={() => onCommentClick?.(currentContent._id || '', 'daily-verse')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 active:scale-95 transition-all">
                                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                    <MessageCircle className="size-4" />
                                </div>
                                <span className="text-xs">{currentContent?.verseCommentCount || 'Comment'}</span>
                            </button>
                            <button onClick={() => onShareClick?.(currentContent, 'daily-verse')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 active:scale-95 transition-all">
                                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                    <Forward className="size-4" />
                                </div>
                                <span className="text-xs">{currentContent.verseShareCount && currentContent.verseShareCount > 0 ? currentContent.verseShareCount : 'Share'}</span>
                            </button>
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setOpenKebab(!openKebab); }} className="flex flex-col items-center space-y-1 text-white hover:scale-110 active:scale-95 transition-all">
                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                        <MoreVertical className="size-4" />
                                    </div>
                                    <span className="text-xs">More</span>
                                </button>
                                {openKebab && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenKebab(false)} />
                                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 w-44 bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                                            <button onClick={() => { setOpenKebab(false); onReadFullChapter?.(currentContent); }} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors">
                                                Read Full Chapter
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    {initialSection === 'devotional' && currentContent.devotionalContent && (
                        <div className="flex flex-col gap-3 max-w-lg mx-auto">
                            <div className="flex items-center justify-around">
                                <LikeButton
                                    contentId={currentContent._id || ''}
                                    contentType="daily-devotion"
                                    initialLiked={currentContent.isDevotionLiked || false}
                                    initialCount={currentContent.devotionLikeCount || 0}
                                    variant="carousel"
                                />
                                <button onClick={() => onCommentClick?.(currentContent._id || '', 'daily-devotion')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 active:scale-95 transition-all">
                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                        <MessageCircle className="size-4" />
                                    </div>
                                    <span className="text-xs">{currentContent.devotionCommentCount || 'Comment'}</span>
                                </button>
                                <button onClick={() => onShareClick?.(currentContent, 'daily-devotion')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 active:scale-95 transition-all">
                                    <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                        <Forward className="size-4" />
                                    </div>
                                    <span className="text-xs">{currentContent.devotionShareCount && currentContent.devotionShareCount > 0 ? currentContent.devotionShareCount : 'Share'}</span>
                                </button>
                            </div>
                            <button
                                onClick={handleCompleteDevotional}
                                disabled={currentProgress === 'COMPLETED'}
                                className={`w-full py-3.5 font-extrabold rounded-2xl shadow-xl transition-all duration-200 tracking-wider text-center uppercase text-sm select-none flex items-center justify-center gap-2 ${
                                    currentProgress === 'COMPLETED'
                                        ? 'bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 cursor-default'
                                        : 'bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] text-white'
                                }`}
                                aria-label={currentProgress === 'COMPLETED' ? 'Devotional already completed' : 'Mark devotional as complete'}
                            >
                                {currentProgress === 'COMPLETED' ? (
                                    <>
                                        <CheckCheck className="size-4" />
                                        Completed
                                    </>
                                ) : (
                                    'Complete Devotion'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
