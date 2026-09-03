import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/download:
 *   get:
 *     summary: Download complete Bible version dataset for offline storage
 *     description: Retrieve all books, chapters, verses, and footnotes for an entire Bible version.
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: string }
 *         description: Version ID or abbreviation (e.g., KJV, NKJV)
 *     responses:
 *       200:
 *         description: Complete Bible version dataset
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *       404:
 *         description: Version not found
 *       500:
 *         description: Internal server error
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { version: string } }
) {
    try {
        await connectDB();
        const versionIdentifier = params.version;

        if (!versionIdentifier) {
            return NextResponse.json(
                { success: false, error: 'Version parameter is required' },
                { status: 400 }
            );
        }

        const data = await BibleService.getVersionFullDownloadData(versionIdentifier);

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error: any) {
        console.error('Error in version download API:', error);
        const status = error?.message?.includes('not found') ? 404 : 500;
        return NextResponse.json(
            { success: false, error: error?.message || 'Failed to download Bible version' },
            { status }
        );
    }
}
