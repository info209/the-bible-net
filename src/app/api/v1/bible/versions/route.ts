import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/versions:
 *   get:
 *     summary: List all available Bible versions
 *     description: Retrieve a paginated list of supported Bible versions (e.g., KJV, NKJV).
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Number of versions per page
 *     responses:
 *       200:
 *         description: Successfully retrieved list of versions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/BibleVersion' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        const data = await BibleService.getAllVersions(page, limit);

        return NextResponse.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error fetching Bible versions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch versions' },
            { status: 500 }
        );
    }
}
