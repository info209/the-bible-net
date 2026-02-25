import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserService } from '@/services/userService';
import { authConfig } from './auth.config';

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
                const email = credentials?.email;
                const password = credentials?.password;

                if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
                    throw new Error('Email and password are required');
                }

                const user = await UserService.verifyCredentials(email, password);

                if (!user) {
                    throw new Error('Invalid email or password');
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    language: user.preferences.language,
                };
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google' || account?.provider === 'facebook') {
                try {
                    await UserService.findOrCreateOAuthUser({
                        email: user.email!,
                        name: user.name!,
                        image: user.image,
                        provider: account.provider,
                        providerAccountId: account.providerAccountId,
                        access_token: account.access_token,
                    });
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
