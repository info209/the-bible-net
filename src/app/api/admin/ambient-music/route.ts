import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/user';
import { getAuthContext, sanitizeFilename } from '@/utils/uploadHelpers';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/ambient-music
 * List all ambient music tracks with their metadata and public URLs.
 */
export async function GET(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: tracks, error } = await authContext.supabase
            .from('ambient_music')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        const mappedTracks = (tracks || []).map(track => {
            const { data: { publicUrl } } = authContext.supabase.storage
                .from('ambient-music')
                .getPublicUrl(track.file_path);

            return {
                id: track.id,
                label: track.label,
                file_path: track.file_path,
                url: publicUrl,
                created_at: track.created_at
            };
        });

        return NextResponse.json({ success: true, data: mappedTracks });
    } catch (error: any) {
        console.error('Admin GET ambient music error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to list tracks' }, { status: 500 });
    }
}

/**
 * POST /api/admin/ambient-music
 * Upload a new ambient music track.
 */
export async function POST(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const label = formData.get('label') as string | null;

        // 1. Validate mandatory fields
        if (!label || label.trim() === '') {
            return NextResponse.json({ success: false, error: 'Label is mandatory' }, { status: 400 });
        }
        if (!file) {
            return NextResponse.json({ success: false, error: 'Music file is mandatory' }, { status: 400 });
        }

        // 2. Validate file type and extension
        const ext = path.extname(file.name).toLowerCase();
        if (!AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.includes(ext) && !AMBIENT_MUSIC_CONFIG.SUPPORTED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({
                success: false,
                error: `Unsupported file type. Only ${AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.join(', ')} formats are allowed.`
            }, { status: 400 });
        }

        // 3. Validate file size
        if (file.size > AMBIENT_MUSIC_CONFIG.MAX_FILE_SIZE) {
            return NextResponse.json({
                success: false,
                error: `File size exceeds the limit of ${AMBIENT_MUSIC_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`
            }, { status: 400 });
        }

        // 4. Validate duplicate label
        const { data: duplicateTrack, error: duplicateCheckError } = await authContext.supabase
            .from('ambient_music')
            .select('id')
            .eq('label', label.trim())
            .maybeSingle();

        if (duplicateCheckError) {
            throw duplicateCheckError;
        }

        if (duplicateTrack) {
            return NextResponse.json({
                success: false,
                error: 'Duplicate labels are not allowed. Please choose a different label.'
            }, { status: 400 });
        }

        // 5. Check maximum track count limit
        const { count, error: countError } = await authContext.supabase
            .from('ambient_music')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            throw countError;
        }

        if (count !== null && count >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) {
            return NextResponse.json({
                success: false,
                error: `Maximum upload limit of ${AMBIENT_MUSIC_CONFIG.MAX_TRACKS} tracks reached. Delete an existing track to upload a new one.`
            }, { status: 400 });
        }

        // 6. Generate path and upload to Storage
        const cleanBase = sanitizeFilename(path.basename(file.name, ext));
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filePath = `ambient-music/${timestamp}-${randomId}-${cleanBase}${ext}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        const { error: uploadError } = await authContext.supabase.storage
            .from('ambient-music')
            .upload(filePath, buffer, {
                contentType: file.type || 'audio/mpeg',
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // 7. Insert metadata in Database
        const { data: insertedRecord, error: insertError } = await authContext.supabase
            .from('ambient_music')
            .insert({
                label: label.trim(),
                file_path: filePath,
                created_by: authContext.userId
            })
            .select()
            .single();

        if (insertError) {
            // Rollback Storage Upload if database entry fails
            await authContext.supabase.storage
                .from('ambient-music')
                .remove([filePath]);
            throw insertError;
        }

        const { data: { publicUrl } } = authContext.supabase.storage
            .from('ambient-music')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            data: {
                id: insertedRecord.id,
                label: insertedRecord.label,
                file_path: insertedRecord.file_path,
                url: publicUrl,
                created_at: insertedRecord.created_at
            }
        });
    } catch (error: any) {
        console.error('POST ambient music upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/ambient-music
 * Delete an ambient music track by id.
 */
export async function DELETE(req: NextRequest) {
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Track ID is required' }, { status: 400 });
        }

        // Fetch track metadata to retrieve the file_path
        const { data: track, error: findError } = await authContext.supabase
            .from('ambient_music')
            .select('file_path')
            .eq('id', id)
            .maybeSingle();

        if (findError) {
            throw findError;
        }

        if (!track) {
            return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 });
        }

        // 1. Delete from Supabase Storage
        const { error: storageDeleteError } = await authContext.supabase.storage
            .from('ambient-music')
            .remove([track.file_path]);

        if (storageDeleteError) {
            console.error('Storage deletion failed or warning generated:', storageDeleteError);
            // We proceed with DB delete even if file removal triggers a warning (e.g. file already gone)
        }

        // 2. Delete from Database
        const { error: dbDeleteError } = await authContext.supabase
            .from('ambient_music')
            .delete()
            .eq('id', id);

        if (dbDeleteError) {
            throw dbDeleteError;
        }

        return NextResponse.json({ success: true, message: 'Track deleted successfully' });
    } catch (error: any) {
        console.error('DELETE ambient music error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete track' }, { status: 500 });
    }
}
