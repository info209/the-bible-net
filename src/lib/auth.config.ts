import { NextAuthConfig } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import { UserRole } from '@/types/user';

export const authConfig: NextAuthConfig = {
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID || '',
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
        }),
        TwitterProvider({
            clientId: process.env.TWITTER_CLIENT_ID || '',
            clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
        })
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id as string;
                token.role = user.role || UserRole.USER;
                token.onboardingCompleted = (user as any).onboardingCompleted ?? false;
                token.emailVerified = !!(user as any).emailVerified;
                token.firstName = (user as any).firstName;
                token.lastName = (user as any).lastName;
                token.image = user.image;
            }
            if (trigger === 'update' && session?.user) {
                token.onboardingCompleted = session.user.onboardingCompleted;
                token.role = session.user.role;
                token.firstName = session.user.firstName;
                token.lastName = session.user.lastName;
                token.image = session.user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as UserRole;
                session.user.onboardingCompleted = token.onboardingCompleted as boolean;
                session.user.emailVerified = token.emailVerified as any;
                (session.user as any).firstName = token.firstName;
                (session.user as any).lastName = token.lastName;
                session.user.image = token.image as string;
                // For components using session.user.name
                session.user.name = token.firstName && token.lastName 
                    ? `${token.firstName} ${token.lastName}`.trim() 
                    : (token.firstName as string || session.user.name);
            }
            return session;
        },
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/error',
    },
};
