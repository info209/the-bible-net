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
    prayerTitle?: string;
    prayerContent?: string;
    backgroundImage?: string;
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
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Auto-scroll logic could go here based on initialSection, but for now we rely on the user viewing it
    
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            
            // Allow DOM to render, then scroll to section
            setTimeout(() => {
                if (initialSection && scrollRef.current) {
                    const sectionId = `section-${initialSection}`;
                    const el = document.getElementById(sectionId);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            }, 300);
        }
    }, [isOpen, initialIndex, initialSection]);

    if (!isOpen || contents.length === 0) return null;

    const currentContent = contents[currentIndex];
    
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
                className="fixed inset-0 z-[100] flex flex-col bg-slate-900"
            >
                {/* Dynamic Background Image */}
                {currentContent.backgroundImage ? (
                    <div 
                        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 transition-all duration-700"
                        style={{ backgroundImage: `url(${currentContent.backgroundImage})` }}
                    />
                ) : (
                    <div className="absolute inset-0 z-0 bg-gradient-to-br from-cyan-900/60 to-teal-900/80 transition-all duration-700" />
                )}

                {/* Header */}
                <div className="relative z-10 flex items-center p-4">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full shadow-sm bg-white/20 hover:bg-white/30 text-white transition-colors"
                    >
                        <ArrowLeft className="size-6" />
                    </button>
                    <div className="flex-1 text-center pr-10">
                        <h2 className="text-white font-bold text-lg">{getRelativeLabel(currentContent.date)}</h2>
                        <p className="text-white/60 text-xs">{currentContent.date}</p>
                    </div>
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
                    <div className="max-w-2xl mx-auto flex flex-col space-y-16 py-8">
                        
                        {/* Section 1: Daily Verse */}
                        <div id="section-verse" className="flex flex-col">
                            {currentContent.verse ? (
                                <>
                                    <p className="text-white/70 text-sm mb-2 uppercase tracking-widest font-semibold text-center">Daily Verse</p>
                                    <h3 className="text-white text-2xl font-bold mb-8 text-center">{currentContent.verseReference}</h3>
                                    
                                    <p className="text-white text-3xl leading-relaxed font-serif italic text-center drop-shadow-md">
                                        "{currentContent.verse}"
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-10 opacity-70">
                                    <p className="text-white/70 text-sm mb-2 uppercase tracking-widest font-semibold">Daily Verse</p>
                                    <p className="text-white text-lg">Today's verse will be available soon.</p>
                                </div>
                            )}
                        </div>

                        {/* Section 2: Daily Devotional */}
                        <div id="section-devotional" className="flex flex-col">
                            {currentContent.devotionalContent ? (
                                <>
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="h-px bg-white/20 flex-1" />
                                        <p className="text-white/70 text-sm px-4 uppercase tracking-widest font-semibold">Daily Devotional</p>
                                        <div className="h-px bg-white/20 flex-1" />
                                    </div>
                                    <h3 className="text-white text-3xl font-bold mb-8 text-center">{currentContent.devotionalTitle}</h3>
                                    
                                    <p className="text-white/90 text-lg leading-loose text-justify whitespace-pre-wrap drop-shadow-sm font-medium">
                                        {currentContent.devotionalContent}
                                    </p>
                                </>
                            ) : (
                                <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-white/70 text-sm uppercase tracking-widest font-semibold">Daily Devotional</p>
                                    <p className="text-white/50 text-sm mt-2">Not available for this day.</p>
                                </div>
                            )}
                        </div>

                        {/* Section 3: Prayer */}
                        {currentContent.prayerContent && (
                            <div id="section-prayer" className="flex flex-col">
                                <div className="flex items-center justify-center mb-6">
                                    <div className="h-px bg-white/20 flex-1" />
                                    <p className="text-white/70 text-sm px-4 uppercase tracking-widest font-semibold">Prayer</p>
                                    <div className="h-px bg-white/20 flex-1" />
                                </div>
                                {currentContent.prayerTitle && (
                                    <h3 className="text-white text-2xl font-bold mb-6 text-center">{currentContent.prayerTitle}</h3>
                                )}
                                <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-xl">
                                    <p className="text-white text-xl leading-relaxed font-serif italic text-center">
                                        {currentContent.prayerContent}
                                    </p>
                                </div>
                            </div>
                        )}
                        
                    </div>
                </ScrollArea>
            </motion.div>
        </AnimatePresence>
    );
}
