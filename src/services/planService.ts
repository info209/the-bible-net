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
    const plan = (await PlanRepository.getPlanById(planId)) as IPlan | null;
    if (!plan) return null;

    if (!userId) {
      return {
        plan: plan as any,
        progress: null,
        status: 'not-started',
        progressPercentage: 0,
      };
    }

    const progress = await PlanRepository.getPlanProgress(userId, planId);

    const completedDaysCount = progress
      ? progress.completedDayNumbers?.length || progress.daysProgress.filter((d) => d.completed).length
      : 0;

    const totalDays = plan.duration || plan.days?.length || 1;
    const progressPercentage = Math.min(100, Math.round((completedDaysCount / totalDays) * 100));

    return {
      plan: plan as any,
      progress: progress as any,
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
    switch (tab) {
      case 'my-plans':
        return await PlanRepository.getUserActivePlans(userId, skip, limit);
      case 'find-plans':
        const allPlans = await PlanRepository.getPublishedPlans({}, skip, limit);
        return allPlans.plans;
      case 'saved':
        return await PlanRepository.getUserSavedPlans(userId, skip, limit);
      case 'completed':
        return await PlanRepository.getUserCompletedPlans(userId, skip, limit);
      default:
        return [];
    }
  }

  /**
   * Start a new plan (idempotent)
   */
  static async startPlan(userId: string, planId: string) {
    const plan = (await PlanRepository.getPlanById(planId)) as IPlan | null;
    if (!plan) throw new Error('Plan not found');

    const progress = await PlanRepository.startPlan(userId, planId, plan);
    return progress;
  }

  /**
   * Complete a specific reading item in a plan day
   */
  static async completeReadingItem(
    userId: string,
    planId: string,
    dayNumber: number,
    itemId: string
  ) {
    const plan = (await PlanRepository.getPlanById(planId)) as IPlan | null;
    if (!plan) throw new Error('Plan not found');

    const progress = await PlanRepository.completeReadingItem(
      userId,
      planId,
      dayNumber,
      itemId,
      plan
    );
    return progress;
  }

  /**
   * Mark an entire day as complete
   */
  static async markDayComplete(userId: string, planId: string, dayNumber: number) {
    const progress = await PlanRepository.markDayComplete(userId, planId, dayNumber);
    return progress;
  }

  /**
   * Save / unsave plan for user
   */
  static async toggleSavePlan(userId: string, planId: string, isSaved?: boolean) {
    const progress = await PlanRepository.toggleSavePlan(userId, planId, isSaved);
    return progress;
  }

  /**
   * Rate a completed plan
   */
  static async ratePlan(userId: string, planId: string, rating: number, review?: string) {
    const updated = await PlanRepository.ratePlan(userId, planId, rating, review);
    // Invalidate plan details cache
    await CacheService.del(`tbnet:plan:${planId}`);
    return updated;
  }

  /**
   * Get related/recommended plans
   */
  static async getRelatedPlans(planId: string, limit: number = 6) {
    const cacheKey = CacheKeys.planRelated(planId, limit);
    return CacheService.getOrSet(cacheKey, async () => {
      return await PlanRepository.getRelatedPlans(planId, limit);
    }, CACHE_TTL.PLANS);
  }

  /**
   * Search plans
   */
  static async searchPlans(query: string, skip: number = 0, limit: number = 20) {
    if (!query || query.trim().length < 1) {
      const all = await PlanRepository.getPublishedPlans({}, skip, limit);
      return all.plans;
    }
    const result = await PlanRepository.searchPlans(query, skip, limit);
    return result.plans;
  }

  /**
   * Admin: Create plan
   */
  static async createPlan(planData: Partial<IPlan>) {
    const created = await PlanRepository.createPlan(planData);
    await CacheService.invalidatePattern('tbnet:plans:*');
    return created;
  }

  /**
   * Admin: Update plan
   */
  static async updatePlan(planId: string, updates: Partial<IPlan>) {
    const updated = await PlanRepository.updatePlan(planId, updates);
    await CacheService.invalidatePattern('tbnet:plans:*');
    await CacheService.del(`tbnet:plan:${planId}`);
    return updated;
  }

  /**
   * Admin: Delete plan
   */
  static async deletePlan(planId: string) {
    const deleted = await PlanRepository.deletePlan(planId);
    await CacheService.invalidatePattern('tbnet:plans:*');
    await CacheService.del(`tbnet:plan:${planId}`);
    return deleted;
  }
}

