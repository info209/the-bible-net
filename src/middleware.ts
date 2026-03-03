import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';
import { UserRole } from './types/user';

const { auth } = NextAuth(authConfig);

// Define route categories
const adminRoutes = ['/admin', '/api/v1/admin'];
const onboardingProtectedRoutes = ['/dashboard', '/share', '/comment']; // Hypothetical app routes
const authPageRoutes = ['/auth/login', '/auth/register', '/auth/verify'];
const publicRoutes = ['/api/v1/bible', '/api/v1/daily', '/api/v1/content', '/api/v1/docs'];

export default auth((req) => {
    const { nextUrl, auth: session } = req;
    const isLoggedIn = !!session;
    const isAuthPage = authPageRoutes.some((route) => nextUrl.pathname.startsWith(route));
    const isAdminRoute = adminRoutes.some((route) => nextUrl.pathname.startsWith(route));
    const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route)) || nextUrl.pathname === '/';

    // 1. Redirect if trying to access auth pages while logged in
    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }

    // 2. Protect Admin Routes (RBAC)
    if (isAdminRoute) {
        const isAdmin = session?.user?.role === UserRole.SUPER_ADMIN || session?.user?.role === UserRole.SUB_ADMIN;
        if (!isAdmin) {
            return NextResponse.redirect(new URL('/auth/login', nextUrl));
        }
    }

    // 3. User Onboarding Flow: Redirect if onboarding not complete
    if (isLoggedIn && !session.user.onboardingCompleted) {
        const isOnboardingPage = nextUrl.pathname === '/auth/onboarding';
        // Only allow access to the onboarding page itself if not complete
        if (!isOnboardingPage && !isPublicRoute && !isAuthPage && !isAdminRoute) {
            return NextResponse.redirect(new URL('/auth/onboarding', nextUrl));
        }
    }

    // 4. Protect other Private Routes if not logged in
    const isProtectedRoute = onboardingProtectedRoutes.some((route) => nextUrl.pathname.startsWith(route));
    if (isProtectedRoute && !isLoggedIn) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/v1/admin/:path*', '/api/v1/user/:path*'],
};
