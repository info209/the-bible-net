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
    const isRegistrationFlow = pathname === '/auth/register';
    const stepParam = nextUrl.searchParams.get('step');

    if (isUserLoggedIn) {
        const onboardingCompleted = userToken?.onboardingCompleted === true;
        const onboardingStep = typeof userToken?.onboardingStep === 'number' ? userToken.onboardingStep : 2;
        const pendingStep = onboardingStep >= 3 ? 3 : 2;
        const pendingStepUrl = new URL(`/auth/register?step=${pendingStep}`, nextUrl);

        if (!onboardingCompleted) {
            // OAuth profile-setup flow is preserved
            if (pathname.startsWith('/auth/profile-setup')) {
                return NextResponse.next();
            }

            // OTP verified user must never be asked for OTP again
            if (pathname.startsWith('/auth/verify-otp')) {
                return NextResponse.redirect(pendingStepUrl);
            }

            // Incomplete onboarding user on registration page
            if (isRegistrationFlow) {
                // If on their current pending step, allow
                if (stepParam === String(pendingStep)) {
                    return NextResponse.next();
                }
                // Otherwise redirect to their current pending step
                return NextResponse.redirect(pendingStepUrl);
            }

            // If user attempts to go to login or any other page before completing onboarding,
            // redirect back to their pending step
            return NextResponse.redirect(pendingStepUrl);
        }

        // Onboarding IS completed:
        // Redirect away from auth pages (/auth/login, /auth/register, etc.) and /auth/profile-setup to /home
        if (isUserAuthPage || pathname.startsWith('/auth/profile-setup')) {
            return NextResponse.redirect(new URL('/home', nextUrl));
        }

        return NextResponse.next();
    }

    // Unauthenticated user:
    // Protect user-only pages
    if (isUserProtectedRoute) {
        return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }

    // Prevent unauthenticated users from skipping directly to Step 2 or Step 3
    if (isRegistrationFlow && (stepParam === '2' || stepParam === '3')) {
        return NextResponse.redirect(new URL('/auth/register', nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)', '/api/v1/admin/:path*', '/api/admin/:path*', '/api/v1/user/:path*'],
};
