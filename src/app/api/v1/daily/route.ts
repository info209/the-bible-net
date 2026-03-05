import { NextRequest, NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';
import { ContentType } from '@/models/Content';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/daily:
 *   get:
 *     summary: Get daily verse or devotion (Globally consistent)
 *     description: Rotates automatically every 24 hours at 00:00 UTC. Same content for all users.
 *     tags: [Daily Content]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [verse, devotion] }
 *         required: true
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Content' }
 *       404:
 *         description: Not found (Seed required)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') as ContentType;

        if (!type || !['verse', 'devotion'].includes(type)) {
            return NextResponse.json({ success: false, error: 'Query parameter type (verse|devotion) is required.' }, { status: 400 });
        }

        const data = await DailyContentService.getDailyContent(type);

        if (!data) {
            return NextResponse.json({ success: false, error: `No daily ${type} available. Admin must seed content first.` }, { status: 404 });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error: any) {
        console.error('Fetch daily content error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
