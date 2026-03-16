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
                token.firstName = (user as any).firstName;
                token.lastName = (user as any).lastName;
                token.country = (user as any).country;
                token.preferredLanguage = (user as any).preferredLanguage;
                token.preferredBibleVersion = (user as any).preferredBibleVersion;
            }
            if (trigger === 'update' && session?.user) {
                token.onboardingCompleted = session.user.onboardingCompleted ?? token.onboardingCompleted;
                token.role = session.user.role ?? token.role;
                token.firstName = session.user.firstName ?? token.firstName;
                token.lastName = session.user.lastName ?? token.lastName;
                token.country = session.user.country ?? token.country;
                token.preferredLanguage = session.user.preferredLanguage ?? token.preferredLanguage;
                token.preferredBibleVersion = session.user.preferredBibleVersion ?? token.preferredBibleVersion;
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
                (session.user as any).firstName = token.firstName as string;
                (session.user as any).lastName = token.lastName as string;
                (session.user as any).country = token.country as string;
                (session.user as any).preferredLanguage = token.preferredLanguage as string;
                (session.user as any).preferredBibleVersion = token.preferredBibleVersion as string;
                
                // For components using session.user.name
                session.user.name = token.firstName && token.lastName 
                    ? `${token.firstName} ${token.lastName}` 
                    : (token.firstName as string || session.user.name);
            }
            return session;
        },
    },
};
