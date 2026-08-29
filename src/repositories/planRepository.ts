import { Plan, IPlan } from '@/models/Plan';
import { PlanProgress, IPlanProgress, IPlanDayProgress } from '@/models/PlanProgress';
import mongoose, { Types } from 'mongoose';
import connectDB from '@/lib/db';

export class PlanRepository {
  /**
   * Get all published plans with optional filtering
   */
  static async getPublishedPlans(
    filter: Record<string, any> = {},
    skip: number = 0,
    limit: number = 20
  ) {
    await connectDB();
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
    await connectDB();
    if (!Types.ObjectId.isValid(planId)) return null;
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
    await connectDB();
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
    await connectDB();
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      status: { $in: ['not-started', 'in-progress'] },
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ lastAccessedAt: -1 })
      .lean();

    return progresses.filter((p) => p.planId != null);
  }

  /**
   * Get user's completed plans (completed tab)
   */
  static async getUserCompletedPlans(userId: string, skip: number = 0, limit: number = 20) {
    await connectDB();
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      status: 'completed',
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ completedAt: -1 })
      .lean();

    return progresses.filter((p) => p.planId != null);
  }

  /**
   * Get user's saved plans (saved tab)
   */
  static async getUserSavedPlans(userId: string, skip: number = 0, limit: number = 20) {
    await connectDB();
    const progresses = await PlanProgress.find({
      userId: new Types.ObjectId(userId),
      isSaved: true,
    })
      .populate('planId')
      .skip(skip)
      .limit(limit)
      .sort({ lastAccessedAt: -1 })
      .lean();

    return progresses.filter((p) => p.planId != null);
  }

  /**
   * Get plan progress for a user
   */
  static async getPlanProgress(userId: string, planId: string) {
    await connectDB();
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(planId)) return null;
    return await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    }).lean();
  }

  /**
   * Start a plan for user (idempotent)
   */
  static async startPlan(userId: string, planId: string, plan: IPlan) {
    await connectDB();
    const existing = await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    });

    if (existing) {
      if (existing.status === 'not-started') {
        existing.status = 'in-progress';
        existing.lastAccessedAt = new Date();
        await existing.save();
      }
      return existing.toObject();
    }

    const daysProgress: IPlanDayProgress[] = (plan.days || []).map((day, index) => ({
      dayNumber: day.dayNumber || index + 1,
      dayId: day.dayId || `day_${index + 1}`,
      completed: false,
      readingState: 'not-started',
      scrollPosition: 0,
      completedItemIds: [],
    }));

    const progress = new PlanProgress({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
      status: 'in-progress',
      currentDay: 1,
      totalDays: plan.duration || plan.days.length || 1,
      daysProgress,
      completedItemIds: [],
      completedDayNumbers: [],
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    });

    await progress.save();
    return progress.toObject();
  }

  /**
   * Complete a specific reading item
   */
  static async completeReadingItem(
    userId: string,
    planId: string,
    dayNumber: number,
    itemId: string,
    plan: IPlan
  ) {
    await connectDB();
    let progress = await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    });

    if (!progress) {
      // Auto-start if not started
      const newProg = await this.startPlan(userId, planId, plan);
      progress = await PlanProgress.findById((newProg as any)._id);
    }

    if (!progress) throw new Error('Progress record error');

    // Add to global completed item IDs if not present
    if (!progress.completedItemIds.includes(itemId)) {
      progress.completedItemIds.push(itemId);
    }

    // Find day progress
    let dayProg = progress.daysProgress.find((d) => d.dayNumber === dayNumber);
    if (!dayProg) {
      dayProg = {
        dayNumber,
        dayId: `day_${dayNumber}`,
        completed: false,
        readingState: 'in-progress',
        scrollPosition: 0,
        completedItemIds: [],
      };
      progress.daysProgress.push(dayProg);
    }

    if (!dayProg.completedItemIds.includes(itemId)) {
      dayProg.completedItemIds.push(itemId);
    }

    dayProg.readingState = 'in-progress';

    // Check if all items in this day are completed
    const dayConfig = (plan.days || []).find((d) => d.dayNumber === dayNumber);
    const dayItems = dayConfig?.items || [];

    const allDayItemsCompleted =
      dayItems.length > 0 &&
      dayItems.every((item) =>
        progress!.completedItemIds.includes(item.itemId) || dayProg!.completedItemIds.includes(item.itemId)
      );

    if (allDayItemsCompleted || dayItems.length === 0) {
      dayProg.completed = true;
      dayProg.completedAt = new Date();
      dayProg.readingState = 'completed';

      if (!progress.completedDayNumbers.includes(dayNumber)) {
        progress.completedDayNumbers.push(dayNumber);
      }

      // Advance current day
      if (dayNumber >= progress.currentDay && progress.currentDay < progress.totalDays) {
        progress.currentDay = dayNumber + 1;
      }
    }

    // Check if entire plan is completed
    const totalDays = plan.duration || plan.days.length || 1;
    const allDaysComplete =
      progress.completedDayNumbers.length >= totalDays ||
      (plan.days || []).every((d) => progress!.completedDayNumbers.includes(d.dayNumber));

    if (allDaysComplete) {
      progress.status = 'completed';
      if (!progress.completedAt) {
        progress.completedAt = new Date();
      }
    }

    progress.lastAccessedAt = new Date();
    await progress.save();
    return progress.toObject();
  }

  /**
   * Mark an entire day complete
   */
  static async markDayComplete(userId: string, planId: string, dayNumber: number) {
    await connectDB();
    const plan = await Plan.findById(planId).lean();
    if (!plan) throw new Error('Plan not found');

    const dayConfig = (plan.days || []).find((d) => d.dayNumber === dayNumber);
    const dayItems = dayConfig?.items || [];

    let updatedProgress: any = null;
    if (dayItems.length > 0) {
      for (const item of dayItems) {
        updatedProgress = await this.completeReadingItem(userId, planId, dayNumber, item.itemId, plan);
      }
    } else {
      let progress = await PlanProgress.findOne({
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
      });

      if (!progress) {
        progress = await this.startPlan(userId, planId, plan) as any;
        progress = await PlanProgress.findById((progress as any)._id);
      }

      if (progress) {
        let dayProg = progress.daysProgress.find((d) => d.dayNumber === dayNumber);
        if (!dayProg) {
          dayProg = {
            dayNumber,
            dayId: `day_${dayNumber}`,
            completed: true,
            completedAt: new Date(),
            readingState: 'completed',
            completedItemIds: [],
          };
          progress.daysProgress.push(dayProg);
        } else {
          dayProg.completed = true;
          dayProg.completedAt = new Date();
          dayProg.readingState = 'completed';
        }

        if (!progress.completedDayNumbers.includes(dayNumber)) {
          progress.completedDayNumbers.push(dayNumber);
        }

        if (dayNumber >= progress.currentDay && progress.currentDay < progress.totalDays) {
          progress.currentDay = dayNumber + 1;
        }

        if (progress.completedDayNumbers.length >= plan.duration) {
          progress.status = 'completed';
          progress.completedAt = new Date();
        }

        progress.lastAccessedAt = new Date();
        await progress.save();
        updatedProgress = progress.toObject();
      }
    }

    return updatedProgress;
  }

  /**
   * Save / unsave plan for user
   */
  static async toggleSavePlan(userId: string, planId: string, isSaved?: boolean) {
    await connectDB();
    let progress = await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    });

    const newSavedState = isSaved !== undefined ? isSaved : !(progress?.isSaved);

    if (!progress) {
      const plan = await Plan.findById(planId).lean();
      if (!plan) throw new Error('Plan not found');

      progress = new PlanProgress({
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(planId),
        status: 'not-started',
        currentDay: 1,
        totalDays: plan.duration,
        daysProgress: (plan.days || []).map((d) => ({
          dayNumber: d.dayNumber,
          dayId: d.dayId || `day_${d.dayNumber}`,
          completed: false,
          readingState: 'not-started',
          completedItemIds: [],
        })),
        startedAt: new Date(),
        lastAccessedAt: new Date(),
        isSaved: newSavedState,
      });
    } else {
      progress.isSaved = newSavedState;
      progress.lastAccessedAt = new Date();
    }

    await progress.save();
    return progress.toObject();
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
    await connectDB();
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars');
    }

    const progress = await PlanProgress.findOne({
      userId: new Types.ObjectId(userId),
      planId: new Types.ObjectId(planId),
    });

    if (!progress || progress.status !== 'completed') {
      throw new Error('Only users who have completed the plan can submit a rating');
    }

    const previousRating = progress.rating;
    progress.rating = rating;
    if (review !== undefined) {
      progress.review = review;
    }
    await progress.save();

    // Recalculate average rating on Plan
    const ratedProgresses = await PlanProgress.find({
      planId: new Types.ObjectId(planId),
      rating: { $exists: true, $ne: null },
    }).lean();

    const totalRatings = ratedProgresses.length;
    const sumRatings = ratedProgresses.reduce((acc, p) => acc + (p.rating || 0), 0);
    const averageRating = totalRatings > 0 ? Math.round((sumRatings / totalRatings) * 10) / 10 : 0;

    await Plan.findByIdAndUpdate(planId, {
      totalRatings,
      averageRating,
    });

    return progress.toObject();
  }

  /**
   * Get related plans
   */
  static async getRelatedPlans(planId: string, limit: number = 6) {
    await connectDB();
    const currentPlan = await Plan.findById(planId).lean();
    if (!currentPlan) return [];

    let relatedPlans: IPlan[] = [];

    // 1. Explicit Admin configured related plans
    if (currentPlan.relatedPlanIds && currentPlan.relatedPlanIds.length > 0) {
      relatedPlans = await Plan.find({
        _id: { $in: currentPlan.relatedPlanIds },
        isPublished: true,
      })
        .limit(limit)
        .lean() as any;
    }

    // 2. Fallback to same category plans
    if (relatedPlans.length < limit) {
      const remainingLimit = limit - relatedPlans.length;
      const existingIds = [currentPlan._id, ...relatedPlans.map((p) => p._id)];

      const categoryPlans = await Plan.find({
        _id: { $nin: existingIds },
        category: currentPlan.category,
        isPublished: true,
      })
        .limit(remainingLimit)
        .sort({ createdAt: -1 })
        .lean() as any;

      relatedPlans = [...relatedPlans, ...categoryPlans];
    }

    // 3. Fallback to any published plans
    if (relatedPlans.length < limit) {
      const remainingLimit = limit - relatedPlans.length;
      const existingIds = [currentPlan._id, ...relatedPlans.map((p) => p._id)];

      const generalPlans = await Plan.find({
        _id: { $nin: existingIds },
        isPublished: true,
      })
        .limit(remainingLimit)
        .sort({ createdAt: -1 })
        .lean() as any;

      relatedPlans = [...relatedPlans, ...generalPlans];
    }

    return relatedPlans;
  }

  /**
   * Admin: Create a new plan
   */
  static async createPlan(planData: Partial<IPlan>) {
    await connectDB();
    // Ensure stable IDs for days and items
    if (planData.days) {
      planData.days = planData.days.map((day, idx) => ({
        ...day,
        dayId: day.dayId || `day_${idx + 1}_${Date.now().toString(36)}`,
        dayNumber: day.dayNumber || idx + 1,
        items: (day.items || []).map((item, itemIdx) => ({
          ...item,
          itemId: item.itemId || `item_${idx + 1}_${itemIdx + 1}_${Date.now().toString(36)}`,
        })),
      }));
    }

    const plan = new Plan(planData);
    await plan.save();
    return plan.toObject();
  }

  /**
   * Admin: Update plan (safely preserves dayId & itemId)
   */
  static async updatePlan(planId: string, updates: Partial<IPlan>) {
    await connectDB();
    if (updates.days) {
      updates.days = updates.days.map((day, idx) => ({
        ...day,
        dayId: day.dayId || `day_${idx + 1}_${Date.now().toString(36)}`,
        dayNumber: day.dayNumber || idx + 1,
        items: (day.items || []).map((item, itemIdx) => ({
          ...item,
          itemId: item.itemId || `item_${idx + 1}_${itemIdx + 1}_${Date.now().toString(36)}`,
        })),
      }));
    }

    return await Plan.findByIdAndUpdate(planId, updates, { new: true }).lean();
  }

  /**
   * Admin: Delete plan
   */
  static async deletePlan(planId: string) {
    await connectDB();
    await PlanProgress.deleteMany({ planId: new Types.ObjectId(planId) });
    return await Plan.findByIdAndDelete(planId).lean();
  }

  /**
   * Search plans
   */
  static async searchPlans(query: string, skip: number = 0, limit: number = 20) {
    await connectDB();
    const regex = new RegExp(query.trim(), 'i');
    const filter = {
      isPublished: true,
      $or: [
        { title: regex },
        { description: regex },
        { category: regex },
        { author: regex },
      ],
    };

    const plans = await Plan.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Plan.countDocuments(filter);
    return { plans, total };
  }
}

