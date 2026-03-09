import { NextAuthConfig } from 'next-auth';
import { UserRole } from '@/types/user';

export const adminAuthConfig: NextAuthConfig = {
    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60, // 8 hours
    },
    basePath: '/api/auth/admin',
    cookies: {
        sessionToken: {
            name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}admin_session_token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production',
            },
        },
    },
    providers: [], // Middleware doesn't need providers for session checks
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role as UserRole;
                token.sessionType = 'ADMIN';
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.sessionType = 'ADMIN';
            }
            return session;
        },
    },
};
