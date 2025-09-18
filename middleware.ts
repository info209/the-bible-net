// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from './src/lib/firebaseAdmin';

/**
 * Configure here the list of path prefixes that should be protected.
 * Example: ['/account', '/notes', '/bookmarks', '/admin']
 */
const protectedPaths = ['/account', '/notes', '/bookmarks', '/dashboard', '/admin', '/profile'];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // If the request path starts with any protected prefix, enforce auth
    const shouldProtect = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));

    if (!shouldProtect) {
        return NextResponse.next();
    }

    const cookieName = process.env.FIREBASE_AUTH_COOKIE_NAME || '__session';
    const cookie = req.cookies.get(cookieName)?.value;

    if (!cookie) {
        // Redirect to login preserving the attempted URL in `redirectTo`
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }

    try {
        // Verify session cookie (throws if invalid/expired)
        await adminAuth.verifySessionCookie(cookie, true);
        return NextResponse.next();
    } catch (err) {
        // Invalid session — redirect to login
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
    }
}

// Update the matcher to include only the protected path prefixes (helps performance)
export const config = {
    matcher: ['/account/:path*', '/notes/:path*', '/bookmarks/:path*', '/dashboard/:path*', '/admin/:path*', '/profile/:path*'],
};
