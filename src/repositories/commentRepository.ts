import { Comment, IComment } from '@/models/Comment';
import { Content } from '@/models/Content';
import { DailyContent } from '@/models/DailyContent';
import mongoose from 'mongoose';

export class CommentRepository {
    static async addComment(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion', userId: string, commentText: string): Promise<IComment> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const comment = new Comment({
                contentId,
                contentType,
                userId,
                commentText
            });
            const savedComment = await comment.save({ session });

            if (contentType === 'daily-verse') {
                await DailyContent.findByIdAndUpdate(contentId, { $inc: { verseCommentCount: 1 } }, { session });
            } else if (contentType === 'daily-devotion') {
                await DailyContent.findByIdAndUpdate(contentId, { $inc: { devotionCommentCount: 1 } }, { session });
            } else {
                await Content.findByIdAndUpdate(contentId, { $inc: { commentCount: 1 } }, { session });
            }

            await session.commitTransaction();
            return savedComment;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async getComments(contentId: string, contentType: 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion'): Promise<IComment[]> {
        return await Comment.find({ contentId, contentType })
            .populate('userId', 'name image') // Assuming User model has name and image
            .sort({ createdAt: -1 });
    }

    static async deleteComment(commentId: string, userId: string): Promise<boolean> {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const comment = await Comment.findOne({ _id: commentId, userId });
            if (!comment) {
                await session.abortTransaction();
                return false;
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
            return true;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}
