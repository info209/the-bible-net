import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getUserSession, getAdminSession } from '@/lib/auth-helpers';
import path from 'path';

export interface AuthContext {
    userId: string | null;
    role: string | null;
    supabase: ReturnType<typeof createClient>;
    user: any;
}

/**
 * Resolves the authentication context for the current request.
 * Attempts to retrieve a Supabase Auth session first, and falls back to 
 * NextAuth user and admin sessions sequentially if no Supabase user is found.
 */
export async function getAuthContext(): Promise<AuthContext> {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    
    try {
        // Check Supabase Auth first
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const role = user.user_metadata?.role || 'USER';
            return {
                userId: user.id,
                role: role,
                supabase,
                user
            };
        }
    } catch (e) {
        console.error('Supabase auth check error:', e);
    }
    
    try {
        // Check NextAuth user session
        const userSession = await getUserSession();
        if (userSession?.user) {
            return {
                userId: userSession.user.id || null,
                role: userSession.user.role || 'USER',
                supabase,
                user: null
            };
        }
    } catch (e) {
        console.error('User NextAuth check error:', e);
    }

    try {
        // Check NextAuth admin session
        const adminSession = await getAdminSession();
        if (adminSession?.user) {
            return {
                userId: adminSession.user.id || null,
                role: adminSession.user.role || 'SUPER_ADMIN',
                supabase,
                user: null
            };
        }
    } catch (e) {
        console.error('Admin NextAuth check error:', e);
    }

    return {
        userId: null,
        role: null,
        supabase,
        user: null
    };
}

/**
 * Sanitizes a filename by replacing spaces with underscores, removing special characters,
 * and collapsing multiple underscores.
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/\s+/g, '_')           // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9._-]/g, '') // Remove all non-alphanumeric, dot, dash, underscore characters
        .replace(/_+/g, '_');           // Collapse multiple underscores
}

/**
 * Generates a unique file path for a user in the bucket.
 * Format: users/{userId}/{timestamp}-{randomId}-{filename}
 */
export function generateUniqueFilePath(userId: string, originalName: string): string {
    const ext = path.extname(originalName).toLowerCase();
    const baseName = path.basename(originalName, ext);
    const sanitizedBase = sanitizeFilename(baseName);
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    return `users/${userId}/${timestamp}-${randomId}-${sanitizedBase}${ext}`;
}

/**
 * Extracts the user ID from a file path matching format: users/{userId}/{filename}
 */
export function getUserIdFromPath(filePath: string): string | null {
    const parts = filePath.split('/');
    if (parts.length >= 2 && parts[0] === 'users') {
        return parts[1];
    }
    return null;
}
