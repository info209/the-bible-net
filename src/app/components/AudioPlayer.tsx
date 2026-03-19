"use client";

import { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, 
  RotateCcw, RotateCw, Gauge, ChevronUp, ChevronDown, 
  X, Repeat, Repeat1, Shuffle, List, MoreHorizontal,
  Headphones, Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaStore } from '@/lib/mediaStore';

interface Verse {
  number: number;
  text: string;
}

interface AudioPlayerProps {
  bookName: string;
  chapterNumber: number;
  versionId: string;
  onNextChapter: () => void;
  onPrevChapter: () => void;
  versesCount: number;
  verses?: Verse[];
  language?: string;
}

export default function AudioPlayer({ 
  bookName, 
  chapterNumber, 
  versionId, 
  onNextChapter, 
  onPrevChapter,
  versesCount,
  verses = [],
  language = 'en-US'
}: AudioPlayerProps) {
  const { 
    isPlaying, setIsPlaying, 
    currentTime, setCurrentTime, 
    duration, setDuration, 
    volume, setVolume, 
    playbackRate, setPlaybackRate,
    isMuted, setIsMuted,
    repeatMode, setRepeatMode,
    currentVerse, setCurrentVerse,
    autoPlay
  } = useMediaStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [useSpeechFallback, setUseSpeechFallback] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Derived audio URL
  const audioUrl = `/audio/${versionId}/${bookName.replace(/\s+/g, '')}/${chapterNumber}.mp3`;

  // Main Audio setup and event listeners
  useEffect(() => {
    setUseSpeechFallback(false); // Reset fallback on source change

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    } else {
      audioRef.current.pause();
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }

    const audio = audioRef.current;
    
    // Auto Play logic
    if (autoPlay) {
      setIsPlaying(true);
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setUseSpeechFallback(false);
    };

    const handleTimeUpdate = () => {
      if (useSpeechFallback) return;
      setCurrentTime(audio.currentTime);
      if (versesCount > 0 && audio.duration) {
        const verseNum = Math.min(Math.ceil((audio.currentTime / audio.duration) * versesCount), versesCount);
        if (verseNum !== currentVerse) {
          setCurrentVerse(verseNum || 1);
        }
      }
    };
    
    const handleEnded = () => {
      if (repeatMode === 'chapter') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        setIsPlaying(false);
        onNextChapter();
      }
    };

    const handleError = () => {
      console.warn(`Audio file not found or failed to load: ${audioUrl}. Falling back to Speech Narration.`);
      setUseSpeechFallback(true);
      // If was playing, TTS will pick up in the isPlaying effect
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // Media Session API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${bookName} ${chapterNumber}`,
        artist: 'The Bible App',
        album: versionId,
        artwork: [{ src: 'https://images.unsplash.com/photo-1507126882445-434b04530d1a?auto=format&fit=crop&q=80&w=512&h=512', sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', onPrevChapter);
      navigator.mediaSession.setActionHandler('nexttrack', onNextChapter);
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [audioUrl, versesCount, autoPlay]);

  // Speech Fallback Logic
  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
  };

  const speakVerse = (index: number) => {
    if (!verses || verses.length === 0 || index >= verses.length) {
      if (index >= verses.length) {
        // Chapter finished
        setIsPlaying(false);
        onNextChapter();
      }
      return;
    }

    stopSpeech();
    
    const verseText = verses[index].text;
    const utterance = new SpeechSynthesisUtterance(verseText);
    utterance.lang = language;
    utterance.rate = playbackRate;
    utterance.volume = isMuted ? 0 : volume;
    
    utterance.onstart = () => {
      setCurrentVerse(verses[index].number);
      // Simulate progress bar based on verse index
      setCurrentTime((index / verses.length) * (duration || 100));
    };

    utterance.onend = () => {
      if (isPlaying) {
        speakVerse(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.error('SpeechSynthesis error:', e);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Sync play/pause with internal audio or speech
  useEffect(() => {
    if (useSpeechFallback) {
      if (isPlaying) {
        // Resume from current verse or start over
        const startIndex = verses.findIndex(v => v.number === (currentVerse || 1));
        speakVerse(startIndex !== -1 ? startIndex : 0);
      } else {
        stopSpeech();
      }
    } else {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play().catch(() => {
            // If play fails (e.g. 404 after initial load attempt), trigger fallback
            setUseSpeechFallback(true);
          });
        } else {
          audioRef.current.pause();
        }
      }
    }
  }, [isPlaying, useSpeechFallback, audioUrl]);

  // Sync volume/rate changes with active output
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
    if (useSpeechFallback && isPlaying && utteranceRef.current) {
      // For speech, we have to restart the utterance to apply rate/volume changes live usually, 
      // but some browsers support it. Simplifying: restart current verse on change if playing.
      const currentIndex = verses.findIndex(v => v.number === currentVerse);
      if (currentIndex !== -1) speakVerse(currentIndex);
    }
  }, [volume, isMuted, playbackRate]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (useSpeechFallback) return; // Disable seek for TTS for now

    if (progressBarRef.current && audioRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const skipForward = () => {
    if (useSpeechFallback) {
      const currentIndex = verses.findIndex(v => v.number === currentVerse);
      speakVerse(currentIndex + 1);
    } else if (audioRef.current) {
      audioRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (useSpeechFallback) {
      const currentIndex = verses.findIndex(v => v.number === currentVerse);
      speakVerse(Math.max(0, currentIndex - 1));
    } else if (audioRef.current) {
      audioRef.current.currentTime -= 10;
    }
  };

  const toggleMute = () => setIsMuted(!isMuted);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center pb-[calc(10px+env(safe-area-inset-bottom))] px-4">
      <motion.div 
        layout
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`pointer-events-auto w-full max-w-2xl bg-white/70 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/40 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-500 ${isExpanded ? 'h-[280px]' : 'h-16'}`}
      >
        {/* Progress Bar */}
        <div 
          ref={progressBarRef}
          className={`absolute top-0 left-0 right-0 h-1.5 bg-gray-200/30 cursor-pointer group ${useSpeechFallback ? 'opacity-50' : ''}`}
          onClick={handleSeek}
        >
          <motion.div 
            className="h-full bg-[var(--color-primary-teal)] relative"
            style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 size-3 bg-[var(--color-primary-teal)] rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col p-4 pt-5">
          {/* Mini Player / Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="size-10 bg-gradient-to-br from-[#006a6f] to-[#d23952] rounded-xl flex items-center justify-center flex-shrink-0 relative">
                {useSpeechFallback ? <Mic className="size-5 text-white" /> : <Play className="size-5 text-white fill-current" />}
                {useSpeechFallback && (
                  <div className="absolute -top-1 -right-1 size-3 bg-rose-500 border border-white rounded-full animate-pulse" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#31393a] truncate">{bookName} {chapterNumber}</span>
                  {useSpeechFallback && <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-full font-bold uppercase tracking-tighter">TTS Fallback</span>}
                </div>
                <span className="text-xs text-[#31393a]/60 truncate">
                   Verse {currentVerse || 1} • {useSpeechFallback ? 'Narrating...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                  if (audioRef.current) audioRef.current.currentTime = 0;
                  stopSpeech();
                }}
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
                title="Stop"
              >
                <X className="size-5 text-[#31393a]/60" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                {isPlaying ? <Pause className="size-6 text-[#006a6f] fill-current" /> : <Play className="size-6 text-[#006a6f] fill-current" />}
              </button>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-full hover:bg-black/5 transition-colors"
              >
                {isExpanded ? <ChevronDown className="size-6 text-[#31393a]/60" /> : <ChevronUp className="size-6 text-[#31393a]/60" />}
              </button>
            </div>
          </div>

          {/* Expanded Section */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 flex flex-col gap-6"
              >
                {/* Main Controls */}
                <div className="flex items-center justify-center gap-8">
                  <button onClick={onPrevChapter} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <SkipBack className="size-7 text-[#31393a]" />
                  </button>
                  <button onClick={skipBackward} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <RotateCcw className="size-7 text-[#31393a]" />
                  </button>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="size-16 bg-[#006a6f] rounded-full flex items-center justify-center shadow-lg shadow-[#006a6f]/20 hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="size-8 text-white fill-current" /> : <Play className="size-8 text-white fill-current translate-x-1" />}
                  </button>
                  <button onClick={skipForward} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <RotateCw className="size-7 text-[#31393a]" />
                  </button>
                  <button onClick={onNextChapter} className="p-2 rounded-full hover:bg-black/5 transition-colors">
                    <SkipForward className="size-7 text-[#31393a]" />
                  </button>
                </div>

                {/* Second Row Controls */}
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-4">
                    {/* Speed Selector */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-full text-xs font-bold text-[#31393a]"
                      >
                        <Gauge className="size-3.5" />
                        {playbackRate}x
                      </button>
                      <AnimatePresence>
                        {showSpeedMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute bottom-full mb-2 left-0 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-xl p-1 z-[60]"
                          >
                            {speeds.map(speed => (
                              <button
                                key={speed}
                                onClick={() => {
                                  setPlaybackRate(speed);
                                  setShowSpeedMenu(false);
                                }}
                                className={`block w-full text-left px-4 py-2 text-xs font-medium rounded-xl transition-colors ${playbackRate === speed ? 'bg-[#006a6f] text-white' : 'hover:bg-black/5 text-[#31393a]'}`}
                              >
                                {speed}x
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Volume */}
                    <div className="flex items-center gap-3">
                      <button onClick={toggleMute} className="p-1.5 bg-black/5 rounded-full">
                        {isMuted || volume === 0 ? <VolumeX className="size-4 text-[#31393a]" /> : <Volume2 className="size-4 text-[#31393a]" />}
                      </button>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          setVolume(parseFloat(e.target.value));
                          if (isMuted) setIsMuted(false);
                        }}
                        className="w-20 h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#006a6f]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Headphones className={`size-5 transition-colors ${!useSpeechFallback ? 'text-[#006a6f]' : 'text-gray-300'}`} />
                    <button 
                      onClick={() => setRepeatMode(repeatMode === 'chapter' ? 'none' : 'chapter')}
                      className={`p-2 rounded-full transition-colors ${repeatMode !== 'none' ? 'bg-[#d23952]/10 text-[#d23952]' : 'bg-black/5 text-[#31393a]'}`}
                    >
                      {repeatMode === 'verse' ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
