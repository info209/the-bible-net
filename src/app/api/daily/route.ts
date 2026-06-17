import { NextRequest, NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';
import { getSessionWithType } from '@/lib/auth-helpers';
import { Like } from '@/models/Like';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7');

        // Determine version: prefer explicit query param, then session, then default KJV
        let version = searchParams.get('version') || 'KJV';

        // Try to get version from authenticated session
        try {
            const session = await auth();
            if (session?.user && (session.user as any).preferredBibleVersion) {
                version = (session.user as any).preferredBibleVersion;
            }
        } catch {
            // Not authenticated — use query param or default
        }

        const recentContent = await DailyContentService.getRecentDailyContent(days, version);

        if (!recentContent || recentContent.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Fetch likes for user or guest
        let userId: string | undefined;
        let guestIdentifier: string | undefined;

        try {
            const { session, type: sessionType } = await getSessionWithType();
            if (sessionType !== 'GUEST' && session?.user) {
                userId = session.user.id;
            } else {
                const cookieStore = await cookies();
                guestIdentifier = cookieStore.get('guest_id')?.value;
            }
        } catch (err) {
            console.error('Error getting session in GET daily:', err);
        }

        let likedVerseIds = new Set<string>();
        let likedDevotionIds = new Set<string>();

        if (userId || guestIdentifier) {
            const query: any = {
                contentId: { $in: recentContent.map(c => c._id.toString()) }
            };
            if (userId) {
                query.userId = userId;
            } else {
                query.guestIdentifier = guestIdentifier;
            }

            const userLikes = await Like.find(query).lean();
            userLikes.forEach((like: any) => {
                const contentIdStr = like.contentId.toString();
                if (like.contentType === 'daily-verse' || like.contentType === 'verse') {
                    likedVerseIds.add(contentIdStr);
                } else if (like.contentType === 'daily-devotion' || like.contentType === 'devotion') {
                    likedDevotionIds.add(contentIdStr);
                }
            });
        }

        const enrichedContent = recentContent.map(item => ({
            ...item,
            isVerseLiked: likedVerseIds.has(item._id.toString()),
            isDevotionLiked: likedDevotionIds.has(item._id.toString())
        }));

        return NextResponse.json({ data: enrichedContent });
    } catch (error) {
        console.error('Error fetching recent daily content:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
