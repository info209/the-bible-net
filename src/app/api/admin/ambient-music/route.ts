import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/user';
import { getAuthContext, sanitizeFilename } from '@/utils/uploadHelpers';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';
import { createAdminClient } from '@/utils/supabase/admin';
import path from 'path';
import { CacheService } from '@/services/cacheService';

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

        const db = createAdminClient() || authContext.supabase;
        const { data: tracks, error } = await db
            .from('ambient_music')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        const mappedTracks = (tracks || []).map(track => {
            const { data: { publicUrl } } = db.storage
                .from('ambient-music')
                .getPublicUrl(track.file_path);

            let publicThumbUrl = null;
            if (track.thumbnail_path) {
                const { data: { publicUrl: thumbUrl } } = db.storage
                    .from('ambient-music')
                    .getPublicUrl(track.thumbnail_path);
                publicThumbUrl = thumbUrl;
            }

            return {
                id: track.id,
                label: track.label,
                file_path: track.file_path,
                url: publicUrl,
                thumbnail_path: track.thumbnail_path,
                thumbnail_url: publicThumbUrl,
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
    let thumbPathToDeleteOnError: string | null = null;
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = createAdminClient();
        if (!adminDb) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY is missing from environment. Falling back to auth context client.');
        }
        const db = adminDb || authContext.supabase;

        const body = await req.json();
        const { label, file_path, thumbnail_path } = body;
        filePathToDeleteOnError = file_path;
        thumbPathToDeleteOnError = thumbnail_path;

        // 1. Validate mandatory fields
        if (!label || label.trim() === '') {
            return NextResponse.json({ success: false, error: 'Label is mandatory' }, { status: 400 });
        }
        if (!file_path || file_path.trim() === '') {
            return NextResponse.json({ success: false, error: 'File path is mandatory' }, { status: 400 });
        }
        if (!thumbnail_path || thumbnail_path.trim() === '') {
            return NextResponse.json({ success: false, error: 'Thumbnail is mandatory' }, { status: 400 });
        }

        // 2. Validate duplicate label
        const { data: duplicateTrack, error: duplicateCheckError } = await db
            .from('ambient_music')
            .select('id')
            .eq('label', label.trim())
            .maybeSingle();

        if (duplicateCheckError) {
            throw duplicateCheckError;
        }

        if (duplicateTrack) {
            if (file_path) {
                try {
                    await db.storage.from('ambient-music').remove([file_path]);
                } catch (cleanupErr) {
                    console.error('Failed to clean up file after duplicate label check:', cleanupErr);
                }
            }
            if (thumbnail_path) {
                try {
                    await db.storage.from('ambient-music').remove([thumbnail_path]);
                } catch (cleanupErr) {
                    console.error('Failed to clean up thumbnail after duplicate label check:', cleanupErr);
                }
            }
            return NextResponse.json({
                success: false,
                error: 'Duplicate labels are not allowed. Please choose a different label.'
            }, { status: 400 });
        }

        // 3. Check maximum track count limit
        const { count, error: countError } = await db
            .from('ambient_music')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            throw countError;
        }

        if (count !== null && count >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) {
            if (file_path) {
                try {
                    await db.storage.from('ambient-music').remove([file_path]);
                } catch (cleanupErr) {
                    console.error('Failed to clean up file after max tracks check:', cleanupErr);
                }
            }
            if (thumbnail_path) {
                try {
                    await db.storage.from('ambient-music').remove([thumbnail_path]);
                } catch (cleanupErr) {
                    console.error('Failed to clean up thumbnail after max tracks check:', cleanupErr);
                }
            }
            return NextResponse.json({
                success: false,
                error: `Maximum upload limit of ${AMBIENT_MUSIC_CONFIG.MAX_TRACKS} tracks reached. Delete an existing track to upload a new one.`
            }, { status: 400 });
        }

        // 4. Resolve Supabase user ID if logged in (UUID vs MongoDB ObjectID check)
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
        const { data: insertedRecord, error: insertError } = await db
            .from('ambient_music')
            .insert({
                label: label.trim(),
                file_path: file_path,
                thumbnail_path: thumbnail_path,
                created_by: createdByUuid // Uses UUID from Supabase or null (avoiding MongoDB ID UUID validation error)
            })
            .select()
            .single();

        if (insertError) {
            throw insertError;
        }

        const { data: { publicUrl } } = db.storage
            .from('ambient-music')
            .getPublicUrl(file_path);

        let publicThumbUrl = null;
        if (insertedRecord.thumbnail_path) {
            const { data: { publicUrl: thumbUrl } } = db.storage
                .from('ambient-music')
                .getPublicUrl(insertedRecord.thumbnail_path);
            publicThumbUrl = thumbUrl;
        }

        await CacheService.invalidatePattern('tbnet:ambient-music:*');

        return NextResponse.json({
            success: true,
            data: {
                id: insertedRecord.id,
                label: insertedRecord.label,
                file_path: insertedRecord.file_path,
                url: publicUrl,
                thumbnail_path: insertedRecord.thumbnail_path,
                thumbnail_url: publicThumbUrl,
                created_at: insertedRecord.created_at
            }
        });
    } catch (error: any) {
        console.error('POST ambient music metadata error:', error);
        
        // Clean up the uploaded storage files if database operation failed
        if (filePathToDeleteOnError) {
            try {
                const adminDb = createAdminClient();
                const db = adminDb || (await getAuthContext()).supabase;
                await db.storage
                    .from('ambient-music')
                    .remove([filePathToDeleteOnError]);
            } catch (cleanupErr) {
                console.error('Failed to clean up orphaned storage file after error:', cleanupErr);
            }
        }
        if (thumbPathToDeleteOnError) {
            try {
                const adminDb = createAdminClient();
                const db = adminDb || (await getAuthContext()).supabase;
                await db.storage
                    .from('ambient-music')
                    .remove([thumbPathToDeleteOnError]);
            } catch (cleanupErr) {
                console.error('Failed to clean up orphaned storage thumbnail after error:', cleanupErr);
            }
        }
        
        let errorMessage = error.message || 'Upload failed';
        if (error.code === 'PGRST116' || errorMessage.includes('PGRST116')) {
            errorMessage = 'Database insert failed: Row Level Security (RLS) policy blocked operation or SUPABASE_SERVICE_ROLE_KEY is missing.';
        }
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
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

        const adminDb = createAdminClient();
        if (!adminDb) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY is missing from environment. Falling back to auth context client.');
        }
        const db = adminDb || authContext.supabase;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Track ID is required' }, { status: 400 });
        }

        // Fetch track metadata to retrieve the file_path and thumbnail_path
        const { data: track, error: findError } = await db
            .from('ambient_music')
            .select('file_path, thumbnail_path')
            .eq('id', id)
            .maybeSingle();

        if (findError) {
            throw findError;
        }

        if (!track) {
            return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 });
        }

        // 1. Delete from Supabase Storage
        const filesToDelete = [track.file_path];
        if (track.thumbnail_path) {
            filesToDelete.push(track.thumbnail_path);
        }
        const { error: storageDeleteError } = await db.storage
            .from('ambient-music')
            .remove(filesToDelete);

        if (storageDeleteError) {
            console.error('Storage deletion failed or warning generated:', storageDeleteError);
            // We proceed with DB delete even if file removal triggers a warning (e.g. file already gone)
        }

        // 2. Delete from Database
        const { error: dbDeleteError } = await db
            .from('ambient_music')
            .delete()
            .eq('id', id);

        if (dbDeleteError) {
            throw dbDeleteError;
        }

        await CacheService.invalidatePattern('tbnet:ambient-music:*');

        return NextResponse.json({ success: true, message: 'Track deleted successfully' });
    } catch (error: any) {
        console.error('DELETE ambient music error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete track' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/ambient-music
 * Edit an existing ambient music track (label, file, and/or thumbnail).
 */
export async function PUT(req: NextRequest) {
    let newFilePathToDeleteOnError: string | null = null;
    let newThumbPathToDeleteOnError: string | null = null;
    try {
        const authContext = await getAuthContext();
        if (!authContext.userId || (authContext.role !== UserRole.SUPER_ADMIN && authContext.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const adminDb = createAdminClient();
        if (!adminDb) {
            console.warn('SUPABASE_SERVICE_ROLE_KEY is missing from environment. Falling back to auth context client.');
        }
        const db = adminDb || authContext.supabase;

        const body = await req.json();
        const { id, label, file_path, thumbnail_path } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'Track ID is required' }, { status: 400 });
        }

        // Fetch existing track
        const { data: track, error: findError } = await db
            .from('ambient_music')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (findError) {
            throw findError;
        }
        if (!track) {
            return NextResponse.json({ success: false, error: 'Track not found' }, { status: 404 });
        }

        const updatedFields: any = {};

        // 1. Validate and update label
        if (label !== undefined) {
            if (!label || label.trim() === '') {
                return NextResponse.json({ success: false, error: 'Label cannot be empty' }, { status: 400 });
            }
            const trimmedLabel = label.trim();
            if (trimmedLabel !== track.label) {
                // Check duplicate label (excluding current track)
                const { data: duplicateTrack, error: duplicateCheckError } = await db
                    .from('ambient_music')
                    .select('id')
                    .eq('label', trimmedLabel)
                    .neq('id', id)
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
                updatedFields.label = trimmedLabel;
            }
        }

        // 2. Validate and update file_path
        if (file_path !== undefined && file_path !== track.file_path) {
            if (!file_path || file_path.trim() === '') {
                return NextResponse.json({ success: false, error: 'File path cannot be empty' }, { status: 400 });
            }
            updatedFields.file_path = file_path;
            newFilePathToDeleteOnError = file_path;
        }

        // 3. Validate and update thumbnail_path
        const existingThumbnail = track.thumbnail_path;
        const incomingThumbnail = thumbnail_path;

        if (incomingThumbnail !== undefined) {
            if (!incomingThumbnail || incomingThumbnail.trim() === '') {
                return NextResponse.json({ success: false, error: 'Thumbnail is mandatory' }, { status: 400 });
            }
            if (incomingThumbnail !== existingThumbnail) {
                updatedFields.thumbnail_path = incomingThumbnail;
                newThumbPathToDeleteOnError = incomingThumbnail;
            }
        } else {
            // No new thumbnail provided. If there's no existing thumbnail, validation must fail!
            if (!existingThumbnail) {
                return NextResponse.json({ success: false, error: 'Thumbnail is mandatory' }, { status: 400 });
            }
        }

        // If no changes, return early
        if (Object.keys(updatedFields).length === 0) {
            // Return mapped record even if no changes, so frontend gets complete updated structure
            const { data: { publicUrl } } = db.storage
                .from('ambient-music')
                .getPublicUrl(track.file_path);

            let publicThumbUrl = null;
            if (track.thumbnail_path) {
                const { data: { publicUrl: thumbUrl } } = db.storage
                    .from('ambient-music')
                    .getPublicUrl(track.thumbnail_path);
                publicThumbUrl = thumbUrl;
            }
            return NextResponse.json({
                success: true,
                data: {
                    id: track.id,
                    label: track.label,
                    file_path: track.file_path,
                    url: publicUrl,
                    thumbnail_path: track.thumbnail_path,
                    thumbnail_url: publicThumbUrl,
                    created_at: track.created_at
                }
            });
        }

        // Update database
        const { data: updatedRecord, error: updateError } = await db
            .from('ambient_music')
            .update(updatedFields)
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            throw updateError;
        }

        // Deletions of old files/thumbnails from Supabase storage (only after successful DB update)
        if (updatedFields.file_path && track.file_path) {
            try {
                await db.storage
                    .from('ambient-music')
                    .remove([track.file_path]);
            } catch (cleanupErr) {
                console.error('Failed to remove old music file:', cleanupErr);
            }
        }

        if (updatedFields.thumbnail_path && track.thumbnail_path) {
            try {
                await db.storage
                    .from('ambient-music')
                    .remove([track.thumbnail_path]);
            } catch (cleanupErr) {
                console.error('Failed to remove old thumbnail file:', cleanupErr);
            }
        }

        // Return mapped record
        const { data: { publicUrl } } = db.storage
            .from('ambient-music')
            .getPublicUrl(updatedRecord.file_path);

        let publicThumbUrl = null;
        if (updatedRecord.thumbnail_path) {
            const { data: { publicUrl: thumbUrl } } = db.storage
                .from('ambient-music')
                .getPublicUrl(updatedRecord.thumbnail_path);
            publicThumbUrl = thumbUrl;
        }

        await CacheService.invalidatePattern('tbnet:ambient-music:*');

        return NextResponse.json({
            success: true,
            data: {
                id: updatedRecord.id,
                label: updatedRecord.label,
                file_path: updatedRecord.file_path,
                url: publicUrl,
                thumbnail_path: updatedRecord.thumbnail_path,
                thumbnail_url: publicThumbUrl,
                created_at: updatedRecord.created_at
            }
        });

    } catch (error: any) {
        console.error('PUT ambient music metadata error:', error);
        
        // Clean up newly uploaded files if the DB operation failed
        if (newFilePathToDeleteOnError) {
            try {
                const adminDb = createAdminClient();
                const db = adminDb || (await getAuthContext()).supabase;
                await db.storage
                    .from('ambient-music')
                    .remove([newFilePathToDeleteOnError]);
            } catch (cleanupErr) {
                console.error('Failed to clean up new file after error:', cleanupErr);
            }
        }

        if (newThumbPathToDeleteOnError) {
            try {
                const adminDb = createAdminClient();
                const db = adminDb || (await getAuthContext()).supabase;
                await db.storage
                    .from('ambient-music')
                    .remove([newThumbPathToDeleteOnError]);
            } catch (cleanupErr) {
                console.error('Failed to clean up new thumbnail after error:', cleanupErr);
            }
        }

        let errorMessage = error.message || 'Update failed';
        if (error.code === 'PGRST116' || errorMessage.includes('PGRST116')) {
            errorMessage = 'Database update failed: No matching record was found or Row Level Security (RLS) policy blocked the update.';
        }

        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}

