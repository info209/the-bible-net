import mongoose from 'mongoose';
import {
  UserContentProgress,
  IUserContentProgress,
  ProgressStatus,
} from '@/models/UserContentProgress';

export class UserContentProgressRepository {
  /**
   * Find a single progress record for a user + contentType + date.
   */
  static async findByUserAndDate(
    userId: string,
    contentType: string,
    date: string
  ): Promise<IUserContentProgress | null> {
    return UserContentProgress.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      contentType,
      date,
    }).lean() as Promise<IUserContentProgress | null>;
  }

  /**
   * Batch-fetch progress records for a user across multiple dates.
   * Returns a map keyed by date for O(1) lookups.
   */
  static async findByUserAndDates(
    userId: string,
    contentType: string,
    dates: string[]
  ): Promise<Record<string, IUserContentProgress>> {
    const records = await UserContentProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
      contentType,
      date: { $in: dates },
    }).lean();

    const map: Record<string, IUserContentProgress> = {};
    for (const record of records) {
      map[(record as any).date] = record as IUserContentProgress;
    }
    return map;
  }

  /**
   * Upsert a progress record. Enforces no regression from COMPLETED.
   * Returns the updated document.
   */
  static async upsertProgress(
    userId: string,
    contentType: string,
    date: string,
    newStatus: ProgressStatus,
    options: { contentId?: string } = {}
  ): Promise<IUserContentProgress | null> {
    const now = new Date();

    const setFields: any = { status: newStatus, updatedAt: now };
    const setOnInsert: any = {
      userId: new mongoose.Types.ObjectId(userId),
      contentType,
      date,
      createdAt: now,
    };

    if (options.contentId) {
      setOnInsert.contentId = options.contentId;
    }

    if (newStatus === 'IN_PROGRESS') {
      setFields.startedAt = now;
    }

    if (newStatus === 'COMPLETED') {
      setFields.completedAt = now;
      if (!setFields.startedAt) {
        setFields.startedAt = now;
      }
    }

    // Prevent regression: never go from COMPLETED back to a lower state
    const filter: any = {
      userId: new mongoose.Types.ObjectId(userId),
      contentType,
      date,
    };

    if (newStatus === 'IN_PROGRESS') {
      // Only update if currently INCOMPLETE (not already IN_PROGRESS or COMPLETED)
      filter.status = 'INCOMPLETE';
    } else if (newStatus === 'COMPLETED') {
      // Update if INCOMPLETE or IN_PROGRESS (not already COMPLETED)
      filter.status = { $in: ['INCOMPLETE', 'IN_PROGRESS'] };
    }

    // First, attempt the status-gated update
    const result = await UserContentProgress.findOneAndUpdate(
      filter,
      { $set: setFields, $setOnInsert: setOnInsert },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    // If the gated update matched nothing (already in target or higher state),
    // fetch the existing record to return the current state
    if (!result) {
      return UserContentProgress.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        contentType,
        date,
      }).lean() as Promise<IUserContentProgress | null>;
    }

    return result as IUserContentProgress;
  }

  /**
   * Count completed devotionals across a set of dates.
   * Used for the weekly progress summary.
   */
  static async countCompleted(
    userId: string,
    contentType: string,
    dates: string[]
  ): Promise<number> {
    return UserContentProgress.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      contentType,
      date: { $in: dates },
      status: 'COMPLETED',
    });
  }
}
