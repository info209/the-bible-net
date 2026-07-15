import { create } from 'zustand';
import { toast } from '@/context/ToastContext';

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

  fetchTracks: () => Promise<void>;
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
      toast.error('Unable to load audio. Please try again later.');
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

  fetchTracks: async () => {
    set({ loading: true, error: null });
    try {
        const res = await fetch('/api/ambient-music');
        const data = await res.json();
        if (data.success) {
            const fetchedTracks = data.data || [];
            set({ tracks: fetchedTracks, loading: false });

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
        set({ error: err.message || 'Failed to fetch tracks', loading: false });
    }
  },

  play: (track: AmbientMusicTrack) => {
    const audio = initAudio(set, get);
    if (!audio) return;

    const { currentTrack } = get();
    if (currentTrack?.id !== track.id) {
        audio.src = track.url;
        audio.load();
        set({ currentTrack: track, currentTime: 0, duration: 0 });
        localStorage.setItem('ambient-music-current-track', JSON.stringify(track));
        localStorage.setItem('ambient-music-current-time', '0');
    }

    audio.play().catch(err => {
        console.error('Playback failed:', err);
        toast.error('Unable to load audio. Please try again later.');
    });
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

  restoreSession: () => {
    if (typeof window === 'undefined') return;
    const savedTrackJson = localStorage.getItem('ambient-music-current-track');
    const savedTimeStr = localStorage.getItem('ambient-music-current-time');

    if (savedTrackJson) {
        try {
            const track = JSON.parse(savedTrackJson);
            const audio = initAudio(set, get);
            if (audio) {
                audio.src = track.url;
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
  }
}));
