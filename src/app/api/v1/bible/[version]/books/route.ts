import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';
import { BibleVersion } from '@/models/Bible';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/{version}/books:
 *   get:
 *     summary: Get books for a specific Bible version
 *     description: Retrieve all books (Genesis-Revelation) for a given version ID or abbreviation.
 *     tags: [Bible]
 *     parameters:
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: string }
 *         description: Version ID or abbreviation (e.g., KJV, NKJV)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 66 }
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Successfully retrieved books
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BibleBook' }
 *       404:
 *         description: Version not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
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
        let version = null;
        if (mongoose.Types.ObjectId.isValid(versionId)) {
            version = await BibleVersion.findById(versionId).catch(() => null);
        }
        if (!version) {
            const escaped = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            version = await BibleVersion.findOne({ abbreviation: new RegExp(`^${escaped}$`, 'i') }).catch(() => null);
        }
        if (!version) {
            const escaped = versionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            version = await BibleVersion.findOne({ name: new RegExp(`^${escaped}$`, 'i') }).catch(() => null);
        }

        if (!version) {
            return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
        }

        const data = await BibleService.getBooksByVersion(version._id.toString(), page, limit);

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
