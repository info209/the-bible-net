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

interface AmbientMusicState {
  currentTrack: AmbientMusicTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  tracks: AmbientMusicTrack[];
  loading: boolean;
  error: string | null;
  offlinePlayableTrackIds: string[];

  fetchTracks: () => Promise<void>;
  checkOfflineAvailability: () => Promise<void>;
  play: (track: AmbientMusicTrack) => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  togglePlay: (track: AmbientMusicTrack) => void;
  restoreSession: () => void;
}

// Module-level audio element singleton
let globalAudio: HTMLAudioElement | null = null;
let lastSaveTime = 0;

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
      set({ isPlaying: false, currentTime: 0 });
      localStorage.removeItem('ambient-music-current-time');
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
      set(prev => ({
        error: prev.tracks.length === 0 ? (err.message || 'Failed to fetch tracks') : null,
        loading: false,
      }));
    }
  },

  play: async (track: AmbientMusicTrack) => {
    const audio = initAudio(set, get);
    if (!audio) return;

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // 1. Check for locally cached audio blob first
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

    // 2. If no blob in IndexedDB, check Cache API
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

    // 3. If offline and no local audio is available, handle gracefully
    if (isOffline && !hasLocalAudio) {
      toast.info(`"${track.label}" is not downloaded for offline playback. Connect to the internet to listen.`);
      return;
    }

    // 4. Set track and play
    const { currentTrack } = get();
    if (currentTrack?.id !== track.id || audio.src !== resolvedAudioSrc) {
      audio.src = resolvedAudioSrc;
      audio.load();
      set({ currentTrack: track, currentTime: 0, duration: 0 });
      localStorage.setItem('ambient-music-current-track', JSON.stringify(track));
      localStorage.setItem('ambient-music-current-time', '0');
    }

    audio.play().catch(err => {
      console.error('Playback failed:', err);
      if (isOffline) {
        toast.info(`"${track.label}" is unavailable offline.`);
      } else {
        toast.error('Unable to load audio. Please try again later.');
      }
    });

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
    const savedTrackJson = localStorage.getItem('ambient-music-current-track');
    const savedTimeStr = localStorage.getItem('ambient-music-current-time');

    if (savedTrackJson) {
      try {
        const track = JSON.parse(savedTrackJson);
        const audio = initAudio(set, get);
        if (audio) {
          let resolvedSrc = track.url;
          try {
            const localBlob = await ModuleOfflineService.getCache<Blob>(`ambient_audio_${track.id}`);
            if (localBlob && localBlob.size > 0) {
              resolvedSrc = URL.createObjectURL(localBlob);
            }
          } catch {}

          audio.src = resolvedSrc;
          audio.load();
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
