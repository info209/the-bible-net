import NextAuth, { CredentialsSignin } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import TwitterProvider from 'next-auth/providers/twitter';
import { UserService } from '@/services/userService';
import { UserRole } from '@/types/user';
import { userAuthConfig } from './user.config';

class UserAuthError extends CredentialsSignin {
    constructor(message: string) {
        super(message);
        this.code = message;
    }
}

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

                    if (!user) {
                        throw new UserAuthError('Incorrect email or password. Please try again.');
                    }

                    // STRICT ROLE CHECK: Regular Users ONLY
                    const userRole = typeof user.role === 'string' ? user.role : String(user.role);
                    if (userRole !== 'USER' && userRole !== UserRole.USER) {
                        throw new UserAuthError(`Access denied. User account required. Found role: ${userRole}`);
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
                    if (error instanceof UserAuthError) {
                        throw error;
                    }
                    throw new UserAuthError(error.message || 'Incorrect email or password. Please try again.');
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
                    const rawName = (user.name as string) || '';
                    const nameParts = rawName.trim().split(' ');
                    const givenName = (profile as any)?.given_name || nameParts[0] || 'Unknown';
                    const familyName = (profile as any)?.family_name || nameParts.slice(1).join(' ') || 'Unknown';
                    const avatarUrl = user.image || (profile as any)?.picture || undefined;

                    const dbUser = await UserService.findOrCreateOAuthUser({
                        email: user.email!,
                        firstName: givenName,
                        lastName: familyName,
                        image: avatarUrl,
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
                    (user as any).firstName = dbUser.firstName;
                    (user as any).lastName = dbUser.lastName;
                    (user as any).country = dbUser.country;
                    (user as any).preferredLanguage = dbUser.preferredLanguage;
                    (user as any).preferredBibleVersion = dbUser.preferredBibleVersion;
                    user.image = dbUser.image || avatarUrl;

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
