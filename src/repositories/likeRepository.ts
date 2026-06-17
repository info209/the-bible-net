import { Like, ILike } from '@/models/Like';
import { Content } from '@/models/Content';
import { DailyContent } from '@/models/DailyContent';
import mongoose from 'mongoose';

export class LikeRepository {
    static async addLike(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion', userId?: string, guestIdentifier?: string): Promise<number> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const likeData: any = { contentId, contentType };
            if (userId) likeData.userId = userId;
            if (guestIdentifier) likeData.guestIdentifier = guestIdentifier;

            const like = new Like(likeData);
            await like.save({ session });

            let likeCount = 0;
            if (contentType === 'daily-verse') {
                const updated = await DailyContent.findByIdAndUpdate(contentId, { $inc: { verseLikeCount: 1 } }, { session, returnDocument: 'after' });
                likeCount = updated?.verseLikeCount || 0;
            } else if (contentType === 'daily-devotion') {
                const updated = await DailyContent.findByIdAndUpdate(contentId, { $inc: { devotionLikeCount: 1 } }, { session, returnDocument: 'after' });
                likeCount = updated?.devotionLikeCount || 0;
            } else {
                const updated = await Content.findByIdAndUpdate(contentId, { $inc: { likeCount: 1 } }, { session, returnDocument: 'after' });
                likeCount = updated?.likeCount || 0;
            }

            await session.commitTransaction();
            return likeCount;
        } catch (error: any) {
            await session.abortTransaction();
            if (error.code === 11000) {
                if (contentType === 'daily-verse' || contentType === 'daily-devotion') {
                    const updated = await DailyContent.findById(contentId);
                    return contentType === 'daily-verse' ? (updated?.verseLikeCount || 0) : (updated?.devotionLikeCount || 0);
                } else {
                    const updatedContent = await Content.findById(contentId);
                    return updatedContent?.likeCount || 0;
                }
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async removeLike(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion', userId?: string, guestIdentifier?: string): Promise<number> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const query: any = { contentId, contentType };
            if (userId) query.userId = userId;
            else if (guestIdentifier) query.guestIdentifier = guestIdentifier;
            else throw new Error('User or Guest identifier required');

            const deletedLike = await Like.findOneAndDelete(query, { session });
            
            let likeCount = 0;
            if (deletedLike) {
                if (deletedLike.contentType === 'daily-verse') {
                    const updated = await DailyContent.findByIdAndUpdate(contentId, { $inc: { verseLikeCount: -1 } }, { session, returnDocument: 'after' });
                    likeCount = updated?.verseLikeCount || 0;
                } else if (deletedLike.contentType === 'daily-devotion') {
                    const updated = await DailyContent.findByIdAndUpdate(contentId, { $inc: { devotionLikeCount: -1 } }, { session, returnDocument: 'after' });
                    likeCount = updated?.devotionLikeCount || 0;
                } else {
                    const updated = await Content.findByIdAndUpdate(contentId, { $inc: { likeCount: -1 } }, { session, returnDocument: 'after' });
                    likeCount = updated?.likeCount || 0;
                }
            } else {
                // Determine content type by checking Like or fallback query. But if deletedLike is null, it means it wasn't liked.
                // We'll just return 0 or fetch from Content directly. For safety, just 0.
            }

            await session.commitTransaction();
            return Math.max(0, likeCount);
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async hasLiked(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion', userId?: string, guestIdentifier?: string): Promise<boolean> {
        const query: any = { contentId, contentType };
        if (userId) {
            query.userId = userId;
        } else if (guestIdentifier) {
            query.guestIdentifier = guestIdentifier;
        } else {
            return false;
        }
        const like = await Like.findOne(query);
        return !!like;
    }
}
