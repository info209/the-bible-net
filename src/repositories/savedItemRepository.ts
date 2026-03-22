import mongoose from 'mongoose';
import { SavedItem, ISavedItem, SavedItemType, ISavedItemMetadata } from '@/models/SavedItem';

export interface SavePayload {
  type: SavedItemType;
  refId: string;
  metadata?: ISavedItemMetadata;
}

export class SavedItemRepository {
  /**
   * Save an item. Uses upsert so calling twice is idempotent.
   * Returns the saved document.
   */
  static async saveItem(
    userId: string,
    payload: SavePayload
  ): Promise<ISavedItem> {
    const { type, refId, metadata = {} } = payload;

    const result = await SavedItem.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        type,
        refId,
      },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(userId),
          type,
          refId,
          metadata,
        },
      },
      { upsert: true, new: true }
    );

    return result!;
  }

  /**
   * Unsave an item by its _id.
   * The userId guard prevents one user from deleting another's saves.
   */
  static async unsaveItem(userId: string, id: string): Promise<boolean> {
    const result = await SavedItem.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return result !== null;
  }

  /**
   * Unsave an item by (userId, type, refId) — handy for optimistic toggle
   * without knowing the _id on the client.
   */
  static async unsaveByRef(
    userId: string,
    type: SavedItemType,
    refId: string
  ): Promise<boolean> {
    const result = await SavedItem.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      refId,
    });
    return result !== null;
  }

  /**
   * Get all saved items for a user, optionally filtered by type.
   * Supports cursor-based pagination via `page` & `limit`.
   */
  static async getSavedItems(
    userId: string,
    type?: SavedItemType,
    page = 1,
    limit = 20
  ): Promise<{ items: ISavedItem[]; total: number; hasMore: boolean }> {
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (type) filter.type = type;

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SavedItem.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SavedItem.countDocuments(filter),
    ]);

    return {
      items: items as ISavedItem[],
      total,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * Check whether a particular item is already saved.
   */
  static async isItemSaved(
    userId: string,
    type: SavedItemType,
    refId: string
  ): Promise<boolean> {
    const count = await SavedItem.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      refId,
    });
    return count > 0;
  }

  /**
   * Get a single saved item by id (with user guard).
   */
  static async getById(
    userId: string,
    id: string
  ): Promise<ISavedItem | null> {
    return SavedItem.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean() as Promise<ISavedItem | null>;
  }
}
