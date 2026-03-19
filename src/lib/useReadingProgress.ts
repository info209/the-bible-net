import { useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useReadingProgressStore, ProgressItem } from './readingProgressStore';
import { debounce } from '@/utils/debounce';

export function useReadingProgress() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  
  const { 
    latestProgress, 
    allProgress, 
    isLoading, 
    saveProgress: storeSaveProgress, 
    loadProgress: storeLoadProgress,
    syncGuestToUser,
    setUserId,
    resetAll
  } = useReadingProgressStore();

  // Initial load
  useEffect(() => {
    if (status !== 'loading') {
      setUserId(userId || null);
      if (status === 'unauthenticated') {
          resetAll();
      }
      storeLoadProgress(userId);
    }
  }, [userId, status, storeLoadProgress, setUserId, resetAll]);

  // Sync guest progress to user on login
  useEffect(() => {
    if (status === 'authenticated' && userId) {
      // Check if there's any guest progress to sync
      const guestProgress = localStorage.getItem('reading_progress_guest');
      if (guestProgress) {
          syncGuestToUser(userId).then(() => {
              // Note: store handles clearing or reloading if needed
              // or we can manually clear here if preferred 
              // but syncGuestToUser in store already does it by fetching from server
          });
      }
    }
  }, [status, userId, syncGuestToUser]);

  // Debounced save
  const debouncedSave = useMemo(
    () => debounce((data: Omit<ProgressItem, 'lastReadAt'>, uid?: string) => {
        storeSaveProgress(data, uid);
    }, 1000),
    [storeSaveProgress]
  );

  const updateProgress = useCallback((data: Omit<ProgressItem, 'lastReadAt'>) => {
    // Check if it's the same as latest to avoid redundant writes
    if (
        latestProgress?.bookId === data.bookId && 
        latestProgress?.chapter === data.chapter && 
        latestProgress?.versionId === data.versionId &&
        (!data.completed || latestProgress.completed)
    ) {
        return;
    }

    console.log("Saving progress:", data);
    debouncedSave(data, userId);
  }, [latestProgress, userId, debouncedSave]);

  return {
    latestProgress,
    allProgress,
    isLoading,
    updateProgress,
    status
  };
}
