import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';

/**
 * @swagger
 * /api/versions:
 *   get:
 *     summary: Get all Bible versions
 *     description: Retrieve a list of all available Bible versions with optional pagination
 *     tags:
 *       - Bible
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of Bible versions
 *       500:
 *         description: Server error
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

        const data = await BibleService.getAllVersions(page, limit);

        return NextResponse.json(
            {
                success: true,
                data
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Get versions error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch versions' },
            { status: 500 }
        );
    }
}
