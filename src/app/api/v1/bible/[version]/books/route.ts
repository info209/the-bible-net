import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export async function GET(
    req: NextRequest,
    { params }: { params: { version: string } }
) {
    try {
        await connectDB();
        const versionAbbr = params.version.toUpperCase();

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Find version first to get ID
        const version = await BibleService.getVersionByAbbreviation(versionAbbr);
        if (!version) {
            return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
        }

        const data = await BibleService.getBooksByVersion(version._id, page, limit);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching Bible books:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch books' },
            { status: 500 }
        );
    }
}
