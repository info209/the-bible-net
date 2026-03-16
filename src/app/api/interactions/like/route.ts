import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithType } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';
import { likeSchema } from '@/lib/validations/interaction';
import { LikeRepository } from '@/repositories/likeRepository';


/**
 * @swagger
 * /api/interactions/like:
 *   post:
 *     summary: Like a piece of content
 *     tags: [Interactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentId, type]
 *             properties:
 *               contentId: { type: string }
 *               type: { type: string, enum: [verse, devotion] }
 *     responses:
 *       200:
 *         description: Like added
 *       400:
 *         description: Already liked or invalid input
 */
export async function POST(req: NextRequest) {
    try {
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

        // Temporary debug logs
        console.log("Session:", session ? JSON.stringify(session) : "null");
        console.log("Session Type:", sessionType);
        console.log("Role:", session?.user?.role || "GUEST");
        console.log("Guest ID:", guestIdentifier || "N/A");

        // Check if already liked to toggle
        const hasLiked = await LikeRepository.hasLiked(contentId, userId, guestIdentifier);
        
        let likeCount: number;
        let action: 'liked' | 'unliked';

        if (hasLiked) {
            // Toggle off
            likeCount = await LikeRepository.removeLike(contentId, userId, guestIdentifier);
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
