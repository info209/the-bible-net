import { NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/bible/random:
 *   get:
 *     summary: Get a random Bible verse
 *     description: Returns a random verse from any version, book, and chapter
 *     tags:
 *       - Bible
 *     responses:
 *       200:
 *         description: A random Bible verse
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     text:
 *                       type: string
 *                     number:
 *                       type: integer
 *                     version:
 *                       type: object
 *                     book:
 *                       type: object
 *                     chapter:
 *                       type: object
 *       500:
 *         description: Server error
 */
export async function GET() {
    try {
        await connectDB();
        const verse = await BibleService.getRandomVerse();

        return NextResponse.json({
            success: true,
            data: verse
        });
    } catch (error: any) {
        console.error('Random verse API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to fetch random verse' },
            { status: 500 }
        );
    }
}
