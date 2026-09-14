import { create } from 'zustand';
import { toast } from '@/context/ToastContext';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';

export interface AmbientMusicTrack {
  id: string;
  label: string;
  file_path: string;
  url: string;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
}

export type MusicLoopMode = 'shuffle' | 'repeat-all' | 'repeat-one';
export type RepeatMode = 'off' | 'repeat-all' | 'repeat-one';

interface AmbientMusicState {
  currentTrack: AmbientMusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  tracks: AmbientMusicTrack[];
  loading: boolean;
  error: string | null;
  offlinePlayableTrackIds: string[];

  // Shuffle & Repeat State
  isShuffle: boolean;
  repeatMode: RepeatMode;
  musicLoopMode: MusicLoopMode;
  unplayedShuffleIds: string[];
  playbackHistory: string[];

  // Actions
  fetchTracks: () => Promise<void>;
  checkOfflineAvailability: () => Promise<void>;
  play: (track: AmbientMusicTrack, preserveShufflePool?: boolean) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  togglePlay: (track: AmbientMusicTrack) => void;
  restoreSession: () => void;

  setShuffle: (shuffle: boolean) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setMusicLoopMode: (mode: MusicLoopMode | 'off') => void;
  cycleMusicLoopMode: () => void;
  playNext: (userInitiated?: boolean) => void;
  playPrevious: () => void;
}

// Module-level audio element singleton
let globalAudio: HTMLAudioElement | null = null;
let lastSaveTime = 0;

const getPlayableTracks = (tracks: AmbientMusicTrack[], offlinePlayableTrackIds: string[]): AmbientMusicTrack[] => {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (isOffline && offlinePlayableTrackIds && offlinePlayableTrackIds.length > 0) {
    const offlineTracks = tracks.filter((t) => offlinePlayableTrackIds.includes(t.id));
    if (offlineTracks.length > 0) return offlineTracks;
  }
  return tracks;
};

const isTrackAudioCached = async (trackId: string, url: string): Promise<boolean> => {
  try {
    const localBlob = await ModuleOfflineService.getCache<Blob>(`ambient_audio_${trackId}`);
    if (localBlob && localBlob.size > 0) return true;
    if (typeof caches !== 'undefined') {
      const match = await caches.match(url);
      if (match) return true;
    }
  } catch (err) {
    console.warn('[AmbientMusic] Error checking cached audio:', err);
  }
  return false;
};

const cacheTrackAudioInBackground = (track: AmbientMusicTrack, onComplete?: () => void) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  if (!track.url) return;

  fetch(track.url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => {
      if (blob && blob.size > 0) {
        ModuleOfflineService.saveCache(`ambient_audio_${track.id}`, blob)
          .then(() => {
            if (onComplete) onComplete();
          })
          .catch(() => {});
      }
    })
    .catch((err) => {
      console.warn('[AmbientMusic] Background audio cache failed (non-critical):', err);
    });
};

const initAudio = (set: any, get: any) => {
  if (typeof window === 'undefined') return null;
  if (!globalAudio) {
    globalAudio = new Audio();
    globalAudio.preload = 'metadata';

    globalAudio.addEventListener('timeupdate', () => {
      if (!globalAudio) return;
      const currentTime = globalAudio.currentTime;
      set({ currentTime });

      // Throttle localStorage updates to once every 2 seconds
      const now = Date.now();
      if (now - lastSaveTime > 2000) {
        localStorage.setItem('ambient-music-current-time', currentTime.toString());
        lastSaveTime = now;
      }
    });

    globalAudio.addEventListener('durationchange', () => {
      if (globalAudio) {
        set({ duration: globalAudio.duration || 0 });
      }
    });

    globalAudio.addEventListener('ended', () => {
      const state = get();
      if (state.repeatMode === 'repeat-one' && state.currentTrack) {
        if (globalAudio) {
          globalAudio.currentTime = 0;
          globalAudio.play().catch((err) => console.error('Replay failed:', err));
        }
        set({ isPlaying: true, currentTime: 0 });
        return;
      }

      state.playNext(false);
    });

    globalAudio.addEventListener('play', () => {
      set({ isPlaying: true });
    });

    globalAudio.addEventListener('pause', () => {
      set({ isPlaying: false });
    });

    globalAudio.addEventListener('error', (e) => {
      console.error('Ambient Audio Error:', e);
      set({ isPlaying: false });
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        toast.info('Audio track is unavailable offline.');
      } else {
        toast.error('Unable to load audio. Please try again later.');
      }
    });

    // Wire MediaSession API if available
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          const { currentTrack } = get();
          if (currentTrack) get().play(currentTrack);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          get().pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          get().playPrevious();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          get().playNext(true);
        });
      } catch (err) {
        console.warn('[AmbientMusic] MediaSession handler setup failed:', err);
      }
    }
  }
  return globalAudio;
};

