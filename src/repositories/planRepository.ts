import { Plan, IPlan } from '@/models/Plan';
import { PlanProgress, IPlanProgress, IPlanDayProgress } from '@/models/PlanProgress';
import mongoose, { Types } from 'mongoose';

export class PlanRepository {
  /**
   * Get all published plans with optional filtering
   */
  static async getPublishedPlans(
    filter: Record<string, any> = {},
    skip: number = 0,
    limit: number = 20
  ) {
    const query: Record<string, any> = { isPublished: true, ...filter };
    const plans = await Plan.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
    const total = await Plan.countDocuments(query);
    return { plans, total };
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(planId: string) {
    return await Plan.findById(planId).lean();
  }

  /**
   * Get plans by category
   */
  static async getPlansByCategory(
    category: string,
    skip: number = 0,
    limit: number = 20
  ) {
    return await Plan.find({ isPublished: true, category })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get user's active plans (my plans tab)
   */
  static async getUserActivePlans(userId: string, skip: number = 0, limit: number = 20) {
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      status: { $in: ['not-started', 'in-progress'] },
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ lastAccessedAt: -1 })
      .lean();

    return progresses;
  }

  /**
   * Get user's completed plans (completed tab)
   */
  static async getUserCompletedPlans(userId: string, skip: number = 0, limit: number = 20) {
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      status: 'completed',
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ completedAt: -1 })
      .lean();

    return progresses;
  }

  /**
   * Get user's saved plans (saved tab)
   */
  static async getUserSavedPlans(userId: string, skip: number = 0, limit: number = 20) {
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      isSaved: true,
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ lastAccessedAt: -1 })
      .lean();

    return progresses;
  }

  /**
   * Get plan progress for a user
   */
  static async getPlanProgress(userId: string, planId: string) {
    return await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    }).lean();
  }

  /**
   * Start a plan for user
   */
  static async startPlan(userId: string, planId: string, plan: IPlan) {
    // Initialize day progress
    const daysProgress: IPlanDayProgress[] = plan.days.map((_, index) => ({
      dayNumber: index + 1,
      completed: false,
      readingState: 'not-started',
      scrollPosition: 0,
    }));

    const progress = new PlanProgress({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      status: 'in-progress',
      currentDay: 1,
      totalDays: plan.duration,
      daysProgress,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    });

    await progress.save();
    return progress;
  }

  /**
   * Update plan progress
   */
  static async updatePlanProgress(
    userId: string,
    planId: string,
    updates: Partial<IPlanProgress>
  ) {
    return await PlanProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
      },
      {
        ...updates,
        lastAccessedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  /**
   * Mark a day as completed
   */
  static async markDayComplete(userId: string, planId: string, dayNumber: number) {
    const progress = await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    });

    if (!progress) throw new Error('Plan progress not found');

    // Update day progress
    const dayProgress = progress.daysProgress.find((d) => d.dayNumber === dayNumber);
    if (dayProgress) {
      dayProgress.completed = true;
      dayProgress.completedAt = new Date();
      dayProgress.readingState = 'completed';
    }

    // Update current day
    if (dayNumber === progress.totalDays) {
      progress.status = 'completed';
      progress.completedAt = new Date();
    } else if (dayNumber >= progress.currentDay) {
      progress.currentDay = dayNumber + 1;
    }

    progress.lastAccessedAt = new Date();
    await progress.save();

    return progress;
  }

  /**
   * Update reading state for a day
   */
  static async updateDayReadingState(
    userId: string,
    planId: string,
    dayNumber: number,
    readingState: 'not-started' | 'in-progress' | 'completed',
    scrollPosition?: number
  ) {
    return await PlanProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
        'daysProgress.dayNumber': dayNumber,
      },
      {
        $set: {
          'daysProgress.$.readingState': readingState,
          ...(scrollPosition !== undefined && {
            'daysProgress.$.scrollPosition': scrollPosition,
          }),
        },
        lastAccessedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  /**
   * Save/unsave plan
   */
  static async toggleSavePlan(userId: string, planId: string, isSaved: boolean) {
    return await PlanProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
      },
      { isSaved },
      { new: true }
    ).lean();
  }

  /**
   * Rate and review completed plan
   */
  static async ratePlan(
    userId: string,
    planId: string,
    rating: number,
    review?: string
  ) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    return await PlanProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
      },
      { rating, review },
      { new: true }
    ).lean();
  }

  /**
   * Continue plan (resume from where user left off)
   */
  static async continuePlan(userId: string, planId: string) {
    return await PlanProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
      },
      {
        status: 'in-progress',
        lastAccessedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  /**
   * Get user's plan library stats
   */
  static async getUserStats(userId: string) {
    const userId_obj = new Types.ObjectId(userId);

    const [totalPlans, completedPlans, inProgressPlans, savedPlans] = await Promise.all([
      PlanProgress.countDocuments({ userId: userId_obj }),
      PlanProgress.countDocuments({ userId: userId_obj, status: 'completed' }),
      PlanProgress.countDocuments({ userId: userId_obj, status: 'in-progress' }),
      PlanProgress.countDocuments({ userId: userId_obj, isSaved: true }),
    ]);

    return {
      totalPlans,
      completedPlans,
      inProgressPlans,
      savedPlans,
    };
  }

  /**
   * Create a new plan (admin/content creators)
   */
  static async createPlan(planData: Partial<IPlan>) {
    const plan = new Plan(planData);
    await plan.save();
    return plan;
  }

  /**
   * Update plan (admin/content creators)
   */
  static async updatePlan(planId: string, updates: Partial<IPlan>) {
    return await Plan.findByIdAndUpdate(planId, updates, { new: true }).lean();
  }

  /**
   * Delete plan (admin only)
   */
  static async deletePlan(planId: string) {
    // Also delete all progress records
    await PlanProgress.deleteMany({ planId: new Types.ObjectId(planId) });
    return await Plan.findByIdAndDelete(planId).lean();
  }

  /**
   * Search plans by title or description
   */
  static async searchPlans(query: string, skip: number = 0, limit: number = 20) {
    return await Plan.find({
      isPublished: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
  }
}
