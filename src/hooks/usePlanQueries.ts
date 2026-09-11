import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline/queryOfflineFallback';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { PendingActionsService } from '@/lib/offline/PendingActionsService';
import { Plan, PlanWithProgress, PlanProgress } from '@/types/plan';

/**
 * Fetch plans for a given tab ('my-plans' | 'find-plans' | 'saved' | 'completed')
 */
export function useUserLibrary(tab: 'my-plans' | 'find-plans' | 'saved' | 'completed' = 'my-plans') {
  return useQuery({
    queryKey: ['plans', 'library', tab],
    queryFn: async () => {
      const cacheKey = `library_plans_${tab}`;
      try {
        return await fetchWithOfflineCache(cacheKey, async () => {
          const res = await fetch(`/api/v1/plans/user/library?tab=${tab}`);
          if (!res.ok) {
            if (res.status === 401 && tab !== 'find-plans') {
              return [];
            }
            throw new Error('Failed to fetch plans');
          }
          const json = await res.json();
          return json.data || [];
        });
      } catch (err) {
        // Fallback to IndexedDB cache on network error
        const cached = await ModuleOfflineService.getCache<any[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          return cached;
        }
        // When offline or failed and no cache, return empty array without fatal error
        return [];
      }
    },
    staleTime: 1000 * 60 * 2, // 2 mins
    networkMode: 'offlineFirst',
    retry: (failureCount) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return failureCount < 1;
    },
    refetchOnMount: typeof navigator !== 'undefined' && !navigator.onLine ? false : true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch catalog plans with optional search query & category
 */
export function useFindPlans(search: string = '', category: string = '') {
  const cacheKey = `find_plans_${search}_${category}`;
  return useQuery({
    queryKey: ['plans', 'find', search, category],
    queryFn: async () => {
      try {
        return await fetchWithOfflineCache(cacheKey, async () => {
          const queryParams = new URLSearchParams();
          if (search) queryParams.set('search', search);
          if (category) queryParams.set('category', category);

          const res = await fetch(`/api/v1/plans?${queryParams.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch discovery plans');
          const json = await res.json();
          return (json.data?.plans || json.data || []) as Plan[];
        });
      } catch (err) {
        // Fallback to specific search cache
        const cached = await ModuleOfflineService.getCache<Plan[]>(cacheKey);
        if (cached && Array.isArray(cached)) return cached;
        // Fallback to base find_plans__ cache if search was empty
        if (!search && !category) {
          const baseCache = await ModuleOfflineService.getCache<Plan[]>('find_plans__');
          if (baseCache && Array.isArray(baseCache)) return baseCache;
        }
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    networkMode: 'offlineFirst',
    retry: (failureCount) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return failureCount < 1;
    },
    refetchOnMount: typeof navigator !== 'undefined' && !navigator.onLine ? false : true,
    refetchOnWindowFocus: false,
  });
}

/**
 * Fetch details of a single plan + user progress
 */
export function usePlanDetails(planId: string) {
  return useQuery({
    queryKey: ['plan', planId],
    queryFn: async () => {
      const cacheKey = `plan_details_${planId}`;
      try {
        return await fetchWithOfflineCache(cacheKey, async () => {
          const res = await fetch(`/api/v1/plans/${planId}`);
          if (!res.ok) throw new Error('Failed to fetch plan details');
          const json = await res.json();
          return json.data as PlanWithProgress;
        });
      } catch (err) {
        const cached = await ModuleOfflineService.getCache<PlanWithProgress>(cacheKey);
        if (cached) return cached;
        throw err;
      }
    },
    enabled: Boolean(planId),
    staleTime: 1000 * 30, // 30 seconds
    networkMode: 'offlineFirst',
    retry: (failureCount) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return failureCount < 1;
    },
    refetchOnMount: typeof navigator !== 'undefined' && !navigator.onLine ? false : true,
  });
}

/**
 * Fetch related plans for a plan
 */
export function useRelatedPlans(planId: string) {
  return useQuery({
    queryKey: ['plans', 'related', planId],
    queryFn: () =>
      fetchWithOfflineCache(`related_plans_${planId}`, async () => {
        const res = await fetch(`/api/v1/plans/${planId}/related`);
        if (!res.ok) return [];
        const json = await res.json();
        return (json.data || []) as Plan[];
      }),
    enabled: Boolean(planId),
  });
}

/**
 * Fetch dynamic scripture passage text for a plan reading item
 */
export function usePlanScripture(planId: string, scriptureRef?: string, bibleVersion: string = 'NIV') {
  return useQuery({
    queryKey: ['plan-scripture', planId, scriptureRef, bibleVersion],
    queryFn: () =>
      fetchWithOfflineCache(`scripture_${scriptureRef}_${bibleVersion}`, async () => {
        if (!scriptureRef) return null;
        const res = await fetch(
          `/api/v1/plans/${planId}/scripture?ref=${encodeURIComponent(scriptureRef)}&version=${encodeURIComponent(bibleVersion)}`
        );
        if (!res.ok) throw new Error('Failed to fetch scripture content');
        const json = await res.json();
        return json.data;
      }),
    enabled: Boolean(scriptureRef),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Start/Enroll in a plan mutation
 */
export function useStartPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'save_plan',
          `/api/v1/plans/${planId}/start`,
          'POST',
          { planId }
        );
        return { success: true, offline: true };
      }

      try {
        const res = await fetch(`/api/v1/plans/${planId}/start`, {
          method: 'POST',
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to start plan');
        }
        return await res.json();
      } catch (err: any) {
        await PendingActionsService.enqueue(
          'save_plan',
          `/api/v1/plans/${planId}/start`,
          'POST',
          { planId }
        );
        return { success: true, offline: true };
      }
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'library'] });
    },
  });
}

/**
 * Complete a specific reading item mutation
 */
export function useCompleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, dayNumber, itemId }: { planId: string; dayNumber: number; itemId: string }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'complete_plan_item',
          `/api/v1/plans/${planId}/complete-item`,
          'POST',
          { dayNumber, itemId }
        );
        return { success: true, offline: true };
      }

      try {
        const res = await fetch(`/api/v1/plans/${planId}/complete-item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dayNumber, itemId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to complete item');
        }
        return await res.json();
      } catch (err: any) {
        await PendingActionsService.enqueue(
          'complete_plan_item',
          `/api/v1/plans/${planId}/complete-item`,
          'POST',
          { dayNumber, itemId }
        );
        return { success: true, offline: true };
      }
    },
    onMutate: async ({ planId, dayNumber, itemId }) => {
      await queryClient.cancelQueries({ queryKey: ['plan', planId] });
      const previousPlan = queryClient.getQueryData<PlanWithProgress>(['plan', planId]);

      if (previousPlan && previousPlan.progress) {
        const currentCompleted = previousPlan.progress.completedItemIds || [];
        const exists = currentCompleted.includes(itemId);
        if (!exists) {
          const updatedPlan: PlanWithProgress = {
            ...previousPlan,
            progress: {
              ...previousPlan.progress,
              completedItemIds: [...currentCompleted, itemId],
            },
          };
          queryClient.setQueryData(['plan', planId], updatedPlan);
          ModuleOfflineService.saveCache(`plan_details_${planId}`, updatedPlan).catch(() => {});
        }
      }

      return { previousPlan };
    },
    onSuccess: (data, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'library'] });
    },
  });
}

/**
 * Toggle save plan mutation
 */
export function useSavePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'save_plan',
          `/api/v1/plans/${planId}/save`,
          'POST',
          { planId }
        );
        return { success: true, offline: true };
      }

      try {
        const res = await fetch(`/api/v1/plans/${planId}/save`, {
          method: 'POST',
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to save plan');
        }
        return await res.json();
      } catch (err: any) {
        await PendingActionsService.enqueue(
          'save_plan',
          `/api/v1/plans/${planId}/save`,
          'POST',
          { planId }
        );
        return { success: true, offline: true };
      }
    },
    onSuccess: (_, planId) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'library'] });
    },
  });
}

/**
 * Submit plan rating mutation
 */
export function useRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, rating, review }: { planId: string; rating: number; review?: string }) => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!isOnline) {
        await PendingActionsService.enqueue(
          'rate_plan',
          `/api/v1/plans/${planId}/rate`,
          'POST',
          { rating, review }
        );
        return { success: true, offline: true };
      }

      try {
        const res = await fetch(`/api/v1/plans/${planId}/rate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, review }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Failed to submit rating');
        }
        return await res.json();
      } catch (err: any) {
        await PendingActionsService.enqueue(
          'rate_plan',
          `/api/v1/plans/${planId}/rate`,
          'POST',
          { rating, review }
        );
        return { success: true, offline: true };
      }
    },
    onSuccess: (_, { planId }) => {
      queryClient.invalidateQueries({ queryKey: ['plan', planId] });
      queryClient.invalidateQueries({ queryKey: ['plans', 'library'] });
    },
  });
}
