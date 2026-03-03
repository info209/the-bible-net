import { NextRequest, NextResponse } from 'next/server';
import { ContentService } from '@/services/contentService';

/**
 * @swagger
 * /api/v1/content/{id}:
 *   put:
 *     summary: Update content by ID
 *     tags: [Content]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               reference: { type: string }
 *               text: { type: string }
 *               type: { type: string, enum: [verse, devotion] }
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
 *   delete:
 *     summary: Delete content by ID
 *     tags: [Content]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Success
 *       404:
 *         description: Not found
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const updated = await ContentService.updateContent(params.id, body);

        if (!updated) {
            return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Update content error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const success = await ContentService.deleteContent(params.id);
        if (!success) {
            return NextResponse.json({ success: false, error: 'Content not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Content deleted successfully.' });
    } catch (error: any) {
        console.error('Delete content error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
