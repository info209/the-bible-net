import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import { UserService } from '@/services/userService';
import { UserRole } from '@/types/user';
import { userAuthConfig } from './user.config';

export const { 
    handlers: userHandlers, 
    auth: userAuth, 
    signIn: userSignIn, 
    signOut: userSignOut 
} = NextAuth({
    ...userAuthConfig,
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
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const user = await UserService.verifyCredentials(
                        credentials.email as string,
                        credentials.password as string
                    );

                    if (!user) return null;

                    // STRICT ROLE CHECK: Regular Users ONLY
                    const userRole = typeof user.role === 'string' ? user.role : String(user.role);
                    if (userRole !== 'USER' && userRole !== UserRole.USER) {
                        throw new Error(`Access denied. User account required. Found role: ${userRole}`);
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        role: user.role as UserRole,
                        onboardingCompleted: user.onboardingCompleted as boolean,
                        emailVerified: user.emailVerified as any,
                        sessionType: 'USER',
                        firstName: user.firstName,
                        lastName: user.lastName,
                        image: user.image,
                    };
                } catch (error: any) {
                    throw new Error(error.message || 'Invalid credentials');
                }
            },
        }),
    ],
    callbacks: {
        ...userAuthConfig.callbacks,
        async signIn({ user, account, profile }) {
            // Check if it's an OAuth login
            const isOAuth = ['google', 'facebook', 'twitter'].includes(account?.provider || '');
            
            if (isOAuth) {
                try {
                    const dbUser = await UserService.findOrCreateOAuthUser({
                        email: user.email!,
                        firstName: profile?.given_name || (user.name as string).split(' ')[0] || 'Unknown',
                        lastName: profile?.family_name || (user.name as string).split(' ')[1] || 'Unknown',
                        image: user.image || undefined,
                        provider: account!.provider,
                        providerAccountId: account!.providerAccountId,
                    });

                    // SECURITY REQUIREMENT: NO SOCIAL LOGIN FOR ADMIN THROUGH USER PORTAL
                    const oauthUserRole = typeof dbUser.role === 'string' ? dbUser.role : String(dbUser.role);
                    if (oauthUserRole !== 'USER' && oauthUserRole !== UserRole.USER) {
                        return '/auth/login?error=Admins must use admin portal login';
                    }

                    user.id = dbUser._id.toString();
                    user.role = dbUser.role as UserRole;
                    user.onboardingCompleted = dbUser.onboardingCompleted as boolean;
                    user.emailVerified = dbUser.emailVerified as any;
                    user.sessionType = 'USER';

                    return true;
                } catch (error) {
                    console.error('User OAuth error:', error);
                    return false;
                }
            }
            return true;
        },
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/login',
    },
});
