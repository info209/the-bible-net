import { Comment, IComment } from '@/models/Comment';
import { Content } from '@/models/Content';
import { DailyContent } from '@/models/DailyContent';
import mongoose from 'mongoose';

export class CommentRepository {
    static async addComment(
        contentId: string,
        contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion',
        userId: string,
        commentText: string,
        clientMutationId?: string
    ): Promise<IComment> {
        if (clientMutationId) {
            const existing = await Comment.findOne({ userId, clientMutationId }).populate('userId', 'firstName lastName image');
            if (existing) {
                return existing;
            }
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const comment = new Comment({
                contentId,
                contentType,
                userId,
                commentText,
                clientMutationId,
            });
            const savedComment = await comment.save({ session });

            let commentCount = 0;
            if (contentType === 'daily-verse') {
                const doc = await DailyContent.findByIdAndUpdate(
                    contentId,
                    { $inc: { verseCommentCount: 1 } },
                    { session, new: true }
                ).select('verseCommentCount');
                commentCount = doc?.verseCommentCount || 0;
            } else if (contentType === 'daily-devotion') {
                const doc = await DailyContent.findByIdAndUpdate(
                    contentId,
                    { $inc: { devotionCommentCount: 1 } },
                    { session, new: true }
                ).select('devotionCommentCount');
                commentCount = doc?.devotionCommentCount || 0;
            } else {
                const doc = await Content.findByIdAndUpdate(
                    contentId,
                    { $inc: { commentCount: 1 } },
                    { session, new: true }
                ).select('commentCount');
                commentCount = doc?.commentCount || 0;
            }

            await session.commitTransaction();
            return { ...savedComment.toObject(), commentCount } as any;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getComments(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion'): Promise<IComment[]> {
        return await Comment.find({ contentId, contentType })
            .populate('userId', 'firstName lastName image')
            .sort({ createdAt: -1 });
    }

    static async deleteComment(commentId: string, userId: string): Promise<{ success: boolean; contentId?: string; contentType?: string }> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const comment = await Comment.findOne({ _id: commentId, userId });
            if (!comment) {
                await session.abortTransaction();
                return { success: false };
            }

            await Comment.deleteOne({ _id: commentId }, { session });

            if (comment.contentType === 'daily-verse') {
                await DailyContent.findByIdAndUpdate(comment.contentId, { $inc: { verseCommentCount: -1 } }, { session });
            } else if (comment.contentType === 'daily-devotion') {
                await DailyContent.findByIdAndUpdate(comment.contentId, { $inc: { devotionCommentCount: -1 } }, { session });
            } else {
                await Content.findByIdAndUpdate(comment.contentId, { $inc: { commentCount: -1 } }, { session });
            }

            await session.commitTransaction();
            return {
                success: true,
                contentId: String(comment.contentId),
                contentType: comment.contentType,
            };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
