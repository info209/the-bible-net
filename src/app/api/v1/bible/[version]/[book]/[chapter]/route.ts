import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: { version: string; book: string; chapter: string } }
) {
    try {
        await connectDB();
        const versionAbbr = params.version;
        const bookName = params.book;
        const chapterNum = parseInt(params.chapter);

        if (isNaN(chapterNum)) {
            return NextResponse.json({ success: false, error: 'Invalid chapter number' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const data = await BibleService.getChapterContent(versionAbbr, bookName, chapterNum, q || undefined);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error fetching chapter content:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch chapter content' },
            { status: error.message?.includes('not found') ? 404 : 500 }
        );
    }
}