export const useAmbientMusicStore = create<AmbientMusicState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  tracks: [],
  loading: false,
  error: null,
  offlinePlayableTrackIds: [],

  // Default to shuffle mode as originally presented in BibleReaderPage
  isShuffle: true,
  repeatMode: 'repeat-all',
  musicLoopMode: 'shuffle',
  unplayedShuffleIds: [],
  playbackHistory: [],

  setMusicLoopMode: (mode: MusicLoopMode | 'off') => {
    if (mode === 'shuffle') {
      const { currentTrack, tracks, offlinePlayableTrackIds } = get();
      const playable = getPlayableTracks(tracks, offlinePlayableTrackIds);
      const unplayed = currentTrack
        ? playable.filter((t) => t.id !== currentTrack.id).map((t) => t.id)
        : playable.map((t) => t.id);

      set({
        musicLoopMode: 'shuffle',
        isShuffle: true,
        repeatMode: 'repeat-all',
        unplayedShuffleIds: unplayed,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ambient-music-loop-mode', 'shuffle');
      }
    } else if (mode === 'repeat-all') {
      set({
        musicLoopMode: 'repeat-all',
        isShuffle: false,
        repeatMode: 'repeat-all',
        unplayedShuffleIds: [],
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ambient-music-loop-mode', 'repeat-all');
      }
    } else if (mode === 'repeat-one') {
      set({
        musicLoopMode: 'repeat-one',
        isShuffle: false,
        repeatMode: 'repeat-one',
        unplayedShuffleIds: [],
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ambient-music-loop-mode', 'repeat-one');
      }
    } else if (mode === 'off') {
      set({
        musicLoopMode: 'repeat-all',
        isShuffle: false,
        repeatMode: 'off',
        unplayedShuffleIds: [],
      });
    }
  },

  cycleMusicLoopMode: () => {
    const modes: MusicLoopMode[] = ['shuffle', 'repeat-all', 'repeat-one'];
    const current = get().musicLoopMode;
    const nextMode = modes[(modes.indexOf(current) + 1) % modes.length];
    get().setMusicLoopMode(nextMode);
  },

  setShuffle: (shuffle: boolean) => {
    const { currentTrack, tracks, offlinePlayableTrackIds, repeatMode } = get();
    const playable = getPlayableTracks(tracks, offlinePlayableTrackIds);
    const unplayed = shuffle && currentTrack
      ? playable.filter((t) => t.id !== currentTrack.id).map((t) => t.id)
      : [];

    let updatedMusicLoopMode: MusicLoopMode = 'repeat-all';
    if (shuffle) {
      updatedMusicLoopMode = 'shuffle';
    } else if (repeatMode === 'repeat-one') {
      updatedMusicLoopMode = 'repeat-one';
    }

    set({
      isShuffle: shuffle,
      unplayedShuffleIds: unplayed,
      musicLoopMode: updatedMusicLoopMode,
    });
  },

  toggleShuffle: () => {
    get().setShuffle(!get().isShuffle);
  },

  setRepeatMode: (mode: RepeatMode) => {
    let updatedMusicLoopMode: MusicLoopMode = get().musicLoopMode;
    if (mode === 'repeat-one') {
      updatedMusicLoopMode = 'repeat-one';
    } else if (mode === 'repeat-all' && !get().isShuffle) {
      updatedMusicLoopMode = 'repeat-all';
    }

    set({
      repeatMode: mode,
      musicLoopMode: updatedMusicLoopMode,
    });
  },

  playNext: (userInitiated = false) => {
    const { tracks, offlinePlayableTrackIds, currentTrack, isShuffle, repeatMode } = get();
    const playableTracks = getPlayableTracks(tracks, offlinePlayableTrackIds);

    if (!playableTracks || playableTracks.length === 0) {
      get().stop();
      return;
    }

    // 1. Single-track playlist
    if (playableTracks.length === 1) {
      if (userInitiated) {
        get().play(playableTracks[0], true);
      } else {
        if (repeatMode === 'off') {
          get().stop();
        } else {
          get().play(playableTracks[0], true);
        }
      }
      return;
    }

    // 2. Repeat-one when natural track end occurs
    if (!userInitiated && repeatMode === 'repeat-one' && currentTrack) {
      get().play(currentTrack, true);
      return;
    }

    // 3. Shuffle Mode
    if (isShuffle) {
      const { unplayedShuffleIds } = get();
      const currentTrackId = currentTrack?.id;
      const validUnplayed = unplayedShuffleIds.filter(
        (id) => id !== currentTrackId && playableTracks.some((t) => t.id === id)
      );

      if (validUnplayed.length > 0) {
        const randomIndex = Math.floor(Math.random() * validUnplayed.length);
        const nextTrackId = validUnplayed[randomIndex];
        const nextTrack = playableTracks.find((t) => t.id === nextTrackId)!;
        const updatedUnplayed = validUnplayed.filter((id) => id !== nextTrackId);

        set({
          unplayedShuffleIds: updatedUnplayed,
          playbackHistory: [...get().playbackHistory, currentTrackId].filter(Boolean) as string[],
        });

        get().play(nextTrack, true);
      } else {
        // Pool exhausted
        if (!userInitiated && repeatMode === 'off') {
          get().stop();
          return;
        }

        // Start new shuffle cycle, avoiding immediate replay of current track
        const candidates = playableTracks.filter((t) => t.id !== currentTrackId);
        const pool = candidates.length > 0 ? candidates : playableTracks;
        const randomIndex = Math.floor(Math.random() * pool.length);
        const nextTrack = pool[randomIndex];

        const newUnplayed = playableTracks
          .filter((t) => t.id !== nextTrack.id)
          .map((t) => t.id);

        set({
          unplayedShuffleIds: newUnplayed,
          playbackHistory: [...get().playbackHistory, currentTrackId].filter(Boolean) as string[],
        });

        get().play(nextTrack, true);
      }
      return;
    }

    // 4. Sequential Mode (Shuffle is OFF)
    const currentIndex = currentTrack
      ? playableTracks.findIndex((t) => t.id === currentTrack.id)
      : -1;

    if (currentIndex === -1 || currentIndex >= playableTracks.length - 1) {
      if (!userInitiated && repeatMode === 'off') {
        get().stop();
        return;
      }
      if (repeatMode === 'repeat-all' || userInitiated) {
        const nextTrack = playableTracks[0];
        set({
          playbackHistory: [...get().playbackHistory, currentTrack?.id].filter(Boolean) as string[],
        });
        get().play(nextTrack, true);
      } else {
        get().stop();
      }
    } else {
      const nextTrack = playableTracks[currentIndex + 1];
      set({
        playbackHistory: [...get().playbackHistory, currentTrack?.id].filter(Boolean) as string[],
      });
      get().play(nextTrack, true);
    }
  },

  playPrevious: () => {
    const { tracks, offlinePlayableTrackIds, currentTrack, currentTime, playbackHistory, repeatMode } = get();
    const playableTracks = getPlayableTracks(tracks, offlinePlayableTrackIds);

    if (!playableTracks || playableTracks.length === 0) return;

    if (currentTime > 3 && globalAudio) {
      get().seek(0);
      return;
    }

    if (playbackHistory.length > 0) {
      const newHistory = [...playbackHistory];
      const prevTrackId = newHistory.pop()!;
      const prevTrack = playableTracks.find((t) => t.id === prevTrackId);
      if (prevTrack) {
        set({ playbackHistory: newHistory });
        get().play(prevTrack, true);
        return;
      }
    }

    const currentIndex = currentTrack
      ? playableTracks.findIndex((t) => t.id === currentTrack.id)
      : -1;

    if (currentIndex <= 0) {
      if (repeatMode === 'repeat-all') {
        const prevTrack = playableTracks[playableTracks.length - 1];
        get().play(prevTrack, true);
      } else {
        get().seek(0);
      }
    } else {
      const prevTrack = playableTracks[currentIndex - 1];
      get().play(prevTrack, true);
    }
  },

  checkOfflineAvailability: async () => {
    const { tracks } = get();
    if (!tracks || tracks.length === 0) return;
    const availableIds: string[] = [];
    for (const t of tracks) {
      const isCached = await isTrackAudioCached(t.id, t.url);
      if (isCached) availableIds.push(t.id);
    }
    set({ offlinePlayableTrackIds: availableIds });
  },

  fetchTracks: async () => {
    set({ loading: true, error: null });

    // 1. Immediate hydration from IndexedDB cache
    try {
      const cached = await ModuleOfflineService.getCache<AmbientMusicTrack[]>('ambient_music_tracks');
      if (cached && Array.isArray(cached) && cached.length > 0) {
        set({ tracks: cached, loading: false });
        get().checkOfflineAvailability();
      }
    } catch (e) {
      console.warn('[AmbientMusic] Local cache read error:', e);
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      set({ loading: false });
      return;
    }

    // 2. Fetch from server when online
    try {
      const res = await fetch('/api/ambient-music');
      const data = await res.json();
      if (data.success) {
        const fetchedTracks = data.data || [];
        set({ tracks: fetchedTracks, loading: false });
        await ModuleOfflineService.saveCache('ambient_music_tracks', fetchedTracks);
        get().checkOfflineAvailability();

        // Check if current playing track was deleted by admin
        const { currentTrack } = get();
        if (currentTrack) {
          const stillExists = fetchedTracks.some((t: AmbientMusicTrack) => t.id === currentTrack.id);
          if (!stillExists) {
            get().stop();
            set({ currentTrack: null });
            localStorage.removeItem('ambient-music-current-track');
            localStorage.removeItem('ambient-music-current-time');
            toast.error('This track is no longer available.');
          }
        }
      } else {
        set({ error: data.error || 'Failed to fetch tracks', loading: false });
      }
    } catch (err: any) {
      console.error('Fetch ambient tracks error:', err);
      // Valid local data wins: do not clear tracks if cached tracks exist
      set((prev) => ({
        error: prev.tracks.length === 0 ? err.message || 'Failed to fetch tracks' : null,
        loading: false,
      }));
    }
  },

  play: async (track: AmbientMusicTrack, preserveShufflePool = false) => {
    const audio = initAudio(set, get);
    if (!audio) return;

    // 1. Update track, shuffle pool, and history synchronously for instant UI responsiveness
    const { currentTrack, tracks, offlinePlayableTrackIds, isShuffle, playbackHistory } = get();
    const playableTracks = getPlayableTracks(tracks, offlinePlayableTrackIds);

    const unplayed = preserveShufflePool
      ? get().unplayedShuffleIds
      : isShuffle
      ? playableTracks.filter((t) => t.id !== track.id).map((t) => t.id)
      : [];

    const updatedHistory = currentTrack && currentTrack.id !== track.id
      ? [...playbackHistory.slice(-20), currentTrack.id]
      : playbackHistory;

    if (currentTrack?.id !== track.id) {
      set({
        currentTrack: track,
        isPlaying: true,
        currentTime: 0,
        duration: 0,
        unplayedShuffleIds: unplayed,
        playbackHistory: updatedHistory,
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('ambient-music-current-track', JSON.stringify(track));
        localStorage.setItem('ambient-music-current-time', '0');
      }
    } else {
      set({
        isPlaying: true,
        ...(preserveShufflePool ? {} : { unplayedShuffleIds: unplayed }),
      });
    }

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // 2. Check for locally cached audio blob first
    let resolvedAudioSrc = track.url;
    let hasLocalAudio = false;

    try {
      const localBlob = await ModuleOfflineService.getCache<Blob>(`ambient_audio_${track.id}`);
      if (localBlob && localBlob.size > 0) {
        resolvedAudioSrc = URL.createObjectURL(localBlob);
        hasLocalAudio = true;
      }
    } catch (err) {
      console.warn('[AmbientMusic] Error retrieving local audio blob:', err);
    }

    // 3. If no blob in IndexedDB, check Cache API
    if (!hasLocalAudio && typeof caches !== 'undefined') {
      try {
        const match = await caches.match(track.url);
        if (match) {
          const cachedBlob = await match.blob();
          if (cachedBlob && cachedBlob.size > 0) {
            resolvedAudioSrc = URL.createObjectURL(cachedBlob);
            hasLocalAudio = true;
          }
        }
      } catch {}
    }

    // 4. If offline and no local audio is available, handle gracefully
    if (isOffline && !hasLocalAudio) {
      set({ isPlaying: false });
      toast.info(`"${track.label}" is not downloaded for offline playback. Connect to the internet to listen.`);
      return;
    }

    // 5. Load and play audio element
    if (audio.src !== resolvedAudioSrc) {
      audio.src = resolvedAudioSrc;
      audio.load();
    }

    audio.play().catch((err) => {
      console.error('Playback failed:', err);
      if (isOffline) {
        toast.info(`"${track.label}" is unavailable offline.`);
      } else {
        toast.error('Unable to load audio. Please try again later.');
      }
    });

    // Update MediaSession metadata if supported
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && (window as any).MediaMetadata) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.label,
          artist: 'Ambient Sound',
          artwork: track.thumbnail_url
            ? [{ src: track.thumbnail_url, sizes: '512x512', type: 'image/jpeg' }]
            : [],
        });
      } catch {}
    }

    // 5. If online and not yet cached locally, cache in background
    if (!isOffline && !hasLocalAudio) {
      cacheTrackAudioInBackground(track, () => {
        get().checkOfflineAvailability();
      });
    }
  },

  pause: () => {
    const audio = initAudio(set, get);
    if (audio) {
      audio.pause();
      localStorage.setItem('ambient-music-current-time', audio.currentTime.toString());
    }
  },

  stop: () => {
    const audio = initAudio(set, get);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      set({ isPlaying: false, currentTime: 0 });
      localStorage.removeItem('ambient-music-current-time');
    }
  },

  seek: (time: number) => {
    const audio = initAudio(set, get);
    if (audio) {
      audio.currentTime = time;
      set({ currentTime: time });
      localStorage.setItem('ambient-music-current-time', time.toString());
    }
  },

  togglePlay: (track: AmbientMusicTrack) => {
    const { currentTrack, isPlaying } = get();
    if (currentTrack?.id === track.id && isPlaying) {
      get().pause();
    } else {
      get().play(track);
    }
  },

  restoreSession: async () => {
    if (typeof window === 'undefined') return;

    // 1. If audio is ALREADY playing or active in the global singleton, do NOT disturb or reload it!
    const { currentTrack, isPlaying } = get();
    if (globalAudio && (!globalAudio.paused || isPlaying)) {
      if (!isPlaying && !globalAudio.paused) {
        set({ isPlaying: true });
      }
      return;
    }

    const savedLoopMode = localStorage.getItem('ambient-music-loop-mode') as MusicLoopMode | null;
    if (savedLoopMode && ['shuffle', 'repeat-all', 'repeat-one'].includes(savedLoopMode)) {
      get().setMusicLoopMode(savedLoopMode);
    }

    // If currentTrack is already loaded in memory, do not re-load from scratch
    if (currentTrack && globalAudio && globalAudio.src) {
      return;
    }

    const savedTrackJson = localStorage.getItem('ambient-music-current-track');
    const savedTimeStr = localStorage.getItem('ambient-music-current-time');

    if (savedTrackJson) {
      try {
        const track = JSON.parse(savedTrackJson);
        const audio = initAudio(set, get);
        if (audio) {
          // Double check audio is not playing before loading
          if (!audio.paused) {
            set({ currentTrack: track, isPlaying: true });
            return;
          }

          let resolvedSrc = track.url;
          try {
            const localBlob = await ModuleOfflineService.getCache<Blob>(`ambient_audio_${track.id}`);
            if (localBlob && localBlob.size > 0) {
              resolvedSrc = URL.createObjectURL(localBlob);
            }
          } catch {}

          if (audio.src !== resolvedSrc) {
            audio.src = resolvedSrc;
            audio.load();
          }

          const savedTime = parseFloat(savedTimeStr || '0');
          if (!isNaN(savedTime) && savedTime > 0) {
            audio.currentTime = savedTime;
            set({ currentTrack: track, currentTime: savedTime, isPlaying: false });
          } else {
            set({ currentTrack: track, currentTime: 0, isPlaying: false });
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
      }
    }
  },
}));
