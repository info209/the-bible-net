import { NextAuthConfig } from 'next-auth';
import { UserRole } from '@/types/user';

export const userAuthConfig: NextAuthConfig = {
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    basePath: '/api/auth/user',
    cookies: {
        sessionToken: {
            name: 'user_session',
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
    providers: [], // Middleware check
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role as UserRole;
                token.onboardingCompleted = user.onboardingCompleted as boolean || false;
                token.emailVerified = user.emailVerified as any || false;
                token.sessionType = 'USER';
            }
            if (trigger === 'update' && session?.user) {
                token.onboardingCompleted = session.user.onboardingCompleted;
                token.role = session.user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.onboardingCompleted = token.onboardingCompleted as boolean;
                session.user.emailVerified = token.emailVerified as any;
                session.user.sessionType = 'USER';
            }
            return session;
        },
    },
};
