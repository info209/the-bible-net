import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { UserService } from '@/services/userService';
import { UserRole } from '@/types/user';

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers,
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

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        role: user.role as UserRole,
                        onboardingCompleted: user.onboardingCompleted as boolean,
                        emailVerified: user.emailVerified as any,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        image: user.image,
                    };
                } catch (error: any) {
                    // Pass specific error messages (verified, locked, etc) to client
                    throw new Error(error.message || 'Invalid credentials');
                }
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account, profile }) {
            // Check if it's an OAuth login
            const isOAuth = ['google', 'facebook', 'twitter'].includes(account?.provider || '');
            
            if (isOAuth) {
                try {
                    // Check if user already exists and is an admin
                    const dbUser = await UserService.findOrCreateOAuthUser({
                        email: user.email!,
                        firstName: profile?.given_name || user.name?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Unknown',
                        lastName: profile?.family_name || user.name?.split(' ')[1] || profile?.name?.split(' ')[1] || 'Unknown',
                        image: user.image || undefined,
                        provider: account!.provider,
                        providerAccountId: account!.providerAccountId,
                    });

                    // SECURITY REQUIREMENT: No social login for admin
                    if (dbUser.role === UserRole.SUPER_ADMIN || dbUser.role === UserRole.SUB_ADMIN) {
                        return '/auth/login?error=Admins must use email and password';
                    }

                    // Inject DB data into user for the JWT callback
                    user.id = dbUser._id.toString();
                    user.role = dbUser.role as UserRole;
                    user.onboardingCompleted = dbUser.onboardingCompleted as boolean;
                    user.emailVerified = dbUser.emailVerified as any;

                    return true;
                } catch (error) {
                    console.error('OAuth sign-in error:', error);
                    return false;
                }
            }
            return true;
        },
    },
});
