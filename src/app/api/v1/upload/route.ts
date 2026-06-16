import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, generateUniqueFilePath, getUserIdFromPath } from '@/utils/uploadHelpers';
import { UserRole } from '@/types/user';

/**
 * @swagger
 * /api/v1/upload:
 *   post:
 *     summary: Upload a file
 *     description: Upload a file to Supabase Storage (max 10MB)
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
 *               isPrivate:
 *                 type: boolean
 *                 description: Set to true for private bucket upload (default false)
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
 *                 filePath:
 *                   type: string
 *                 url:
 *                   type: string
 *                 isPrivate:
 *                   type: boolean
 *       400:
 *         description: Bad request (no file or file too large)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Upload failed
 */
export async function POST(request: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        
        // Support isPrivate form-data field or query parameter
        const isPrivateForm = formData.get('isPrivate') === 'true' || formData.get('isPrivate') === '1' || formData.get('private') === 'true';
        const isPrivateQuery = request.nextUrl.searchParams.get('isPrivate') === 'true' || request.nextUrl.searchParams.get('private') === 'true';
        const isPrivate = isPrivateForm || isPrivateQuery;

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

        // Generate target path
        const filePath = generateUniqueFilePath(authContext.userId, file.name);
        const buffer = Buffer.from(await file.arrayBuffer());
        
        const bucket = isPrivate ? 'private-files' : 'public-files';

        // Upload to Supabase Storage
        const { error: uploadError } = await authContext.supabase.storage
            .from(bucket)
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        let url = '';
        if (isPrivate) {
            // Get 1 hour signed URL
            const { data: signedData, error: signedError } = await authContext.supabase.storage
                .from(bucket)
                .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour
            
            if (signedError) {
                throw signedError;
            }
            url = signedData.signedUrl;
        } else {
            // Get public URL
            const { data: publicData } = authContext.supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);
            url = publicData.publicUrl;
        }

        return NextResponse.json(
            {
                success: true,
                filePath,
                url,
                isPrivate,
                public_id: filePath // Legacy compatibility
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

/**
 * DELETE /api/v1/upload
 * Deletes an uploaded file from Supabase Storage.
 */
export async function DELETE(request: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let filePath = '';
        const searchParams = request.nextUrl.searchParams;
        filePath = searchParams.get('filePath') || '';
        const isPrivate = searchParams.get('isPrivate') === 'true' || searchParams.get('private') === 'true';

        if (!filePath) {
            try {
                const body = await request.json();
                filePath = body.filePath || '';
            } catch (e) {}
        }

        if (!filePath) {
            return NextResponse.json({ success: false, error: 'filePath is required' }, { status: 400 });
        }

        // Enforce ownership check: users can only delete their own files
        const fileOwnerId = getUserIdFromPath(filePath);
        if (!fileOwnerId) {
            return NextResponse.json({ success: false, error: 'Invalid file path structure' }, { status: 400 });
        }

        const isAdmin = authContext.role === UserRole.SUPER_ADMIN || authContext.role === UserRole.SUB_ADMIN;
        if (fileOwnerId !== authContext.userId && !isAdmin) {
            return NextResponse.json({ success: false, error: 'Forbidden: You can only delete your own files' }, { status: 403 });
        }

        const bucket = isPrivate ? 'private-files' : 'public-files';
        const { data, error } = await authContext.supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, message: 'File deleted successfully', data });
    } catch (error: any) {
        console.error('Delete error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Delete failed' }, { status: 500 });
    }
}

