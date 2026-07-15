import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/user';
import { getAuthContext, sanitizeFilename } from '@/utils/uploadHelpers';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';
import { createAdminClient } from '@/utils/supabase/admin';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/ambient-music/upload-url
 * Generates a signed upload URL for client-side direct uploads to Supabase Storage.
 */
export async function POST(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { filename, contentType, fileType = 'music' } = body;

        if (!filename || !contentType) {
            return NextResponse.json({ success: false, error: 'filename and contentType are required' }, { status: 400 });
        }

        const isThumbnail = fileType === 'thumbnail';
        const ext = path.extname(filename).toLowerCase();

        if (isThumbnail) {
            // Validate image file type
            if (!AMBIENT_MUSIC_CONFIG.IMAGE_SUPPORTED_EXTENSIONS.includes(ext)) {
                return NextResponse.json({
                    success: false,
                    error: `Unsupported image format. Allowed types: ${AMBIENT_MUSIC_CONFIG.IMAGE_SUPPORTED_EXTENSIONS.join(', ')}`
                }, { status: 400 });
            }

            // Validate image content type
            if (!AMBIENT_MUSIC_CONFIG.IMAGE_SUPPORTED_MIME_TYPES.includes(contentType)) {
                return NextResponse.json({
                    success: false,
                    error: 'Unsupported image MIME type.'
                }, { status: 400 });
            }
        } else {
            // Validate audio file type
            if (!AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.includes(ext)) {
                return NextResponse.json({
                    success: false,
                    error: `Unsupported file format. Allowed types: ${AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.join(', ')}`
                }, { status: 400 });
            }

            // Validate audio content type
            if (!AMBIENT_MUSIC_CONFIG.SUPPORTED_MIME_TYPES.includes(contentType)) {
                return NextResponse.json({
                    success: false,
                    error: 'Unsupported audio MIME type.'
                }, { status: 400 });
            }
        }

        // Generate unique file path
        const baseName = path.basename(filename, ext);
        const sanitizedBase = sanitizeFilename(baseName);
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        
        // Save thumbnails in a subfolder within the ambient-music bucket
        const filePath = isThumbnail
            ? `ambient-music/thumbnails/${timestamp}-${randomId}-${sanitizedBase}${ext}`
            : `ambient-music/${timestamp}-${randomId}-${sanitizedBase}${ext}`;

        // Create signed upload URL in the 'ambient-music' bucket
        // We use the admin client from createAdminClient since RLS policies might not allow anon users to upload
        const db = createAdminClient() || authContext.supabase;
        const { data, error: storageError } = await db.storage
            .from('ambient-music')
            .createSignedUploadUrl(filePath, {
                upsert: false
            });

        if (storageError) {
            throw storageError;
        }

        return NextResponse.json({
            success: true,
            signedUrl: data.signedUrl,
            filePath: filePath,
            path: data.path,
            token: data.token
        });
    } catch (error: any) {
        console.error('Create signed upload URL error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create upload URL' }, { status: 500 });
    }
}

