import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Pause } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
}

interface DailyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    contents: IDailyContent[];
    initialIndex: number;
    initialSection?: 'verse' | 'devotional' | 'prayer';
}

export function DailyDetailModal({ isOpen, onClose, contents, initialIndex, initialSection }: DailyDetailModalProps) {
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
    const [isSpeaking, setIsSpeaking] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);
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
                            <div id="section-verse" className="flex flex-col space-y-6">
                                {currentContent.verse ? (
                                    <>
                                        <p className="text-white/70 text-xs mb-2 uppercase tracking-widest font-bold text-center">Daily Verse</p>
                                        <h3 className="text-white text-2xl md:text-3xl font-extrabold mb-4 text-center">{currentContent.verseReference}</h3>
                                        
                                        <p className="text-white text-2xl md:text-3xl leading-relaxed font-serif italic text-center drop-shadow-md max-w-xl mx-auto">
                                            "{currentContent.verse}"
                                        </p>
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
                                        <div className="pt-8 pb-16 flex justify-center w-full">
                                            <button
                                                onClick={() => console.log('Devotional marked as complete')}
                                                className="w-full max-w-md py-4 bg-gradient-to-r from-teal-400 to-cyan-500 hover:from-teal-500 hover:to-cyan-600 active:scale-[0.98] focus:ring-2 focus:ring-teal-400/40 text-white font-extrabold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 tracking-wider text-center uppercase text-sm select-none"
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
