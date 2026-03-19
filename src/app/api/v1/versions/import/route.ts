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
        const { metadata, verses, action, versionId, bookNum, progress } = body;

        // Support chunked/step-by-step import
        if (action === 'init') {
            if (!metadata || !metadata.shortname) {
                return NextResponse.json({ success: false, error: 'Metadata with shortname is required for init' }, { status: 400 });
            }
            const newVersionId = await BibleService.initImport(metadata);
            return NextResponse.json({ success: true, versionId: newVersionId }, { status: 200 });
        }

        if (action === 'book') {
            if (!versionId || bookNum === undefined || !verses) {
                return NextResponse.json({ success: false, error: 'versionId, bookNum and verses are required' }, { status: 400 });
            }
            await BibleService.importBookVerses(versionId, bookNum, verses, progress);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        if (action === 'finalize') {
            if (!versionId) {
                return NextResponse.json({ success: false, error: 'versionId is required' }, { status: 400 });
            }
            await BibleService.finalizeImport(versionId, progress || 100);
            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Legacy full-upload support (kept for compatibility, though it might still hit payload limits)
        if (!metadata || !metadata.shortname || !verses || !Array.isArray(verses)) {
            return NextResponse.json({ success: false, error: 'Invalid Bible JSON format. Must include metadata and verses array.' }, { status: 400 });
        }

        const newVersionId = await BibleService.importVersion(body);

        return NextResponse.json({
            success: true,
            message: 'Import started in background.',
            versionId: newVersionId
        }, { status: 202 });
    } catch (error: any) {
        console.error('Import Bible error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
