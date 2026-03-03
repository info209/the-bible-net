import { NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export async function GET(req: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);

        // Example: /api/v1/bible/verses?chapterId=...&page=1&limit=10
        const chapterId = searchParams.get('chapterId');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '100'); // Default to full chapter usually, but support pagination

        if (!chapterId) {
            return NextResponse.json({ success: false, error: 'chapterId is required' }, { status: 400 });
        }

        // Since getVersesByChapter in service returns array, we might want to paginate it there too 
        // or just slice here. For efficiency, ideally service handles it. 
        // But currently service returns all. Let's stick to the "Chapter Content" API for reading,
        // and this endpoint for raw data if needed.
        // Actually, user said "api's should return paginated responses". 
        // Let's create a general endpoint.

        const versesData = await BibleService.getVersesByChapter(chapterId, page, limit);

        return NextResponse.json({
            success: true,
            data: versesData
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
