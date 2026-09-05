import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { commentSchema } from '@/lib/validations/interaction';
import { CommentRepository } from '@/repositories/commentRepository';
import { connectDB } from '@/lib/db';
import { Comment } from '@/models/Comment';
import { DailyContent } from '@/models/DailyContent';
import { Content } from '@/models/Content';
import { User } from '@/models/User';
import { DailyContentService } from '@/services/dailyContentService';

/**
 * @swagger
 * /api/interactions/comment:
 *   post:
 *     summary: Add a comment to content
 *     description: Authenticated users can post comments on verses or devotions.
 *     tags: [Interactions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, type, comment]
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: ID of the content being commented on
 *               type:
 *                 type: string
 *                 enum: [verse, devotion]
 *                 description: Type of the content
 *               comment:
 *                 type: string
 *                 description: The comment text (max 500 chars)
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 comment: { $ref: '#/components/schemas/Comment' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Authentication required to comment' }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = commentSchema.safeParse(body);
        if (!validatedData.success) {
            return NextResponse.json({ error: validatedData.error.issues[0].message }, { status: 400 });
        }

        const { contentId, type, comment: commentText, clientMutationId } = validatedData.data;

        const comment = await CommentRepository.addComment(
            contentId,
            type,
            session.user.id as string,
            commentText,
            clientMutationId
        );

        return NextResponse.json({
            success: true,
            comment,
            commentCount: (comment as any).commentCount,
        });
    } catch (error: any) {
        console.error('Error in comment API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/interactions/comment:
 *   get:
 *     summary: Get comments for content
 *     description: Retrieve a list of comments for a specific verse or devotion.
 *     tags: [Interactions]
 *     parameters:
 *       - in: query
 *         name: contentId
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the verse or devotion
 *       - in: query
 *         name: type
 *         required: true
 *         schema: { type: string, enum: [verse, devotion] }
 *         description: The type of the content
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Comment' }
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const contentId = searchParams.get('contentId');
        const type = searchParams.get('type') as 'verse' | 'devotion' | 'daily-verse' | 'daily-devotion';

        if (!contentId) {
            // Fetch current user's comments
            const session = await getUserSession();
            if (!session?.user?.id) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            await connectDB();

            // Fetch user's preferred version
            const user = await User.findById(session.user.id).lean();
            const preferredVersion = (user as any)?.preferredBibleVersion || 'KJV';

            // Fetch all comments for the user
            const comments = await Comment.find({ userId: session.user.id })
                .sort({ createdAt: -1 })
                .lean();

            // Populate content details
            const enrichedComments = await Promise.all(
                comments.map(async (comment: any) => {
                    try {
                        if (comment.contentType === 'daily-verse') {
                            const daily = await DailyContent.findById(comment.contentId).lean();
                            if (!daily) return null;

                            const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                            return {
                                _id: comment._id,
                                contentId: comment.contentId,
                                contentType: comment.contentType,
                                commentText: comment.commentText,
                                createdAt: comment.createdAt,
                                reference: enriched.verseReference,
                                text: enriched.verse,
                                date: enriched.date,
                                version: preferredVersion,
                            };
                        } else if (comment.contentType === 'daily-devotion') {
                            const daily = await DailyContent.findById(comment.contentId).lean();
                            if (!daily) return null;

                            const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                            return {
                                _id: comment._id,
                                contentId: comment.contentId,
                                contentType: comment.contentType,
                                commentText: comment.commentText,
                                createdAt: comment.createdAt,
                                title: enriched.devotionalTitle,
                                text: enriched.devotionalContent,
                                verseRef: enriched.devotionalVerseRef,
                                date: enriched.date,
                            };
                        } else if (comment.contentType === 'verse' || comment.contentType === 'devotion') {
                            const content = await Content.findById(comment.contentId).lean();
                            if (!content) return null;
                            return {
                                _id: comment._id,
                                contentId: comment.contentId,
                                contentType: comment.contentType,
                                commentText: comment.commentText,
                                createdAt: comment.createdAt,
                                title: (content as any).title,
                                reference: (content as any).reference,
                                text: (content as any).text,
                            };
                        }
                        return null;
                    } catch (err) {
                        console.error('Error enriching comment:', comment, err);
                        return null;
                    }
                })
            );

            // Filter out nulls
            const filteredComments = enrichedComments.filter(item => item !== null);
            return NextResponse.json({ success: true, data: filteredComments });
        }

        if (!type) {
            return NextResponse.json({ error: 'type is required when contentId is provided' }, { status: 400 });
        }

        const comments = await CommentRepository.getComments(contentId, type);
        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
