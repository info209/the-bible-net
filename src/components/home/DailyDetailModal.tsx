import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, MessageCircle, MoreVertical, CheckCircle2, CheckCheck, ChevronLeft, ChevronRight, Bookmark, Copy, BookOpen } from 'lucide-react';
import { RiShareForwardLine } from 'react-icons/ri';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LikeButton } from './LikeButton';
import { PremiumCarousel } from './PremiumCarousel';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from '@/context/ToastContext';
import { useSavedVerses, buildVerseRangeText } from '@/lib/useSavedVerses';
import { formatCopyVerseText } from '@/utils/verseFormatter';
import verseTexture from '../../../assets/textures/verse-texture.svg';
import devotionalTexture from '../../../assets/textures/devotional-texture.svg';

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
    onClose: (finalIndex?: number) => void;
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
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === yesterdayStr) return 'Yesterday';

    const d = new Date(dateStr);
    const dayOfWeek = d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const day = d.getUTCDate();
    const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `${dayOfWeek}, ${day}${getOrdinalSuffix(day)} ${month}`;
};

const formatDevotionLabel = (dateStr: string): string => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === yesterdayStr) return 'Yesterday';

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
    const [openKebab, setOpenKebab] = React.useState<'verse' | 'devotional' | null>(null);
    // Fixed position for the kebab dropdown so it never clips outside the modal
    const [kebabMenuPos, setKebabMenuPos] = React.useState<{ top: number; left: number } | null>(null);
    const kebabButtonRef = useRef<HTMLButtonElement | null>(null);
    const devKebabButtonRef = useRef<HTMLButtonElement | null>(null);

    // Saved verses hook
    const { saveVerse, isSaved } = useSavedVerses();

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
        setOpenKebab(null);
    }, [currentIndex]);

    // Auto-close open kebab menu when scrolling or navigating
    useEffect(() => {
        if (!openKebab) return;

        const handleClose = () => {
            setOpenKebab(null);
        };

        window.addEventListener('scroll', handleClose, { passive: true, capture: true });
        window.addEventListener('touchmove', handleClose, { passive: true });

        const scrollViewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollViewport) {
            scrollViewport.addEventListener('scroll', handleClose, { passive: true });
        }

        return () => {
            window.removeEventListener('scroll', handleClose, { capture: true });
            window.removeEventListener('touchmove', handleClose);
            if (scrollViewport) {
                scrollViewport.removeEventListener('scroll', handleClose);
            }
        };
    }, [openKebab]);

    // Global Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentIndex < contents.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                }
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, currentIndex, contents.length]);

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
    const handleCompleteDevotional = useCallback((date: string, progress: ProgressStatus) => {
        if (!isAuthenticated) {
            // Show login prompt (same pattern as verse highlight menu)
            toast.info('Sign in to track your devotional progress');
            setTimeout(() => {
                router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`);
            }, 800);
            return;
        }

        if (!date) return;
        if (progress === 'COMPLETED') return; // already done — idempotent guard

        updateProgress(date, 'COMPLETED');
        toast.success('Devotional completed! Keep it up 🙏');
    }, [isAuthenticated, updateProgress, router]);

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

    const renderActionButtons = (type: 'verse' | 'devotional', content: IDailyContent) => {
        const isVerse = type === 'verse';
        const contentType = isVerse ? 'daily-verse' : 'daily-devotion';
        const isLiked = isVerse ? content.isVerseLiked : content.isDevotionLiked;
        const likeCount = isVerse ? content.verseLikeCount : content.devotionLikeCount;
        const commentCount = isVerse ? content.verseCommentCount : content.devotionCommentCount;
        const shareCount = isVerse ? content.verseShareCount : content.devotionShareCount;

        if (isVerse && !content.verse) return null;
        if (!isVerse && !content.devotionalContent) return null;

        const progress = progressByDate[content.date] ?? content.devotionalProgress?.status ?? 'INCOMPLETE';

        // ── Compute save verse data (from the daily content's verse fields) ──
        const bookId   = (content as any).verseBook || '';
        const bookName = (content as any).verseBook || '';
        const chapter  = Number((content as any).verseChapter) || 1;
        const verseNum = Number((content as any).verseNumber) || 1;
        const verses   = [verseNum];
        const verseRangeText = bookId ? buildVerseRangeText(bookName, chapter, verses) : '';
        const version  = (content as any).version || 'KJV';
        const isVerseAlreadySaved = bookId ? isSaved(bookId, chapter, verses) : false;

        const handleSaveVerseFromModal = async () => {
            setOpenKebab(null);
            if (!session?.user) {
                toast.info('Sign in to save verses');
                setTimeout(() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`), 800);
                return;
            }
            if (!bookId) {
                toast.error('Verse reference not available.');
                return;
            }
            try {
                await saveVerse({ bookId, bookName, chapter, verses, verseRangeText, version });
                toast.success('Verse saved! View in your Saved page.');
            } catch {
                toast.error('Failed to save verse.');
            }
        };

        const handleCopyVerse = () => {
            setOpenKebab(null);
            const textToCopy = formatCopyVerseText(content);
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => toast.success('Verse copied to the clipboard'))
                    .catch(() => toast.error('Failed to copy verse.'));
            }
        };

        const openKebabMenu = (e: React.MouseEvent, kebabType: 'verse' | 'devotional') => {
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const menuWidth = 192; // w-48 = 12rem = 192px
            const menuHeight = kebabType === 'verse' ? 132 : 88; // estimated heights
            const padding = 8;

            let top = rect.top - menuHeight - padding;
            let left = rect.left + rect.width / 2 - menuWidth / 2;

            // Prevent overflow on right
            if (left + menuWidth > window.innerWidth - padding) {
                left = window.innerWidth - menuWidth - padding;
            }
            // Prevent overflow on left
            if (left < padding) left = padding;
            // If going above viewport, show below the button
            if (top < padding) {
                top = rect.bottom + padding;
            }

            setKebabMenuPos({ top, left });
            setOpenKebab(openKebab === kebabType ? null : kebabType);
        };

        return (
            <div className="flex flex-col gap-6 w-full max-w-md mx-auto pt-6">
                <div className="flex items-center justify-around">
                    <LikeButton
                        contentId={content._id || ''}
                        contentType={contentType}
                        initialLiked={isLiked || false}
                        initialCount={likeCount || 0}
                        variant="carousel"
                    />
                    <button
                        onClick={() => onCommentClick?.(content._id || '', contentType)}
                        className="flex flex-col items-center space-y-1 text-black hover:scale-110 active:scale-95 transition-all"
                    >
                        <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full">
                            <MessageCircle className="size-4" />
                        </div>
                        <span className="text-xs">{commentCount || 'Comment'}</span>
                    </button>
                    <button
                        onClick={() => onShareClick?.(content, contentType)}
                        className="flex flex-col items-center space-y-1 text-black hover:scale-110 active:scale-95 transition-all"
                    >
                        <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full">
                            <RiShareForwardLine className="size-4" />
                        </div>
                        <span className="text-xs">
                            {shareCount && shareCount > 0 ? shareCount : 'Share'}
                        </span>
                    </button>
                    {/* Kebab Menu — shown for verse view only */}
                    {isVerse && (
                        <div className="relative">
                            <button
                                onClick={(e) => openKebabMenu(e, 'verse')}
                                className="flex flex-col items-center space-y-1 text-black hover:scale-110 active:scale-95 transition-all"
                            >
                                <div className="bg-black/20 backdrop-blur-sm p-2 rounded-full">
                                    <MoreVertical className="size-4" />
                                </div>
                                <span className="text-xs">More</span>
                            </button>
                        </div>
                    )}
                </div>

                {!isVerse && progress !== 'COMPLETED' && (
                    <button
                        onClick={() => handleCompleteDevotional(content.date, progress)}
                        className="w-full py-3.5 font-extrabold rounded-2xl shadow-xl transition-all duration-200 tracking-wider text-center text-sm select-none flex items-center justify-center gap-2 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] text-white"
                        aria-label="Mark devotional as complete"
                    >
                        Complete devotion
                    </button>
                )}

                {/* Fixed-position kebab dropdown — lifted out via outer portal, nothing rendered here */}
            </div>
        );
    };

    if (!isOpen || contents.length === 0) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[100] flex flex-col bg-slate-50 overflow-hidden"
            >
                {/* Dynamic Background Image */}
                {initialSection === 'devotional' && (currentContent.devotionalBackgroundImage || currentContent.backgroundImage) ? (
                    <>
                        <div
                            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
                            style={{ backgroundImage: `url(${currentContent.devotionalBackgroundImage || currentContent.backgroundImage})` }}
                        />
                        <div className="absolute inset-0 z-0 transition-all duration-700" />
                    </>
                ) : initialSection === 'verse' && currentContent.backgroundImage ? (
                    <>
                        <div
                            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
                            style={{ backgroundImage: `url(${currentContent.backgroundImage})` }}
                        />
                        <div className="absolute inset-0 z-0 transition-all duration-700" />
                    </>
                ) : initialSection === 'devotional' ? (
                    <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700" style={{ backgroundImage: `url(${devotionalTexture.src})` }} />
                ) : (
                    <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700" style={{ backgroundImage: `url(${verseTexture.src})` }} />
                )}

                {/* Header */}
                <div className="relative z-10 flex items-center justify-between p-4">
                    <button
                        onClick={() => onClose(currentIndex)}
                        className="p-2 rounded-full shadow-sm bg-black/10 hover:bg-black/20 text-black transition-colors"
                        aria-label="Close"
                    >
                        <X className="size-6" />
                    </button>

                    <div className="text-center flex-1 min-w-0 px-2">
                        <p className="text-black/90 text-[15px] font-semibold mb-1 truncate">
                            {initialSection === 'verse' ? formatVerseLabel(currentContent.date) : formatDevotionLabel(currentContent.date)}
                        </p>
                        {contents.length > 1 && (
                            <div className="flex justify-center space-x-1.5">
                                {contents.map((_: any, displayPos: number) => {
                                    const dataIndex = contents.length - 1 - displayPos;
                                    return (
                                        <div
                                            key={displayPos}
                                            className={`h-1.5 rounded-full transition-all ${currentIndex === dataIndex ? 'w-6 bg-black' : 'w-1.5 bg-black/40'}`}
                                            aria-label={`Slide ${dataIndex + 1} of ${contents.length}`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handlePlayPause}
                        className={`p-2 rounded-full shadow-sm text-black transition-all flex items-center justify-center ${
                            isSpeaking && !isPaused
                            ? 'bg-teal-500 hover:bg-teal-600 animate-pulse scale-105 shadow-teal-500/20 text-white'
                            : 'bg-black/10 hover:bg-black/20'
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

                {/* Content Sections */}
                <PremiumCarousel
                    activeIndex={currentIndex}
                    onChange={setCurrentIndex}
                    ariaLabel="Daily Detail Carousel"
                    className="flex-1"
                    style={{ borderRadius: 0 }}
                    fullHeight={true}
                >
                    {contents.map((item, index) => {
                        const progress = progressByDate[item.date] ?? item.devotionalProgress?.status ?? 'INCOMPLETE';
                        return (
                            <ScrollArea
                                key={item.date || index}
                                className="relative z-10 h-full w-full px-4 sm:px-8 mt-4 touch-pan-y"
                                ref={index === currentIndex ? scrollRef : null}
                            >
                                <div className="max-w-2xl mx-auto flex flex-col space-y-12 pb-24">

                                    {/* ─── Section 1: Daily Verse ─────────────────────────────────────── */}
                                    {initialSection === 'verse' && (
                                        <div id="section-verse" className="flex flex-col space-y-2">
                                            {item.verse ? (
                                                <>
                                                        <div className="mt-6 text-left w-full">
                                                            <h4 className="text-black/80 text-xs tracking-wider mb-0.5">Daily verse</h4>
                                                            <h3 className="text-black text-lg font-bold tracking-tight truncate">
                                                                {item.verseReference || 'Reference'} {(item as any).version || 'KJV'}
                                                            </h3>
                                                        </div>

                                                        <p className="text-black text-[16px] md:text-[18px] leading-relaxed text-left pl-1 w-full mt-4">
                                                        {(() => {
                                                            let verseItems: Array<{ number: number; text: string }> = (item as any).verseItems || [];
                                                            if (verseItems.length === 0 && (item as any).verseBlocks && Array.isArray((item as any).verseBlocks)) {
                                                                verseItems = (item as any).verseBlocks.flatMap((b: any) => b.verses || []);
                                                            }
                                                            const fallbackText = item.verse || 'Verse text available soon...';

                                                            if (verseItems.length <= 1) {
                                                                const textToDisplay = verseItems.length === 1 ? verseItems[0].text : fallbackText;
                                                                return <>&ldquo;{textToDisplay}&rdquo;</>;
                                                            }

                                                            return (
                                                                <>
                                                                    &ldquo;
                                                                    {verseItems.map((v, idx) => (
                                                                        <span key={idx}>
                                                                            <span className="font-bold text-black mr-1">{v.number}</span>
                                                                            <span>{v.text}</span>
                                                                            {idx < verseItems.length - 1 ? ' ' : ''}
                                                                        </span>
                                                                    ))}
                                                                    &rdquo;
                                                                </>
                                                            );
                                                        })()}
                                                    </p>

                                                    {/* Premium Divider */}
                                                    <div className="h-px bg-gradient-to-r from-transparent via-black/15 to-transparent w-full mt-12" />

                                                    <div className="mt-8 w-full">
                                                        {renderActionButtons('verse', item)}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center py-10 opacity-70">
                                                    <p className="text-black/70 text-xs mb-2 tracking-widest font-bold">Daily verse</p>
                                                    <p className="text-black text-lg">Today&apos;s verse will be available soon.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ─── Section 2: Daily Devotional ────────────────────────────────── */}
                                    {initialSection === 'devotional' && (
                                        <div id="section-devotional" className="flex flex-col space-y-12">
                                            {item.devotionalContent ? (
                                                <>
                                                        {/* Devotional Heading AT THE TOP */}
                                                        <div className="mt-2 text-left w-full">
                                                            <h4 className="text-black/80 text-xs font-bold tracking-wider mb-0.5">Daily devotional</h4>
                                                            <h3 className="text-black text-xl md:text-2xl font-bold tracking-tight mt-0.5">
                                                                {item.devotionalTitle}
                                                            </h3>
                                                        </div>

                                                    {/* ── B. Linked Verses ── */}
                                                    {item.devotionalVerseBlocks && item.devotionalVerseBlocks.length > 0 ? (
                                                        <div className="flex flex-col space-y-6 w-full">
                                                            {item.devotionalVerseBlocks.map((block, blockIdx) => (
                                                                <div key={blockIdx} className="flex flex-col space-y-1 text-left w-full">
                                                                    <h4 className="text-black text-base md:text-lg font-bold tracking-tight">
                                                                        {block.ref}
                                                                    </h4>
                                                                    {block.text && (
                                                                        <p className="text-black text-[16px] md:text-[18px] leading-relaxed text-left pl-1 w-full mt-2">
                                                                            &ldquo;{block.text}&rdquo;
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        item.devotionalVerseRef && (
                                                            <div className="flex flex-col space-y-1 text-left w-full">
                                                                <h4 className="text-black text-base md:text-lg font-bold tracking-tight">
                                                                    {item.devotionalVerseRef}
                                                                </h4>
                                                                {item.devotionalVerseText && (
                                                                    <p className="text-black text-[16px] md:text-[18px] leading-relaxed font-serif italic text-left pl-1 w-full mt-2">
                                                                        &ldquo;{item.devotionalVerseText}&rdquo;
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    )}

                                                    {/* Premium Divider */}
                                                    <div className="h-px bg-gradient-to-r from-transparent via-black/15 to-transparent w-full" />

                                                    {/* ── C. Devotional Content (Body) ────────────── */}
                                                    <div className="flex flex-col space-y-4">
                                                        <div className="text-left w-full">
                                                            <h3 className="text-black text-xl md:text-2xl font-bold tracking-tight mt-0.5">Devotional reading</h3>
                                                        </div>
                                                        <p className="text-black/90 text-sm md:text-base leading-relaxed text-left whitespace-pre-wrap font-sans mt-2">
                                                            {item.devotionalContent}
                                                        </p>
                                                    </div>

                                                    {/* ── D. Optional Prayer Section ──────────────────────── */}
                                                    {item.prayerContent && (
                                                        <>
                                                            <div className="h-px bg-gradient-to-r from-transparent via-black/15 to-transparent w-full" />
                                                            <div id="section-prayer" className="flex flex-col space-y-4">
                                                                <div className="text-left w-full">
                                                                    <h3 className="text-black text-xl md:text-2xl font-bold tracking-tight mt-0.5">Daily prayer</h3>
                                                                    {item.prayerTitle && (
                                                                        <h4 className="text-black text-lg font-bold tracking-tight mt-0.5">{item.prayerTitle}</h4>
                                                                    )}
                                                                </div>
                                                                <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-black/25 shadow-2xl max-w-xl mx-auto w-full">
                                                                    <p className="text-black text-[16px] md:text-[18px] leading-relaxed font-serif italic text-left pl-1">
                                                                        {item.prayerContent}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* ── E. Bottom CTA Area ───────────────────────────────── */}
                                                    <div className="pt-6 pb-4 flex flex-col items-center justify-center gap-6 w-full max-w-md mx-auto">
                                                        {/* Weekly Progress Indicator */}
                                                        <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-black/15">
                                                            <div>
                                                                <p className="text-black/60 text-xs tracking-widest font-semibold mb-0.5">Weekly progress</p>
                                                                <p className="text-black font-bold text-base">
                                                                    {weeklyCompletedCount} of {contents.length} completed
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
                                                                                    : 'bg-black/20'
                                                                            }`}
                                                                            title={s}
                                                                        />
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>

                                                        {/* Completed Badge — shown only when COMPLETED */}
                                                        {progress === 'COMPLETED' && (
                                                            <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-sm w-full justify-center">
                                                                <CheckCircle2 className="size-5 text-emerald-400 flex-shrink-0" />
                                                                <span className="text-emerald-300 text-sm font-semibold tracking-wide">Devotional Completed</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Premium Divider */}
                                                    <div className="h-px bg-gradient-to-r from-transparent via-black/15 to-transparent w-full" />

                                                    {renderActionButtons('devotional', item)}
                                                </>
                                            ) : (
                                                <div className="text-center py-12 bg-white/5 rounded-3xl border border-black/10">
                                                    <p className="text-black/70 text-sm tracking-widest font-semibold">Daily devotional</p>
                                                    <p className="text-black/50 text-sm mt-2">Not available for this day.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </ScrollArea>
                        );
                    })}
                </PremiumCarousel>

                {/* Kebab portal — rendered outside PremiumCarousel/ScrollArea so fixed position is never clipped */}
                <AnimatePresence>
                    {openKebab && kebabMenuPos && (
                        <>
                            <div className="fixed inset-0 z-[200]" onClick={() => setOpenKebab(null)} />
                            <motion.div
                                key="kebab-dropdown"
                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                transition={{ duration: 0.12 }}
                                style={{ position: 'fixed', top: kebabMenuPos.top, left: kebabMenuPos.left, zIndex: 210 }}
                                className="w-52 bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {openKebab === 'verse' && (
                                    <>
                                        <button
                                            onClick={() => { setOpenKebab(null); onReadFullChapter?.(contents[currentIndex]); }}
                                            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-2"
                                        >
                                            <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                                            Read chapter
                                        </button>
                                        <button
                                            onClick={() => {
                                                setOpenKebab(null);
                                                const textToCopy = formatCopyVerseText(contents[currentIndex]);
                                                if (textToCopy) {
                                                    navigator.clipboard.writeText(textToCopy)
                                                        .then(() => toast.success('Verse copied to the clipboard'))
                                                        .catch(() => toast.error('Failed to copy verse.'));
                                                }
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100 flex items-center gap-2"
                                        >
                                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                                            Copy verse
                                        </button>
                                        <button
                                            onClick={() => {
                                                setOpenKebab(null);
                                                const c = contents[currentIndex] as any;
                                                const firstRef = c?.verseRefs?.[0];
                                                const bId = firstRef?.book || c?.verseBook || '';
                                                const bName = firstRef?.book || c?.verseBook || '';
                                                const ch = Number(firstRef?.chapter || c?.verseChapter) || 1;
                                                let vs: number[] = [];
                                                if (c?.verseRefs && c.verseRefs.length > 0) {
                                                    for (const r of c.verseRefs) {
                                                        for (let v = r.startVerse; v <= r.endVerse; v++) {
                                                            vs.push(v);
                                                        }
                                                    }
                                                } else {
                                                    vs = [Number(c?.verseNumber) || 1];
                                                }
                                                const vrt = bId ? buildVerseRangeText(bName, ch, vs) : '';
                                                const ver = c?.version || 'KJV';
                                                if (!session?.user) {
                                                    toast.info('Sign in to save verses');
                                                    setTimeout(() => router.push(`/auth/login?callbackUrl=${encodeURIComponent(window.location.href)}`), 800);
                                                    return;
                                                }
                                                if (!bId) { toast.error('Verse reference not available.'); return; }
                                                saveVerse({ bookId: bId, bookName: bName, chapter: ch, verses: vs, verseRangeText: vrt, version: ver })
                                                    .then(() => toast.success('Verse saved! View in your Saved page.'))
                                                    .catch(() => toast.error('Failed to save verse.'));
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100 flex items-center gap-2"
                                        >
                                            {(() => {
                                                const c = contents[currentIndex] as any;
                                                const firstRef = c?.verseRefs?.[0];
                                                const bId = firstRef?.book || c?.verseBook || '';
                                                const ch = Number(firstRef?.chapter || c?.verseChapter) || 1;
                                                let vs: number[] = [];
                                                if (c?.verseRefs && c.verseRefs.length > 0) {
                                                    for (const r of c.verseRefs) {
                                                        for (let v = r.startVerse; v <= r.endVerse; v++) {
                                                            vs.push(v);
                                                        }
                                                    }
                                                } else {
                                                    vs = [Number(c?.verseNumber) || 1];
                                                }
                                                const saved = bId ? isSaved(bId, ch, vs) : false;
                                                return (
                                                    <>
                                                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-black text-black' : 'text-gray-500'}`} />
                                                        <span className="text-gray-800">{saved ? 'Saved' : 'Save verse'}</span>
                                                    </>
                                                );
                                            })()}
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}
