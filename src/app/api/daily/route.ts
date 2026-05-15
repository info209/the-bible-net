import { NextRequest, NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';
import { connectDB } from '@/lib/db';
import { auth } from '@/lib/auth';

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

        return NextResponse.json({ data: recentContent });
    } catch (error) {
        console.error('Error fetching recent daily content:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
