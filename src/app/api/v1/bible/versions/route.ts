import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/versions:
 *   get:
 *     summary: List all available Bible versions
 *     tags: [Bible]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Success
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
