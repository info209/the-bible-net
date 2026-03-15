import { NextResponse } from 'next/server';
import { DailyContentService } from '@/services/dailyContentService';

import { connectDB } from '@/lib/db';

/**
 * @swagger
 * /api/daily/verse:
 *   get:
 *     summary: Get the daily Bible verse
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
        await connectDB();
        const verse = await DailyContentService.getDailyContent('verse');
        if (!verse) {
            return NextResponse.json({ error: 'Daily verse not found' }, { status: 404 });
        }
        return NextResponse.json(verse);
    } catch (error) {
        console.error('Error fetching daily verse:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
