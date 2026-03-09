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
