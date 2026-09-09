import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { fetchWithOfflineCache } from '@/lib/offline';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';

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

        // 1. Optimistic Update in store
        set((state) => {
          const prevAll = state.allProgress.filter(
            p => !(p.bookId === data.bookId && p.chapter === data.chapter && p.versionId === data.versionId)
          );
          const newAll = [progressItem, ...prevAll];
          return {
            latestProgress: progressItem,
            allProgress: newAll,
          };
        });

        // 2. Logic based on Auth
        if (userId) {
          const currentItems = get().allProgress;
          await ModuleOfflineService.saveCache(`reading_progress_${userId}`, currentItems).catch(() => {});

          const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
          if (!isOnline) {
            await PendingActionsService.enqueue(
              'save_reading_progress',
              '/api/user/reading-progress',
              'POST',
              progressItem as unknown as Record<string, unknown>
            );
            return;
          }

          try {
            const res = await fetch('/api/user/reading-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(progressItem),
            });
            if (!res.ok) throw new Error('Failed to save to cloud');
            
            const result = await res.json();
            if (result.success && result.data) {
              // updated successfully
            }
          } catch (err: any) {
            console.error('Cloud save failed, queueing offline pending action:', err);
            await PendingActionsService.enqueue(
              'save_reading_progress',
              '/api/user/reading-progress',
              'POST',
              progressItem as unknown as Record<string, unknown>
            );
          }
        }
      },

      loadProgress: async (userId) => {
        set({ isLoading: true });
        try {
          if (userId) {
            const items = await fetchWithOfflineCache<ProgressItem[]>(
              `reading_progress_${userId}`,
              async () => {
                const res = await fetch('/api/user/reading-progress?latest=false');
                if (!res.ok) throw new Error('Failed to fetch reading progress');
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'Failed to fetch');
                return (result.data || []).map((item: any) => ({
                  bookId: item.bookId,
                  bookName: item.bookName,
                  chapter: item.chapter,
                  versionId: item.versionId,
                  versionName: item.versionName,
                  lastReadAt: item.lastReadAt,
                  completed: item.completed,
                  progressPercent: item.progressPercent,
                }));
              }
            );

            if (items && Array.isArray(items)) {
              set({ 
                allProgress: items,
                latestProgress: items.length > 0 ? items[0] : null 
              });
            }
          }
        } catch (err: any) {
          set({ error: err.message });
        } finally {
          set({ isLoading: false });
        }
      },

      syncGuestToUser: async (userId) => {
        const guestItems = get().allProgress;
        if (guestItems.length === 0) return;

        try {
          const res = await fetch('/api/user/reading-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(guestItems),
          });

          if (res.ok) {
            set({ allProgress: [], latestProgress: null });
            
            const loadRes = await fetch('/api/user/reading-progress?latest=false');
            if (loadRes.ok) {
              const result = await loadRes.json();
              if (result.success) {
                const items = (result.data || []).map((item: any) => ({
                  bookId: item.bookId,
                  bookName: item.bookName,
                  chapter: item.chapter,
                  versionId: item.versionId,
                  versionName: item.versionName,
                  lastReadAt: item.lastReadAt,
                  completed: item.completed,
                  progressPercent: item.progressPercent,
                }));
                set({ 
                  allProgress: items, 
                  latestProgress: items.length > 0 ? items[0] : null 
                });
                ModuleOfflineService.saveCache(`reading_progress_${userId}`, items).catch(() => {});
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
      partialize: (state) => {
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
