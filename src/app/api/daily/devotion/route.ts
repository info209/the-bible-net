import { NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';

/**
 * @swagger
 * /api/daily/devotion:
 *   get:
 *     summary: Get the daily devotion
 *     tags: [Daily Content]
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 */
export async function GET() {
    try {
        const devotion = await DailyContentService.getDailyContent('devotion');
        if (!devotion) {
            return NextResponse.json({ error: 'Daily devotion not found' }, { status: 404 });
        }
        return NextResponse.json(devotion);
    } catch (error) {
        console.error('Error fetching daily devotion:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
