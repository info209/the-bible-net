import { PlanRepository } from '@/repositories/planRepository';
import { IPlan } from '@/models/Plan';
import { PlanWithProgress, PlanStatus } from '@/types/plan';
import { CacheService, CacheKeys, CACHE_TTL } from '@/services/cacheService';

export class PlanService {
  /**
   * Get all available plans for discovery
   */
  static async getAvailablePlans(category?: string, skip: number = 0, limit: number = 20) {
    const cacheKey = CacheKeys.plansPublic(category, skip, limit);
    return CacheService.getOrSet(cacheKey, async () => {
      const filter = category ? { category } : {};
      const result = await PlanRepository.getPublishedPlans(filter, skip, limit);
      return result;
    }, CACHE_TTL.PLANS);
  }

  /**
   * Get plan with user's progress
   */
  static async getPlanWithProgress(planId: string, userId?: string): Promise<PlanWithProgress | null> {
    const plan = await PlanRepository.getPlanById(planId) as IPlan | null;
    if (!plan) return null;

    if (!userId) {
      return {
        plan,
        progress: null,
        status: 'not-started',
        progressPercentage: 0,
      };
    }

    const progress = await PlanRepository.getPlanProgress(userId, planId);

    const progressPercentage = progress
      ? (progress.daysProgress.filter((d) => d.completed).length /
          progress.totalDays) *
        100
      : 0;

    return {
      plan,
      progress,
      status: (progress?.status || 'not-started') as PlanStatus,
      progressPercentage,
    };
  }

  /**
   * Get user's library - all tabs
   */
  static async getUserLibrary(
    userId: string,
    tab: 'my-plans' | 'find-plans' | 'saved' | 'completed',
    skip: number = 0,
    limit: number = 20
  ) {
    let result: any[] = [];

    switch (tab) {
      case 'my-plans':
        result = await PlanRepository.getUserActivePlans(userId, skip, limit);
        break;
      case 'find-plans':
        const allPlans = await PlanRepository.getPublishedPlans({}, skip, limit);
        result = allPlans.plans;
        break;
      case 'saved':
        result = await PlanRepository.getUserSavedPlans(userId, skip, limit);
        break;
      case 'completed':
        result = await PlanRepository.getUserCompletedPlans(userId, skip, limit);
        break;
    }

    return result;
  }

  /**
   * Start a new plan
   */
  static async startPlan(userId: string, planId: string) {
    const plan = await PlanRepository.getPlanById(planId) as IPlan;
    if (!plan) throw new Error('Plan not found');

    // Check if already started
    const existing = await PlanRepository.getPlanProgress(userId, planId);
    if (existing) {
      throw new Error('Plan already started');
    }

    const progress = await PlanRepository.startPlan(userId, planId, plan);
    return progress;
  }

  /**
   * Continue reading a plan
   */
  static async continuePlan(userId: string, planId: string) {
    const progress = await PlanRepository.continuePlan(userId, planId);
    if (!progress) throw new Error('Plan progress not found');
    return progress;
  }

  /**
   * Get current day content
   */
  static async getDayContent(planId: string, dayNumber: number) {
    const plan = await PlanRepository.getPlanById(planId) as IPlan;
    if (!plan) throw new Error('Plan not found');

    if (dayNumber < 1 || dayNumber > plan.duration) {
      throw new Error('Invalid day number');
    }

    return plan.days[dayNumber - 1];
  }

  /**
   * Mark day as complete
   */
  static async completDay(userId: string, planId: string, dayNumber: number) {
    const progress = await PlanRepository.markDayComplete(userId, planId, dayNumber);
    return progress;
  }

  /**
   * Update reading progress
   */
  static async updateReadingProgress(
    userId: string,
    planId: string,
    dayNumber: number,
    scrollPosition: number
  ) {
    const progress = await PlanRepository.updateDayReadingState(
      userId,
      planId,
      dayNumber,
      'in-progress',
      scrollPosition
    );
    return progress;
  }

  /**
   * Save/unsave plan for later
   */
  static async toggleSavePlan(userId: string, planId: string) {
    const current = await PlanRepository.getPlanProgress(userId, planId);
    const newState = !(current?.isSaved);

    const progress = await PlanRepository.toggleSavePlan(userId, planId, newState);
    return progress;
  }

  /**
   * Rate a completed plan
   */
  static async ratePlan(userId: string, planId: string, rating: number, review?: string) {
    const progress = await PlanRepository.getPlanProgress(userId, planId);
    if (!progress || progress.status !== 'completed') {
      throw new Error('Can only rate completed plans');
    }

    const updated = await PlanRepository.ratePlan(userId, planId, rating, review);
    return updated;
  }

  /**
   * Get related/recommended plans
   */
  static async getRelatedPlans(planId: string, limit: number = 5) {
    const cacheKey = CacheKeys.planRelated(planId, limit);
    return CacheService.getOrSet(cacheKey, async () => {
      const currentPlan = await PlanRepository.getPlanById(planId) as IPlan;
      if (!currentPlan) throw new Error('Plan not found');

      const related = await PlanRepository.getPlansByCategory(currentPlan.category, 0, limit + 1);
      return related.filter((p) => p._id.toString() !== planId);
    }, CACHE_TTL.PLANS);
  }

  /**
   * Get user's stats
   */
  static async getUserStats(userId: string) {
    return await PlanRepository.getUserStats(userId);
  }

  /**
   * Search plans
   */
  static async searchPlans(query: string, skip: number = 0, limit: number = 20) {
    if (!query || query.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters');
    }

    return await PlanRepository.searchPlans(query, skip, limit);
  }

  /**
   * Calculate progress percentage
   */
  static calculateProgressPercentage(completedDays: number, totalDays: number): number {
    return Math.round((completedDays / totalDays) * 100);
  }

  /**
   * Get estimated completion date
   */
  static getEstimatedCompletionDate(startDate: Date, daysRemaining: number): Date {
    const estimatedDate = new Date(startDate);
    estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
    return estimatedDate;
  }
}
