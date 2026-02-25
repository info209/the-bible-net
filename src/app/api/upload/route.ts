import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary } from '@/lib/cloudinary';

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     description: Upload a file to Cloudinary (max 10MB)
 *     tags:
 *       - Upload
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Optional folder name
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                 public_id:
 *                   type: string
 *       400:
 *         description: Bad request (no file or file too large)
 *       500:
 *         description: Upload failed
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'uploads';

        // Validation
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Check file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine resource type based on MIME type
        let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
        if (file.type.startsWith('image/')) {
            resourceType = 'image';
        } else if (file.type.startsWith('video/')) {
            resourceType = 'video';
        }

        // Upload to Cloudinary
        const result = await uploadToCloudinary(buffer, folder, resourceType);

        return NextResponse.json(
            {
                success: true,
                url: result.url,
                public_id: result.public_id,
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: 'Upload failed', message: error.message },
            { status: 500 }
        );
    }
}
