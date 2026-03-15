import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';
import { BibleVersion } from '@/models/Bible';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/books:
 *   get:
 *     summary: Get books for a specific version
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { version: string } }
) {
    try {
        await connectDB();
        const versionId = params.version;

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        // Verify version exists
        const version = await BibleService.getVersionByAbbreviation(versionId).catch(() => null) 
            || await BibleVersion.findById(versionId).catch(() => null);

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
