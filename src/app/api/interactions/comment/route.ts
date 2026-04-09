import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { commentSchema } from '@/lib/validations/interaction';
import { CommentRepository } from '@/repositories/commentRepository';

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

        const { contentId, type, comment: commentText } = validatedData.data;

        const comment = await CommentRepository.addComment(contentId, type, session.user.id as string, commentText);

        return NextResponse.json({ success: true, comment });
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
        const type = searchParams.get('type') as 'verse' | 'devotion';

        if (!contentId || !type) {
            return NextResponse.json({ error: 'contentId and type are required' }, { status: 400 });
        }

        const comments = await CommentRepository.getComments(contentId, type);
        return NextResponse.json(comments);
    } catch (error: any) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
