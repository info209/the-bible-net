'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LibraryHeader from '../components/library/LibraryHeader';
import LibraryTabs, { LibraryTabId } from '../components/library/LibraryTabs';
import FindPlansView from '../components/library/FindPlansView';
import MyPlansView from '../components/library/MyPlansView';
import SavedPlansView from '../components/library/SavedPlansView';
import CompletedPlansView from '../components/library/CompletedPlansView';
import { useUserLibrary, useFindPlans, useStartPlan } from '@/hooks/usePlanQueries';
import { toast } from 'sonner';

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial tab from URL query params (default: 'my-plans')
  const initialTab = (searchParams.get('tab') as LibraryTabId) || 'my-plans';
  const [activeTab, setActiveTab] = useState<LibraryTabId>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [startingPlanId, setStartingPlanId] = useState<string | null>(null);

  // Sync state with URL search params when changed
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as LibraryTabId;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab: LibraryTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/library?${params.toString()}`);
  };

  // Queries
  const { data: userPlans = [], isLoading: isLoadingUserPlans } = useUserLibrary(activeTab);
  const { data: catalogPlans = [], isLoading: isLoadingCatalog } = useFindPlans(searchQuery);

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
            plans={catalogPlans}
            isLoading={isLoadingCatalog}
            onStartPlan={handleStartPlan}
            isStartingPlanId={startingPlanId}
          />
        )}

        {activeTab === 'my-plans' && (
          <MyPlansView
            progresses={userPlans}
            isLoading={isLoadingUserPlans}
          />
        )}

        {activeTab === 'saved' && (
          <SavedPlansView
            progresses={userPlans}
            isLoading={isLoadingUserPlans}
          />
        )}

        {activeTab === 'completed' && (
          <CompletedPlansView
            progresses={userPlans}
            isLoading={isLoadingUserPlans}
          />
        )}
      </div>
    </div>
  );
}
