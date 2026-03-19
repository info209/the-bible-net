import { create } from 'zustand';

interface MediaState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  currentBookId: string | null;
  currentChapter: number;
  currentVerse: number | null;
  currentVersionId: string | null;
  isMuted: boolean;
  repeatMode: 'none' | 'chapter' | 'verse';
  autoPlay: boolean;
  
  // Actions
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setCurrentChapter: (bookId: string, chapter: number, versionId: string) => void;
  setCurrentVerse: (verse: number | null) => void;
  setIsMuted: (isMuted: boolean) => void;
  setRepeatMode: (mode: 'none' | 'chapter' | 'verse') => void;
  setAutoPlay: (autoPlay: boolean) => void;
}

export const useMediaStore = create<MediaState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  currentBookId: null,
  currentChapter: 1,
  currentVerse: null,
  currentVersionId: null,
  isMuted: false,
  repeatMode: 'none',
  autoPlay: false,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setCurrentChapter: (currentBookId, currentChapter, currentVersionId) => 
    set({ currentBookId, currentChapter, currentVersionId, currentTime: 0, isPlaying: true }),
  setCurrentVerse: (currentVerse) => set({ currentVerse }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  setAutoPlay: (autoPlay) => set({ autoPlay }),
}));
