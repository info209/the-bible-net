import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ProgressItem {
  bookId: string;
  bookName?: string;
  chapter: number;
  versionId: string;
  versionName?: string;
  lastReadAt: string;
  completed?: boolean;
  progressPercent?: number;
}

interface ReadingProgressState {
  latestProgress: ProgressItem | null;
  allProgress: ProgressItem[];
  isLoading: boolean;
  error: string | null;
  userId: string | null;

  // Actions
  setLatestProgress: (progress: ProgressItem | null) => void;
  setAllProgress: (progress: ProgressItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUserId: (userId: string | null) => void;
  resetAll: () => void;
  
  // High-level Actions (to be used by hooks)
  saveProgress: (
    data: Omit<ProgressItem, 'lastReadAt'>, 
    userId?: string
  ) => Promise<void>;
  loadProgress: (userId?: string) => Promise<void>;
  syncGuestToUser: (userId: string) => Promise<void>;
}

const GUEST_STORAGE_KEY = 'reading_progress_guest';

export const useReadingProgressStore = create<ReadingProgressState>()(
  persist(
    (set, get) => ({
      latestProgress: null,
      allProgress: [] as ProgressItem[],
      isLoading: false,
      error: null,
      userId: null,

      setLatestProgress: (latestProgress) => set({ latestProgress }),
      setAllProgress: (allProgress) => set({ allProgress }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setUserId: (userId) => set({ userId }),
      resetAll: () => set({ latestProgress: null, allProgress: [] as ProgressItem[], error: null }),

      saveProgress: async (data, userId) => {
        const timestamp = new Date().toISOString();
        const progressItem: ProgressItem = { ...data, lastReadAt: timestamp };

        // 1. Optimistic Update
        set({ latestProgress: progressItem });

        // 2. Logic based on Auth
        if (userId) {
          try {
            const res = await fetch('/api/user/reading-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(progressItem),
            });
            if (!res.ok) throw new Error('Failed to save to cloud');
            
            // Refresh from server to ensure consistency
            const result = await res.json();
            if (result.success && result.data) {
                // Update with server returned data if needed
            }
          } catch (err: any) {
            console.error('Cloud save failed:', err);
            // Fallback: stay in local state (handled by persist middleware below)
          }
        } else {
          // Guest Logic: handled by persist middleware automatically 
          // but we can also manually manage if preferred.
          // Since we use 'persist', the state will go to localStorage.
          // However, the user specifically asked for 'reading_progress_guest' key.
        }
      },

      loadProgress: async (userId) => {
        set({ isLoading: true });
        try {
          if (userId) {
            const res = await fetch('/api/user/reading-progress?latest=false');
            if (res.ok) {
              const result = await res.json();
              if (result.success) {
                const items = result.data.map((item: any) => ({
                    bookId: item.bookId,
                    bookName: item.bookName,
                    chapter: item.chapter,
                    versionId: item.versionId,
                    versionName: item.versionName,
                    lastReadAt: item.lastReadAt,
                    completed: item.completed,
                    progressPercent: item.progressPercent
                }));
                set({ 
                    allProgress: items,
                    latestProgress: items.length > 0 ? items[0] : null 
                });
              }
            }
          } else {
            // Guest logic: already loaded by persist middleware
          }
        } catch (err: any) {
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      syncGuestToUser: async (userId) => {
        // Find guest items in current state
        const guestItems = get().allProgress;
        if (guestItems.length === 0) return;

        try {
          const res = await fetch('/api/user/reading-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestItems),
          });

          if (res.ok) {
            console.log('Synced guest progress to user');
            
            // Clear current state and localStorage
            set({ allProgress: [], latestProgress: null });
            // The persist middleware will clear the storage since the state is now empty
            
            // Reload from server to get merged state
            const loadRes = await fetch('/api/user/reading-progress?latest=false');
            if (loadRes.ok) {
                const result = await loadRes.json();
                if (result.success) {
                    const items = result.data.map((item: any) => ({
                        bookId: item.bookId,
                        bookName: item.bookName,
                        chapter: item.chapter,
                        versionId: item.versionId,
                        versionName: item.versionName,
                        lastReadAt: item.lastReadAt,
                        completed: item.completed,
                        progressPercent: item.progressPercent
                    }));
                    set({ 
                        allProgress: items, 
                        latestProgress: items.length > 0 ? items[0] : null 
                    });
                }
            }
          }
        } catch (err) {
          console.error('Sync failed:', err);
        }
      }
    }),
    {
      name: GUEST_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist when NOT logged in? 
      // Actually, persist always, but we handle DB sync separately.
      // If we are logged in, we sync then we could potentially stop persisting 
      // but keeping it doesn't hurt for offline.
      partialize: (state) => {
          // IMPORTANT: Only persist to localStorage for GUESTS.
          // If we have a userId, this is user-specific data that should NOT be in the guest storage.
          if (state.userId) {
              return { latestProgress: null, allProgress: [] };
          }
          return { 
              latestProgress: state.latestProgress, 
              allProgress: state.allProgress 
          };
      },
    }
  )
);
