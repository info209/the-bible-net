import { NextRequest, NextResponse } from 'next/server';
import { ContentService } from '@/services/contentService';
import { ContentType } from '@/models/Content';

/**
 * @swagger
 * /api/v1/content:
 *   post:
 *     summary: Create a new verse or devotion
 *     tags: [Content]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, text]
 *             properties:
 *               type: { type: string, enum: [verse, devotion] }
 *               title: { type: string, description: "Required for devotion" }
 *               reference: { type: string, description: "Required for verse" }
 *               text: { type: string }
 *               createdBy: { type: string, description: "Admin identifier" }
 *     responses:
 *       201:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Content' }
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, title, reference, text, createdBy } = body;

        // Basic validation
        if (!type || !['verse', 'devotion'].includes(type)) {
            return NextResponse.json({ success: false, error: 'Valid type (verse|devotion) is required.' }, { status: 400 });
        }
        if (type === 'devotion' && !title) {
            return NextResponse.json({ success: false, error: 'Title is required for devotion.' }, { status: 400 });
        }
        if (type === 'verse' && !reference) {
            return NextResponse.json({ success: false, error: 'Reference is required for verse.' }, { status: 400 });
        }
        if (!text) {
            return NextResponse.json({ success: false, error: 'Text content is required.' }, { status: 400 });
        }

        const content = await ContentService.createContent({
            type,
            title: type === 'devotion' ? title : undefined,
            reference: type === 'verse' ? reference : undefined,
            text,
            createdBy: createdBy || 'system',
        });

        return NextResponse.json({ success: true, data: content }, { status: 201 });
    } catch (error: any) {
        console.error('Create content error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * @swagger
 * /api/v1/content:
 *   get:
 *     summary: Get all verses or devotions
 *     tags: [Content]
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
 *                 data: { type: array, items: { $ref: '#/components/schemas/Content' } }
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') as ContentType;

        if (!type || !['verse', 'devotion'].includes(type)) {
            return NextResponse.json({ success: false, error: 'Query parameter type (verse|devotion) is required.' }, { status: 400 });
        }

        const data = await ContentService.listContent(type);
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Fetch content error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
