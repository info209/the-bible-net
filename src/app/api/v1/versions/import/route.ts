import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';

/**
 * @swagger
 * /api/v1/versions/import:
 *   post:
 *     summary: Import a Bible version from JSON (Admin only)
 *     tags: [Bible Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [metadata, verses]
 *             properties:
 *               metadata: { type: object }
 *               verses: { type: array, items: { type: object } }
 *     responses:
 *       202:
 *         description: Import started
 *       400:
 *         description: Invalid format
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { metadata, verses } = body;

        if (!metadata || !metadata.shortname || !verses || !Array.isArray(verses)) {
            return NextResponse.json({ success: false, error: 'Invalid Bible JSON format. Must include metadata and verses array.' }, { status: 400 });
        }

        const versionId = await BibleService.importVersion(body);

        return NextResponse.json({
            success: true,
            message: 'Import started in background.',
            versionId
        }, { status: 202 });
    } catch (error: any) {
        console.error('Import Bible error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
