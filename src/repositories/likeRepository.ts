import { Like, ILike } from '@/models/Like';
import { Content } from '@/models/Content';
import mongoose from 'mongoose';

export class LikeRepository {
    static async addLike(contentId: string, contentType: 'verse' | 'devotion', userId?: string, guestIdentifier?: string): Promise<number> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const likeData: any = { contentId, contentType };
            if (userId) likeData.userId = userId;
            if (guestIdentifier) likeData.guestIdentifier = guestIdentifier;

            const like = new Like(likeData);
            await like.save({ session });

            const updatedContent = await Content.findByIdAndUpdate(
                contentId,
                { $inc: { likeCount: 1 } },
                { session, returnDocument: 'after' }
            );

            await session.commitTransaction();
            return updatedContent?.likeCount || 0;
        } catch (error: any) {
            await session.abortTransaction();
            // If it's a duplicate key error, we can ignore it or handle it as "already liked"
            if (error.code === 11000) {
                const updatedContent = await Content.findById(contentId);
                return updatedContent?.likeCount || 0;
            }
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async removeLike(contentId: string, userId?: string, guestIdentifier?: string): Promise<number> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const query: any = { contentId };
            if (userId) query.userId = userId;
            else if (guestIdentifier) query.guestIdentifier = guestIdentifier;
            else throw new Error('User or Guest identifier required');

            const deletedLike = await Like.findOneAndDelete(query, { session });
            
            let likeCount = 0;
            if (deletedLike) {
                const updatedContent = await Content.findByIdAndUpdate(
                    contentId,
                    { $inc: { likeCount: -1 } },
                    { session, returnDocument: 'after' }
                );
                likeCount = updatedContent?.likeCount || 0;
            } else {
                const content = await Content.findById(contentId);
                likeCount = content?.likeCount || 0;
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

    static async hasLiked(contentId: string, userId?: string, guestIdentifier?: string): Promise<boolean> {
        const query: any = { contentId };
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
