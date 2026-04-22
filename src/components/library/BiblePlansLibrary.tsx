'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Search } from 'lucide-react';
import LibraryTabs from './LibraryTabs';
import PlanCard from './PlanCard';
import EmptyState from './EmptyState';
import PlanDetailsScreen from './PlanDetailsScreen';
import PlanProgressView from './PlanProgressView';
import ReadingScreen from './ReadingScreen';
import CompletionScreen from './CompletionScreen';
import { Plan, PlanWithProgress, PlanProgress as IPlanProgress } from '@/types/plan';
import { IPlan } from '@/models/Plan';

type ViewMode = 'library' | 'details' | 'progress' | 'reading' | 'completion';
type ActiveTab = 'my-plans' | 'find-plans' | 'saved' | 'completed';

interface LibraryState {
  viewMode: ViewMode;
  activeTab: ActiveTab;
  selectedPlan: Plan | null;
  selectedPlanProgress: IPlanProgress | null;
  plans: Plan[];
  loading: boolean;
  error: string | null;
}

export default function BiblePlansLibrary() {
  const { data: session } = useSession();
  const [state, setState] = useState<LibraryState>({
    viewMode: 'library',
    activeTab: 'my-plans',
    selectedPlan: null,
    selectedPlanProgress: null,
    plans: [],
    loading: false,
    error: null,
  });

  const [reading, setReading] = useState({
    dayNumber: 0,
    isOpen: false,
    scrollPosition: 0,
  });

  // Load plans based on active tab
  const loadPlans = useCallback(async (tab: ActiveTab) => {
    if (!session?.user?.id && tab !== 'find-plans') {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let url = '/api/v1/plans';

      if (tab === 'find-plans') {
        url += '';
      } else {
        url = `/api/v1/plans/user/library?tab=${tab}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load plans');

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        plans: data.data || [],
        loading: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.message,
        loading: false,
      }));
    }
  }, [session?.user?.id]);

  // Load initial plans
  useEffect(() => {
    loadPlans(state.activeTab);
  }, [state.activeTab, session?.user?.id]);

  const handleTabChange = (tab: ActiveTab) => {
    setState((prev) => ({
      ...prev,
      activeTab: tab,
      selectedPlan: null,
      viewMode: 'library',
    }));
  };

  const handleViewPlanDetails = async (plan: Plan) => {
    setState((prev) => ({
      ...prev,
      selectedPlan: plan,
      viewMode: 'details',
      loading: true,
    }));

    // Fetch plan with progress
    try {
      const response = await fetch(`/api/v1/plans/${plan._id}`);
      if (!response.ok) throw new Error('Failed to load plan');

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        selectedPlan: data.data.plan,
        selectedPlanProgress: data.data.progress,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load plan details',
      }));
    }
  };

  const handleStartPlan = async () => {
    if (!state.selectedPlan || !session?.user?.id) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/v1/plans/${state.selectedPlan._id}/start`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to start plan');

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        selectedPlanProgress: data.data,
        viewMode: 'progress',
        loading: false,
      }));

      // Refresh library after starting
      await loadPlans('my-plans');
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message,
      }));
    }
  };

  const handleContinuePlan = async () => {
    if (!state.selectedPlan) return;

    setState((prev) => ({
      ...prev,
      viewMode: 'progress',
    }));
  };

  const handleSavePlan = async () => {
    if (!state.selectedPlan || !session?.user?.id) return;

    try {
      const response = await fetch(`/api/v1/plans/${state.selectedPlan._id}/save`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to save plan');

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        selectedPlanProgress: data.data,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to save plan',
      }));
    }
  };

  const handleStartReading = (dayNumber: number) => {
    setReading({
      dayNumber,
      isOpen: true,
      scrollPosition: state.selectedPlanProgress?.daysProgress.find(
        (d) => d.dayNumber === dayNumber
      )?.scrollPosition || 0,
    });
  };

  const handleMarkDayComplete = async (dayNumber: number) => {
    if (!state.selectedPlan || !session?.user?.id) return;

    try {
      const response = await fetch(
        `/api/v1/plans/${state.selectedPlan._id}/day/${dayNumber}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark-complete' }),
        }
      );

      if (!response.ok) throw new Error('Failed to mark day complete');

      const data = await response.json();
      setState((prev) => ({
        ...prev,
        selectedPlanProgress: data.data,
      }));

      setReading({ dayNumber: 0, isOpen: false, scrollPosition: 0 });

      // Check if plan is completed
      if (data.data.status === 'completed') {
        setState((prev) => ({
          ...prev,
          viewMode: 'completion',
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to mark day complete',
      }));
    }
  };

  const handleUpdateScrollPosition = async (scrollPosition: number) => {
    if (!state.selectedPlan || !session?.user?.id) return;

    try {
      await fetch(
        `/api/v1/plans/${state.selectedPlan._id}/day/${reading.dayNumber}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-progress', scrollPosition }),
        }
      );
    } catch (err) {
      console.error('Failed to update scroll position:', err);
    }
  };

  const handleRatePlan = async (rating: number, review: string) => {
    if (!state.selectedPlan || !session?.user?.id) return;

    try {
      const response = await fetch(`/api/v1/plans/${state.selectedPlan._id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, review }),
      });

      if (!response.ok) throw new Error('Failed to rate plan');

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setState((prev) => ({
        ...prev,
        viewMode: 'library',
        activeTab: 'completed',
        selectedPlan: null,
      }));

      await loadPlans('completed');
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to rate plan',
      }));
    }
  };

  // Render appropriate view
  if (state.viewMode === 'details' && state.selectedPlan) {
    return (
      <PlanDetailsScreen
        plan={state.selectedPlan}
        status={state.selectedPlanProgress?.status || 'not-started'}
        isSaved={state.selectedPlanProgress?.isSaved || false}
        isLoading={state.loading}
        onBack={() =>
          setState((prev) => ({
            ...prev,
            viewMode: 'library',
            selectedPlan: null,
          }))
        }
        onStart={handleStartPlan}
        onContinue={handleContinuePlan}
        onSave={handleSavePlan}
      />
    );
  }

  if (state.viewMode === 'progress' && state.selectedPlan && state.selectedPlanProgress) {
    return (
      <>
        {reading.isOpen && (
          <ReadingScreen
            planTitle={state.selectedPlan.title}
            dayNumber={reading.dayNumber}
            totalDays={state.selectedPlan.duration}
            scripture={
              state.selectedPlan.days[reading.dayNumber - 1]?.scripture || ''
            }
            devotional={
              state.selectedPlan.days[reading.dayNumber - 1]?.devotional || ''
            }
            reflection={
              state.selectedPlan.days[reading.dayNumber - 1]?.reflection
            }
            initialScrollPosition={reading.scrollPosition}
            onScrollPositionChange={handleUpdateScrollPosition}
            onClose={() =>
              setReading({ dayNumber: 0, isOpen: false, scrollPosition: 0 })
            }
            onComplete={() => handleMarkDayComplete(reading.dayNumber)}
          />
        )}
        {!reading.isOpen && (
          <PlanProgressView
            planTitle={state.selectedPlan.title}
            planDays={state.selectedPlan.days}
            progress={state.selectedPlanProgress}
            onBack={() =>
              setState((prev) => ({
                ...prev,
                viewMode: 'library',
                selectedPlan: null,
                selectedPlanProgress: null,
              }))
            }
            onStartReading={handleStartReading}
            onMarkComplete={handleMarkDayComplete}
          />
        )}
      </>
    );
  }

  if (state.viewMode === 'completion' && state.selectedPlan && state.selectedPlanProgress) {
    return (
      <CompletionScreen
        planTitle={state.selectedPlan.title}
        duration={state.selectedPlan.duration}
        completedDate={state.selectedPlanProgress.completedAt || new Date()}
        onRate={handleRatePlan}
        onViewRelated={() => {
          setState((prev) => ({ ...prev, viewMode: 'library', activeTab: 'find-plans' }));
        }}
        onGoHome={() => {
          setState((prev) => ({
            ...prev,
            viewMode: 'library',
            activeTab: 'completed',
            selectedPlan: null,
          }));
          loadPlans('completed');
        }}
      />
    );
  }

  // Library view
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bible Plans</h1>
              <p className="text-gray-600 mt-1">
                Discover and complete spiritual growth plans
              </p>
            </div>
            <button className="bg-gradient-to-r from-[var(--color-primary-teal)] to-[var(--color-primary-teal-light)] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all hidden sm:block">
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search plans..."
              className="bg-transparent flex-1 ml-2 outline-none text-gray-700 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <LibraryTabs
            activeTab={state.activeTab}
            onTabChange={handleTabChange}
            tabs={[
              { id: 'my-plans', label: 'My Plans' },
              { id: 'find-plans', label: 'Find Plans' },
              { id: 'saved', label: 'Saved' },
              { id: 'completed', label: 'Completed' },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {state.loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="inline-block">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary-teal)]"></div>
              </div>
              <p className="text-gray-600">Loading plans...</p>
            </div>
          </div>
        )}

        {!state.loading && state.plans.length === 0 && (
          <EmptyState
            title={
              state.activeTab === 'my-plans'
                ? 'No Plans Started Yet'
                : state.activeTab === 'completed'
                ? 'No Completed Plans'
                : state.activeTab === 'saved'
                ? 'No Saved Plans'
                : 'No Plans Available'
            }
            description={
              state.activeTab === 'my-plans'
                ? 'Start a plan from the "Find Plans" tab to begin your journey'
                : state.activeTab === 'completed'
                ? 'Complete a plan to see it here'
                : state.activeTab === 'saved'
                ? 'Save plans for later from the "Find Plans" tab'
                : 'Check back soon for new plans!'
            }
            action={
              state.activeTab === 'my-plans' || state.activeTab === 'saved'
                ? {
                    label: 'Explore Plans',
                    onClick: () => handleTabChange('find-plans'),
                  }
                : undefined
            }
          />
        )}

        {!state.loading && state.plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {state.plans.map((plan) => (
              <PlanCard
                key={String(plan._id)}
                plan={plan}
                onAction={() => handleViewPlanDetails(plan)}
                actionLabel={
                  state.activeTab === 'completed'
                    ? 'View'
                    : state.activeTab === 'my-plans'
                    ? 'Continue'
                    : 'Start'
                }
                progressPercentage={0}
                showProgress={state.activeTab === 'my-plans'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
