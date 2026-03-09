import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { adminAuthConfig } from '@/lib/auth/admin.config';
import { userAuthConfig } from '@/lib/auth/user.config';
import { UserRole } from './types/user';

// Initialize light auth instances for Edge (Middleware)
const { auth: thinAdminAuth } = NextAuth(adminAuthConfig);
const { auth: thinUserAuth } = NextAuth(userAuthConfig);

// Route Categories
const adminProtectedRoutes = ['/admin', '/api/v1/admin'];
const userProtectedPageRoutes = ['/profile', '/library', '/auth/profile-setup'];
const authPageRoutes = [
    '/auth/login', '/auth/register', '/auth/verify-otp', 
    '/auth/forgot-password', '/auth/reset-password', 
    '/auth/check-email', '/auth/success'
];
const adminAuthPageRoutes = ['/admin/login', '/admin/forgot-password', '/admin/reset-password'];
const publicRoutes = ['/home', '/bible', '/library', '/explore', '/api/v1/bible', '/api/v1/daily', '/api/v1/content', '/api/v1/docs'];

export default async function middleware(req: NextRequest) {
    const { nextUrl } = req;
    const pathname = nextUrl.pathname;

    // 1. ADMIN FLOW ISOLATION
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin')) {
        // @ts-ignore - NextAuth types in v5 middleware can be tricky
        const session = await thinAdminAuth(req);
        const isLoggedIn = !!session;
        const isAdminAuthPage = adminAuthPageRoutes.some(route => pathname.startsWith(route));

        // Redirect from /admin pages if not logged in
        if (!isLoggedIn && !isAdminAuthPage) {
            return NextResponse.redirect(new URL('/admin/login', nextUrl));
        }

        // Redirect from /admin/login if already logged in as admin
        if (isLoggedIn && isAdminAuthPage) {
            return NextResponse.redirect(new URL('/admin/dashboard', nextUrl));
        }

        // Extra Role Check
        if (isLoggedIn && session?.user?.role === UserRole.USER) {
            return NextResponse.redirect(new URL('/auth/login?error=Admin access required', nextUrl));
        }

        return NextResponse.next();
    }

    // 2. USER FLOW ISOLATION
    // @ts-ignore
    const userSession = await thinUserAuth(req);
    const isUserLoggedIn = !!userSession;
    const isUserAuthPage = authPageRoutes.some(route => pathname.startsWith(route));
    const isUserProtectedRoute = userProtectedPageRoutes.some(route => pathname.startsWith(route));

    // Relaxed Check: If already logged in, we normally redirect to home.
    // However, some users see 307 redirect loops, so let's allow access for now
    // to ensure they can at least REACH the login/logout flow properly.
    /*
    if (isUserLoggedIn && isUserAuthPage) {
        return NextResponse.redirect(new URL('/home', nextUrl));
    }
    */

    // Protect user-only pages
    if (!isUserLoggedIn && isUserProtectedRoute) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    // Onboarding Check
    if (isUserLoggedIn && !userSession?.user?.onboardingCompleted && !pathname.startsWith('/auth/profile-setup')) {
        // Only enforce if not on a public route or if specifically a protected app area
        if (isUserProtectedRoute || (!isUserAuthPage && !publicRoutes.some(r => pathname === r))) {
             return NextResponse.redirect(new URL('/auth/profile-setup', nextUrl));
        }
    }

    // GUEST FLOW (implicit if no session exists above)
    // Guests can access public routes but not profile, library, etc.
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/v1/admin/:path*', '/api/admin/:path*', '/api/v1/user/:path*'],
};
