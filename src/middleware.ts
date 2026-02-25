import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

const locales = ['en', 'es', 'hi'];
const publicPages = ['/auth/signin', '/auth/register', '/api/seed', '/api/docs', '/api/health'];

const intlMiddleware = createMiddleware({
    locales,
    defaultLocale: 'en',
    localePrefix: 'never'
});

export default auth((req) => {
    const { nextUrl } = req;
    const isAuthenticated = !!req.auth;

    // 1. Determine Locale
    // If user is logged in, their preference > Cookie > Header
    let locale = 'en';
    if (isAuthenticated && (req.auth?.user as any)?.language) {
        locale = (req.auth?.user as any).language;
    }
    // Note: next-intl middleware handles cookie/header detection automatically if we don't force it.
    // But to enforce User Preference from DB (via Session), we might need to set the cookie if it differs.

    // 2. Protect Routes
    const isPublicPage = publicPages.some(page => nextUrl.pathname.startsWith(page)) || nextUrl.pathname === '/';
    const isAuthRoute = nextUrl.pathname.startsWith('/api/auth');

    if (!isPublicPage && !isAuthRoute && !isAuthenticated) {
        const signInUrl = new URL('/auth/signin', req.url);
        signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
        return NextResponse.redirect(signInUrl);
    }

    // 3. Chain next-intl middleware
    // We pass the request to next-intl to handle locale setup
    return intlMiddleware(req);
});

export const config = {
    // Skip all paths that should not be internationalized
    matcher: ['/((?!api|_next|.*\\..*).*)', '/api/user/:path*']
};
