import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UserService } from '@/services/userService';
import { UserRole } from '@/types/user';
import { adminAuthConfig } from './admin.config';

export const { 
    handlers: adminHandlers, 
    auth: adminAuth, 
    signIn: adminSignIn, 
    signOut: adminSignOut 
} = NextAuth({
    ...adminAuthConfig,
    providers: [
        CredentialsProvider({
            name: 'Admin Credentials',
            credentials: {
                email: { label: 'Admin Email', type: 'email' },
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

                    // STRICT ROLE CHECK: Admins ONLY
                    const adminUserRole = typeof user.role === 'string' ? user.role : String(user.role);
                    if (adminUserRole !== 'SUPER_ADMIN' && adminUserRole !== UserRole.SUPER_ADMIN && 
                        adminUserRole !== 'SUB_ADMIN' && adminUserRole !== UserRole.SUB_ADMIN) {
                        throw new Error('Access denied. Admin privileges required.');
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        role: user.role as UserRole,
                        sessionType: 'ADMIN',
                        firstName: user.firstName,
                        lastName: user.lastName,
                        image: user.image,
                    };
                } catch (error: any) {
                    throw new Error(error.message || 'Invalid admin credentials');
                }
            },
        }),
    ],
    pages: {
        signIn: '/admin/login',
        error: '/admin/login',
    },
});
