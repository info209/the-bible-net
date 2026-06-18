import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithType, getUserSession } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';
import { likeSchema } from '@/lib/validations/interaction';
import { LikeRepository } from '@/repositories/likeRepository';
import { connectDB } from '@/lib/db';
import { Like } from '@/models/Like';
import { DailyContent } from '@/models/DailyContent';
import { Content } from '@/models/Content';
import { User } from '@/models/User';
import { DailyContentService } from '@/services/dailyContentService';


/**
 * @swagger
 * /api/interactions/like:
 *   post:
 *     summary: Like/Unlike a piece of content (Toggle)
 *     description: Toggles a like for the given content. Works for both authenticated users and guests.
 *     tags: [Interactions]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, type]
 *             properties:
 *               contentId:
 *                 type: string
 *                 description: The ID of the verse or devotion to like
 *               type:
 *                 type: string
 *                 enum: [verse, devotion]
 *                 description: The type of content
 *     responses:
 *       200:
 *         description: Successfully toggled like
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 likeCount: { type: number, description: New total like count }
 *                 action: { type: string, enum: [liked, unliked] }
 *                 liked: { type: boolean, description: Current like status }
 *       400:
 *         description: Invalid input or missing parameters
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
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
        await connectDB();
        const { session, type: sessionType } = await getSessionWithType();
        const body = await req.json();
        
        const validatedData = likeSchema.safeParse(body);
        if (!validatedData.success) {
            return NextResponse.json({ error: validatedData.error.issues[0].message }, { status: 400 });
        }

        const { contentId, type } = validatedData.data;

        let userId: string | undefined;
        let guestIdentifier: string | undefined;

        if (sessionType !== 'GUEST' && session?.user) {
            userId = session.user.id;
        } else {
            // Handle guest identification (Strictly for Guest sessionType)
            const cookieStore = await cookies();
            let guestId = cookieStore.get('guest_id')?.value;
            
            if (!guestId) {
                guestId = crypto.randomUUID();
                // Set cookie for 1 year
                (await cookies()).set('guest_id', guestId, { 
                    maxAge: 60 * 60 * 24 * 365,
                    httpOnly: true,
                    path: '/'
                });
            }
            guestIdentifier = guestId;
        }

        // Check if already liked to toggle
        const hasLiked = await LikeRepository.hasLiked(contentId, type, userId, guestIdentifier);
        
        let likeCount: number;
        let action: 'liked' | 'unliked';

        if (hasLiked) {
            // Toggle off
            likeCount = await LikeRepository.removeLike(contentId, type, userId, guestIdentifier);
            action = 'unliked';
        } else {
            // Toggle on
            likeCount = await LikeRepository.addLike(contentId, type, userId, guestIdentifier);
            action = 'liked';
        }

        return NextResponse.json({ 
            success: true, 
            likeCount,
            action,
            liked: action === 'liked'
        });
    } catch (error: any) {
        console.error('Error in like API:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/interactions/like:
 *   get:
 *     summary: Get user's liked items
 *     description: Retrieve all daily verses, daily devotionals, and other content liked by the currently logged-in user.
 *     tags: [Interactions]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of liked items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { type: array, items: { type: object } }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        // Fetch user's preferred version
        const user = await User.findById(session.user.id).lean();
        const preferredVersion = (user as any)?.preferredBibleVersion || 'KJV';

        // Fetch all likes for the user
        const likes = await Like.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .lean();

        // Populate content details
        const enrichedLikes = await Promise.all(
            likes.map(async (like: any) => {
                try {
                    if (like.contentType === 'daily-verse') {
                        const daily = await DailyContent.findById(like.contentId).lean();
                        if (!daily) return null;
                        
                        const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                        return {
                            _id: like._id,
                            contentId: like.contentId,
                            contentType: like.contentType,
                            createdAt: like.createdAt,
                            reference: enriched.verseReference,
                            text: enriched.verse,
                            date: enriched.date,
                            version: preferredVersion,
                        };
                    } else if (like.contentType === 'daily-devotion') {
                        const daily = await DailyContent.findById(like.contentId).lean();
                        if (!daily) return null;

                        const enriched = await DailyContentService.enrichWithVerseText(daily as any, preferredVersion);
                        return {
                            _id: like._id,
                            contentId: like.contentId,
                            contentType: like.contentType,
                            createdAt: like.createdAt,
                            title: enriched.devotionalTitle,
                            text: enriched.devotionalContent,
                            verseRef: enriched.devotionalVerseRef,
                            date: enriched.date,
                            backgroundImage: enriched.backgroundImage,
                            devotionalBackgroundImage: enriched.devotionalBackgroundImage,
                        };
                    } else if (like.contentType === 'verse' || like.contentType === 'devotion') {
                        const content = await Content.findById(like.contentId).lean();
                        if (!content) return null;
                        return {
                            _id: like._id,
                            contentId: like.contentId,
                            contentType: like.contentType,
                            createdAt: like.createdAt,
                            title: (content as any).title,
                            reference: (content as any).reference,
                            text: (content as any).text,
                        };
                    }
                    return null;
                } catch (err) {
                    console.error('Error enriching like:', like, err);
                    return null;
                }
            })
        );

        // Filter out nulls
        const data = enrichedLikes.filter(item => item !== null);

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error in GET likes API:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
