import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from './types/user';

const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

// Route Categories
const adminProtectedRoutes = ['/admin', '/api/v1/admin'];
const userProtectedPageRoutes = ['/profile', '/auth/profile-setup', '/saved', '/notes', '/highlights'];
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

    // 0. ROOT REDIRECT
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/home', nextUrl));
    }

    // 1. ADMIN FLOW ISOLATION
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/v1/admin')) {
        const token = await getToken({ req, secret, cookieName: 'admin_session' }) || 
                      await getToken({ req, secret, cookieName: '__Secure-admin_session' });
        
        const isLoggedIn = !!token;
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
        const role = typeof token?.role === 'string' ? token.role : String(token?.role);
        if (isLoggedIn && (role === 'USER' || role === UserRole.USER)) {
            return NextResponse.redirect(new URL('/auth/login?error=Admin access required', nextUrl));
        }

        return NextResponse.next();
    }

    // 2. USER FLOW ISOLATION
    const userToken = await getToken({ req, secret, cookieName: 'user_session' }) ||
                      await getToken({ req, secret, cookieName: '__Secure-user_session' });
    const isUserLoggedIn = !!userToken;
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

    // Onboarding Check (Removed forced redirect to allow voluntary profile setup)
    // Users can now navigate freely without being forced to complete their profile.

    // GUEST FLOW (implicit if no session exists above)
    // Guests can access public routes but not profile, library, etc.
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/v1/admin/:path*', '/api/admin/:path*', '/api/v1/user/:path*'],
};
