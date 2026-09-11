'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LibraryHeader from '../components/library/LibraryHeader';
import LibraryTabs, { LibraryTabId } from '../components/library/LibraryTabs';
import FindPlansView from '../components/library/FindPlansView';
import MyPlansView from '../components/library/MyPlansView';
import SavedPlansView from '../components/library/SavedPlansView';
import CompletedPlansView from '../components/library/CompletedPlansView';
import { useUserLibrary, useFindPlans, useStartPlan } from '@/hooks/usePlanQueries';
import { ModuleOfflineService } from '@/lib/offline/ModuleOfflineService';
import { toast } from 'sonner';

function LibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial tab from URL query params (default: 'my-plans')
  const initialTab = (searchParams.get('tab') as LibraryTabId) || 'my-plans';
  const [activeTab, setActiveTab] = useState<LibraryTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  // Local hydrated offline state from IndexedDB
  const [localUserPlans, setLocalUserPlans] = useState<any[] | null>(null);
  const [localCatalogPlans, setLocalCatalogPlans] = useState<any[] | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Track online/offline status
  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync state with URL search params when changed
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as LibraryTabId;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Immediate hydration from IndexedDB on mount & when activeTab / searchQuery changes
  useEffect(() => {
    let isSubscribed = true;

    const hydrateFromLocal = async () => {
      try {
        const [cachedTabPlans, cachedCatalog] = await Promise.all([
          ModuleOfflineService.getCache<any[]>(`library_plans_${activeTab}`),
          searchQuery
            ? ModuleOfflineService.getCache<any[]>(`find_plans_${searchQuery}_`)
            : ModuleOfflineService.getCache<any[]>('find_plans__'),
        ]);

        if (!isSubscribed) return;

        if (cachedTabPlans && Array.isArray(cachedTabPlans)) {
          setLocalUserPlans(cachedTabPlans);
        }
        if (cachedCatalog && Array.isArray(cachedCatalog)) {
          setLocalCatalogPlans(cachedCatalog);
        }
      } catch (err) {
        console.warn('[Library] Hydration from local cache error:', err);
      }
    };

    hydrateFromLocal();

    return () => {
      isSubscribed = false;
    };
  }, [activeTab, searchQuery]);

  const handleTabChange = (tab: LibraryTabId) => {
    setActiveTab(tab);
    // Reset local plan buffer to allow tab-specific hydration
    setLocalUserPlans(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/library?${params.toString()}`);
  };

  // Queries
  const { data: userPlans = [], isLoading: isLoadingUserPlans } = useUserLibrary(activeTab);
  const { data: catalogPlans = [], isLoading: isLoadingCatalog } = useFindPlans(searchQuery);

  // When fresh query data resolves online, sync local state
  useEffect(() => {
    if (userPlans && Array.isArray(userPlans) && userPlans.length > 0) {
      setLocalUserPlans(userPlans);
    }
  }, [userPlans]);

  useEffect(() => {
    if (catalogPlans && Array.isArray(catalogPlans) && catalogPlans.length > 0) {
      setLocalCatalogPlans(catalogPlans);
    }
  }, [catalogPlans]);

  const startPlanMutation = useStartPlan();

  const handleStartPlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setStartingPlanId(planId);
      await startPlanMutation.mutateAsync(planId);
      toast.success('Plan started!');
      router.push(`/library/${planId}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start plan');
    } finally {
      setStartingPlanId(null);
    }
  };

  // Resolve data: Local hydrated data wins immediately if available
  const resolvedUserPlans = localUserPlans !== null ? localUserPlans : userPlans;
  const resolvedCatalogPlans = localCatalogPlans !== null ? localCatalogPlans : catalogPlans;

  // Loading state: Only show pulse skeleton if neither local data nor query data is available
  const showUserLoading = isLoadingUserPlans && localUserPlans === null;
  const showCatalogLoading = isLoadingCatalog && localCatalogPlans === null;

  return (
    <div className="min-h-full space-y-3">
      {/* Header */}
      <LibraryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isSearchOpen={isSearchOpen}
        onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
      />

      {/* Horizontally arranged rounded tabs */}
      <LibraryTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'find-plans' && (
          <FindPlansView
            plans={resolvedCatalogPlans}
            isLoading={showCatalogLoading}
            onStartPlan={handleStartPlan}
            isStartingPlanId={startingPlanId}
            isOffline={isOffline}
          />
        )}

        {activeTab === 'my-plans' && (
          <MyPlansView
            progresses={resolvedUserPlans}
            isLoading={showUserLoading}
            isOffline={isOffline}
          />
        )}

        {activeTab === 'saved' && (
          <SavedPlansView
            progresses={resolvedUserPlans}
            isLoading={showUserLoading}
            isOffline={isOffline}
          />
        )}

        {activeTab === 'completed' && (
          <CompletedPlansView
            progresses={resolvedUserPlans}
            isLoading={showUserLoading}
            isOffline={isOffline}
          />
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center animate-pulse text-gray-500">Loading Library...</div>}>
      <LibraryContent />
    </Suspense>
  );
}
