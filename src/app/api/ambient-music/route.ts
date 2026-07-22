import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { CacheService, CacheKeys, CACHE_TTL } from '@/services/cacheService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const cacheKey = CacheKeys.ambientMusic();
        const mappedTracks = await CacheService.getOrSet(cacheKey, async () => {
            const cookieStore = await cookies();
            const supabase = createClient(cookieStore);

            // Fetch music records from DB sorted by creation date
            const { data: tracks, error } = await supabase
                .from('ambient_music')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Database query error fetching ambient music:', error);
                throw error;
            }

            // Map database records to include public URLs from storage
            return (tracks || []).map(track => {
                const { data: { publicUrl } } = supabase.storage
                    .from('ambient-music')
                    .getPublicUrl(track.file_path);

                let publicThumbUrl = null;
                if (track.thumbnail_path) {
                    const { data: { publicUrl: thumbUrl } } = supabase.storage
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
                    thumbnail_url: publicThumbUrl
                };
            });
        }, CACHE_TTL.AMBIENT_MUSIC);

        return NextResponse.json({ success: true, data: mappedTracks });
    } catch (error: any) {
        console.error('Failed to get ambient music:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch ambient music' }, { status: 500 });
    }
}
