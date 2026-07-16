import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/user';
import { getAuthContext, generateUniqueFilePath, getUserIdFromPath } from '@/utils/uploadHelpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/daily-content/image-upload
 * Uploads a background image to Supabase Storage and returns its public URL.
 */
export async function POST(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
            return NextResponse.json({
                success: false,
                error: 'Only JPG, PNG, WEBP, and SVG images are supported.'
            }, { status: 400 });
        }

        // Validate size (max 10MB)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'Image size exceeds 10MB limit.' }, { status: 400 });
        }

        // Generate unique and sanitized file path
        const filePath = generateUniqueFilePath(authContext.userId, file.name);
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to Supabase public-files bucket
        const { error: uploadError } = await authContext.supabase.storage
            .from('public-files')
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = authContext.supabase.storage
            .from('public-files')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            filePath,
            url: publicUrl,
            isPrivate: false,
            filename: filePath.split('/').pop() || file.name, // legacy filename compatibility
            size: file.size // legacy size compatibility
        });
    } catch (error: any) {
        console.error('Image upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}

/**
 * GET /api/admin/daily-content/image-upload
 * Returns list of uploaded background images for the current admin.
 */
export async function GET(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // List files in users/{userId} folder under public-files bucket
        const { data, error } = await authContext.supabase.storage
            .from('public-files')
            .list(`users/${authContext.userId}`, {
                limit: 50,
                sortBy: { column: 'created_at', order: 'desc' }
            });

        if (error) {
            throw error;
        }

        const files = (data || [])
            .filter(f => {
                const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
            })
            .map(f => {
                const filePath = `users/${authContext.userId}/${f.name}`;
                const { data: { publicUrl } } = authContext.supabase.storage
                    .from('public-files')
                    .getPublicUrl(filePath);

                return {
                    filename: f.name,
                    url: publicUrl,
                    size: f.metadata?.size || 0,
                    uploadedAt: f.created_at || new Date().toISOString()
                };
            });

        return NextResponse.json({ success: true, data: files });
    } catch (error: any) {
        console.error('Image list error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to list images' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/daily-content/image-upload
 * Deletes an uploaded background image from Supabase Storage.
 */
export async function DELETE(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let filePath = '';
        const searchParams = req.nextUrl.searchParams;
        filePath = searchParams.get('filePath') || '';
        const isPrivate = searchParams.get('isPrivate') === 'true' || searchParams.get('private') === 'true';

        if (!filePath) {
            try {
                const body = await req.json();
                filePath = body.filePath || '';
            } catch (e) {}
        }

        if (!filePath) {
            return NextResponse.json({ success: false, error: 'filePath is required' }, { status: 400 });
        }

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

