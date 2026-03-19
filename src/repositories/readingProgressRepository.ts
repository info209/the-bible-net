import { ReadingProgress, IReadingProgress } from '@/models/ReadingProgress';
import mongoose from 'mongoose';

export class ReadingProgressRepository {
  static async upsertProgress(
    userId: string,
    data: {
      bookId: string;
      bookName?: string;
      chapter: number;
      versionId: string;
      versionName?: string;
      completed?: boolean;
      progressPercent?: number;
    }
  ): Promise<IReadingProgress | null> {
    try {
      const { bookId, chapter, versionId, bookName, versionName, completed = false, progressPercent = 0 } = data;
      
      const update = {
        bookName,
        versionId,
        versionName,
        completed,
        progressPercent,
        lastReadAt: new Date(),
      };

      const result = await ReadingProgress.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), bookId, chapter },
        { $set: update },
        { upsert: true, new: true }
      );

      return result;
    } catch (error) {
      console.error('Error in upsertProgress:', error);
      throw error;
    }
  }

  private static bookCache: Record<string, string> = {};
  private static versionCache: Record<string, string> = {};

  static async resolveNames(progress: any): Promise<any> {
    if (!progress) return null;
    const items = Array.isArray(progress) ? progress : [progress];
    
    // Import models inside methods to avoid circular dependencies if any
    const { Book, BibleVersion } = require('@/models/Bible');

    for (const item of items) {
      if (!item.bookName && item.bookId) {
        if (this.bookCache[item.bookId]) {
          item.bookName = this.bookCache[item.bookId];
        } else {
          try {
            const book = await Book.findById(item.bookId);
            if (book) {
              item.bookName = book.name;
              this.bookCache[item.bookId] = book.name;
            }
          } catch (e) {}
        }
      }

      if (!item.versionName && item.versionId) {
        if (this.versionCache[item.versionId]) {
          item.versionName = this.versionCache[item.versionId];
        } else {
          try {
            const version = await BibleVersion.findById(item.versionId);
            if (version) {
              item.versionName = version.abbreviation || version.name;
              this.versionCache[item.versionId] = item.versionName;
            }
          } catch (e) {}
        }
      }
    }

    return Array.isArray(progress) ? items : items[0];
  }

  static async getProgress(userId: string): Promise<IReadingProgress[]> {
    try {
      const results = await ReadingProgress.find({ 
        userId: new mongoose.Types.ObjectId(userId) 
      }).sort({ lastReadAt: -1 }).lean();
      
      return await this.resolveNames(results);
    } catch (error) {
      console.error('Error in getProgress:', error);
      throw error;
    }
  }

  static async getLatestProgress(userId: string): Promise<IReadingProgress | null> {
    try {
      const result = await ReadingProgress.findOne({ 
        userId: new mongoose.Types.ObjectId(userId) 
      }).sort({ lastReadAt: -1 }).lean();
      
      return await this.resolveNames(result);
    } catch (error) {
      console.error('Error in getLatestProgress:', error);
      throw error;
    }
  }

  static async syncProgress(userId: string, guestProgress: any[]): Promise<void> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);
      
      for (const item of guestProgress) {
        const { bookId, bookName, chapter, versionId, versionName, lastReadAt } = item;
        
        // Find if this specific chapter progress exists for the user
        const existing = await ReadingProgress.findOne({
          userId: userObjectId,
          bookId,
          chapter
        });

        if (!existing) {
          // If it doesn't exist, insert it
          await ReadingProgress.create({
            userId: userObjectId,
            bookId,
            bookName,
            chapter,
            versionId,
            versionName,
            lastReadAt: lastReadAt ? new Date(lastReadAt) : new Date(),
            completed: item.completed || false,
            progressPercent: item.progressPercent || 0
          });
        } else {
          // If it exists, only update if the guest progress is newer
          const guestDate = lastReadAt ? new Date(lastReadAt) : new Date(0);
          if (guestDate > existing.lastReadAt) {
            await ReadingProgress.updateOne(
              { _id: existing._id },
              { 
                $set: { 
                    bookName: bookName || existing.bookName,
                  versionId, 
                  versionName: versionName || existing.versionName,
                  lastReadAt: guestDate,
                  completed: item.completed || existing.completed,
                  progressPercent: item.progressPercent || existing.progressPercent
                } 
              }
            );
          }
        }
      }
    } catch (error) {
      console.error('Error in syncProgress:', error);
      throw error;
    }
  }
}
