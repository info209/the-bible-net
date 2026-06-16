import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/user';
import { getAuthContext } from '@/utils/uploadHelpers';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';

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
 * Register a new ambient music track by storing metadata in DB.
 */
export async function POST(req: NextRequest) {
    let filePathToDeleteOnError: string | null = null;
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { label, file_path } = body;
        filePathToDeleteOnError = file_path;

        // 1. Validate mandatory fields
        if (!label || label.trim() === '') {
            return NextResponse.json({ success: false, error: 'Label is mandatory' }, { status: 400 });
        }
        if (!file_path || file_path.trim() === '') {
            return NextResponse.json({ success: false, error: 'File path is mandatory' }, { status: 400 });
        }

        // 2. Validate duplicate label
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

        // 3. Check maximum track count limit
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

        // 4. Resolve Supabase user ID if logged in (UUID vs MongoDB ObjectId check)
        let createdByUuid: string | null = null;
        try {
            const { data: { user } } = await authContext.supabase.auth.getUser();
            if (user) {
                createdByUuid = user.id;
            }
        } catch (e) {
            console.error('Failed to get Supabase user UUID:', e);
        }

        // 5. Insert metadata in Database
        const { data: insertedRecord, error: insertError } = await authContext.supabase
            .from('ambient_music')
            .insert({
                label: label.trim(),
                file_path: file_path,
                created_by: createdByUuid // Uses UUID from Supabase or null (avoiding MongoDB ID UUID validation error)
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        const { data: { publicUrl } } = authContext.supabase.storage
            .from('ambient-music')
            .getPublicUrl(file_path);

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
        console.error('POST ambient music metadata error:', error);
        
        // Clean up the uploaded storage file if database operation failed
        if (filePathToDeleteOnError) {
            try {
                const authContext = await getAuthContext();
                await authContext.supabase.storage
                    .from('ambient-music')
                    .remove([filePathToDeleteOnError]);
            } catch (cleanupErr) {
                console.error('Failed to clean up orphaned storage file after error:', cleanupErr);
            }
        }
        
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
