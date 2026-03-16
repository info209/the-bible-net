import { NextAuthConfig } from 'next-auth';
import { UserRole } from '@/types/user';

export const adminAuthConfig: NextAuthConfig = {
    secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60, // 8 hours
    },
    basePath: '/api/auth/admin',
    cookies: {
        sessionToken: {
            name: 'admin_session',
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
                token.firstName = (user as any).firstName;
                token.lastName = (user as any).lastName;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.sessionType = 'ADMIN';
                (session.user as any).firstName = token.firstName as string;
                (session.user as any).lastName = token.lastName as string;
                session.user.name = token.firstName && token.lastName 
                    ? `${token.firstName} ${token.lastName}` 
                    : (token.firstName as string || session.user.name);
            }
            return session;
        },
    },
};
