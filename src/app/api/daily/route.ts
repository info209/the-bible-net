import { NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';
import { connectDB } from '@/lib/db';

export async function GET(request: Request) {
    try {
        await connectDB();
        
        const { searchParams } = new URL(request.url);
        const days = parseInt(searchParams.get('days') || '7');

        const recentContent = await DailyContentService.getRecentDailyContent(days);
        
        if (!recentContent || recentContent.length === 0) {
            return NextResponse.json({ error: 'No daily content found' }, { status: 404 });
        }
        
        return NextResponse.json({ data: recentContent });
    } catch (error) {
        console.error('Error fetching recent daily content:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
