import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause, Forward, MessageCircle, MoreVertical } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LikeButton } from './LikeButton';

interface IDailyContent {
    _id?: string;
    date: string;
    verse: string;
    verseReference: string;
    devotionalTitle?: string;
    devotionalContent?: string;
    devotionalVerseRef?: string;
    devotionalVerseText?: string;
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
}

export function DailyDetailModal({ isOpen, onClose, contents, initialIndex, initialSection, onCommentClick, onShareClick, onReadFullChapter }: DailyDetailModalProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);
    const [openKebab, setOpenKebab] = React.useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            
            // Allow DOM to render, then scroll to top cleanly
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

    const currentContent = contents[currentIndex];

    const getNarrationText = React.useCallback(() => {
        if (!currentContent) return '';
        if (initialSection === 'verse') {
            const parts = ['Daily Verse'];
            if (currentContent.verseReference) parts.push(currentContent.verseReference);
            if (currentContent.verse) parts.push(currentContent.verse);
            return parts.join('. ');
        } else if (initialSection === 'devotional') {
            const parts = [];
            if (currentContent.devotionalVerseRef) {
                parts.push('Devotional Verse');
                parts.push(currentContent.devotionalVerseRef);
            }
            if (currentContent.devotionalVerseText) {
                parts.push(currentContent.devotionalVerseText);
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
                if (currentContent.prayerTitle) {
                    parts.push(currentContent.prayerTitle);
                }
                parts.push(currentContent.prayerContent);
            }
            return parts.join('. ');
        }
        return '';
    }, [currentContent, initialSection]);

    const stopNarration = React.useCallback(() => {
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
            // Cancel any active speech first
            synth.cancel();

            const textToSpeak = getNarrationText();
            if (!textToSpeak) return;

            const utterance = new SpeechSynthesisUtterance(textToSpeak);

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
            };

            utterance.onerror = () => {
                setIsSpeaking(false);
                setIsPaused(false);
            };

            setIsSpeaking(true);
            setIsPaused(false);
            synth.speak(utterance);
        }
    };

    // Stop speaking when day, content, or section changes
    useEffect(() => {
        stopNarration();
    }, [currentIndex, initialSection, stopNarration]);

    // Stop speaking when the modal is closed
    useEffect(() => {
        if (!isOpen) {
            stopNarration();
        }
    }, [isOpen, stopNarration]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    if (!isOpen || contents.length === 0) return null;
    
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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-[100] flex flex-col bg-slate-900 overflow-hidden"
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
                <div className="relative z-10 w-full overflow-x-auto pb-2 scrollbar-hide px-4 flex space-x-3 snap-x">
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
                </div>

                {/* Content Sections */}
                <ScrollArea className="relative z-10 flex-1 px-4 sm:px-8 pb-12 mt-4" ref={scrollRef}>
                    <div className="max-w-2xl mx-auto flex flex-col space-y-12 py-8">
                        
                        {/* Section 1: Daily Verse */}
                        {initialSection === 'verse' && (
                            <div id="section-verse" className="flex flex-col space-y-2">
                                {currentContent.verse ? (
                                    <>
                                        <div className="w-full">
                                            <div className="text-center w-full">
                                                <p className="text-white/90 text-[17px] font-semibold mb-3">
                                                    {formatVerseLabel(currentContent.date)}
                                                </p>
                                                
                                                {/* Centered Pagination Dots */}
                                                {contents.length > 1 && (
                                                    <div className="flex justify-center space-x-2 mb-3">
                                                        {contents.map((_: any, displayPos: number) => {
                                                            const dataIndex = contents.length - 1 - displayPos;
                                                            return (
                                                                <button
                                                                    key={displayPos}
                                                                    onClick={() => setCurrentIndex(dataIndex)}
                                                                    className={`h-2 rounded-full transition-all ${currentIndex === dataIndex ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                                                                    aria-label={`Go to slide ${dataIndex + 1}`}
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
                                            "{currentContent.verse}"
                                        </p>
                                        <div className="flex items-center justify-start gap-6 pt-10">
                                            <LikeButton
                                                contentId={currentContent._id || ''}
                                                contentType="daily-verse"
                                                initialLiked={currentContent.isVerseLiked || false}
                                                initialCount={currentContent.verseLikeCount || 0}
                                                variant="modal"
                                            />
                                            <button onClick={() => onCommentClick?.(currentContent._id || '', 'daily-verse')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                    <MessageCircle className="size-5" />
                                                </div>
                                                <span className="text-xs">{currentContent?.verseCommentCount || 'Comment'}</span>
                                            </button>
                                            <button onClick={() => onShareClick?.(currentContent, 'daily-verse')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                                                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                    <Forward className="size-5" />
                                                </div>
                                                <span className="text-xs">{currentContent.verseShareCount && currentContent.verseShareCount > 0 ? currentContent.verseShareCount : 'Share'}</span>
                                            </button>
                                            <div className="relative">
                                                <button onClick={(e) => { e.stopPropagation(); setOpenKebab(!openKebab); }} className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                                                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                        <MoreVertical className="size-5" />
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
                                    </>
                                ) : (
                                    <div className="text-center py-10 opacity-70">
                                        <p className="text-white/70 text-xs mb-2 uppercase tracking-widest font-bold">Daily Verse</p>
                                        <p className="text-white text-lg">Today's verse will be available soon.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Section 2: Daily Devotional - Decoupled & Restructured Layout */}
                        {initialSection === 'devotional' && (
                            <div id="section-devotional" className="flex flex-col space-y-12">
                                {currentContent.devotionalContent ? (
                                    <>
                                        {/* A. Devotional Scripture Reference Section */}
                                        <div className="flex flex-col items-center text-center">
                                            <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-4">Devotional Verse</p>
                                            <h3 className="text-white text-2xl font-bold mb-4">{currentContent.devotionalVerseRef}</h3>
                                            
                                            {currentContent.devotionalVerseText ? (
                                                <p className="text-white text-xl md:text-2xl leading-relaxed font-serif italic max-w-xl mx-auto drop-shadow-md">
                                                    “{currentContent.devotionalVerseText}”
                                                </p>
                                            ) : (
                                                <div className="py-4 px-6 opacity-70 border border-white/20 rounded-2xl bg-white/5 max-w-md">
                                                    <p className="text-white/80 text-sm italic">Verse content resolution pending...</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Premium Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" />

                                        {/* B. Devotional Content (Title & Body) */}
                                        <div className="flex flex-col space-y-6">
                                            <p className="text-white/70 text-xs uppercase tracking-widest font-bold text-center">Devotional Reading</p>
                                            <h3 className="text-white text-3xl font-extrabold text-center tracking-tight leading-tight">{currentContent.devotionalTitle}</h3>
                                            <p className="text-white/90 text-lg leading-loose text-justify whitespace-pre-wrap drop-shadow-sm font-medium font-sans">
                                                {currentContent.devotionalContent}
                                            </p>
                                        </div>

                                        {/* C. Optional Prayer Section - Only Renders and Takes Spacing If Exists */}
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

                                        {/* D. Complete Button Placement Placeholder */}
                                        <div className="pt-8 pb-16 flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto">
                                            <div className="flex items-center justify-center gap-6 w-full">
                                                <LikeButton
                                                    contentId={currentContent._id || ''}
                                                    contentType="daily-devotion"
                                                    initialLiked={currentContent.isDevotionLiked || false}
                                                    initialCount={currentContent.devotionLikeCount || 0}
                                                    variant="modal"
                                                />
                                                <button onClick={() => onCommentClick?.(currentContent._id || '', 'daily-devotion')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                                                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                        <MessageCircle className="size-5" />
                                                    </div>
                                                    <span className="text-xs">{currentContent.devotionCommentCount || 'Comment'}</span>
                                                </button>
                                                <button onClick={() => onShareClick?.(currentContent, 'daily-devotion')} className="flex flex-col items-center space-y-1 text-white hover:scale-110 transition-transform">
                                                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                                                        <Forward className="size-5" />
                                                    </div>
                                                    <span className="text-xs">{currentContent.devotionShareCount && currentContent.devotionShareCount > 0 ? currentContent.devotionShareCount : 'Share'}</span>
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => console.log('Devotional marked as complete')}
                                                className="w-full py-4 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] focus:ring-2 focus:ring-teal-400/40 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 tracking-wider text-center uppercase text-sm select-none"
                                            >
                                                Complete Devotional
                                            </button>
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
            </motion.div>
        </AnimatePresence>
    );
}
