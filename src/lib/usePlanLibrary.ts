'use client';

import { useCallback } from 'react';

interface UsePlanLibraryOptions {
  userId?: string;
}

export function usePlanLibrary({ userId }: UsePlanLibraryOptions = {}) {
  const fetchPlans = useCallback(
    async (tab: 'my-plans' | 'find-plans' | 'saved' | 'completed', skip = 0, limit = 20) => {
      try {
        let url = '/api/v1/plans';

        if (tab === 'find-plans') {
          url += `?skip=${skip}&limit=${limit}`;
        } else if (userId) {
          url = `/api/v1/plans/user/library?tab=${tab}&skip=${skip}&limit=${limit}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load plans');

        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Failed to load plans');
      }
    },
    [userId]
  );

  const startPlan = useCallback(async (planId: string) => {
    try {
      const response = await fetch(`/api/v1/plans/${planId}/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start plan');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to start plan');
    }
  }, []);

  const continuePlan = useCallback(async (planId: string) => {
    try {
      const response = await fetch(`/api/v1/plans/${planId}`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to load plan');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to load plan');
    }
  }, []);

  const markDayComplete = useCallback(async (planId: string, dayNumber: number) => {
    try {
      const response = await fetch(`/api/v1/plans/${planId}/day/${dayNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark-complete' }),
      });
      if (!response.ok) throw new Error('Failed to mark day complete');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to mark day complete');
    }
  }, []);

  const savePlan = useCallback(async (planId: string) => {
    try {
      const response = await fetch(`/api/v1/plans/${planId}/save`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to save plan');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to save plan');
    }
  }, []);

  const ratePlan = useCallback(async (planId: string, rating: number, review?: string) => {
    try {
      const response = await fetch(`/api/v1/plans/${planId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review }),
      });
      if (!response.ok) throw new Error('Failed to rate plan');
      return await response.json();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to rate plan');
    }
  }, []);

  const updateReadingProgress = useCallback(
    async (planId: string, dayNumber: number, scrollPosition: number) => {
      try {
        const response = await fetch(`/api/v1/plans/${planId}/day/${dayNumber}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-progress', scrollPosition }),
        });
        if (!response.ok) throw new Error('Failed to update progress');
        return await response.json();
      } catch (error: any) {
        throw new Error(error.message || 'Failed to update progress');
      }
    },
    []
  );

  return {
    fetchPlans,
    startPlan,
    continuePlan,
    markDayComplete,
    savePlan,
    ratePlan,
    updateReadingProgress,
  };
}
