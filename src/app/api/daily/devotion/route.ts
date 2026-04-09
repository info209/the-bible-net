import { NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';

import { connectDB } from '@/lib/db';

/**
 * @swagger
 * /api/daily/devotion:
 *   get:
 *     summary: Get the daily devotion
 *     description: Retrieve the curated daily devotion content, including text and audio.
 *     tags: [Daily Content]
 *     responses:
 *       200:
 *         description: Successfully retrieved daily devotion
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       404:
 *         description: Daily devotion not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET() {
    try {
        await connectDB();
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
