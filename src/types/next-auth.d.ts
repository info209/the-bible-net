import { UserRole } from '@/types/user';

declare module 'next-auth' {
    interface User {
        id?: string;
        role?: UserRole;
        onboardingCompleted?: boolean;
        emailVerified?: boolean;
        firstName?: string;
        lastName?: string;
        country?: string;
        preferredLanguage?: string;
        preferredBibleVersion?: string;
        sessionType?: 'ADMIN' | 'USER';
    }
    interface Session {
        user: User;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: UserRole;
        onboardingCompleted: boolean;
        emailVerified: boolean;
        sessionType: 'ADMIN' | 'USER';
        firstName?: string;
        lastName?: string;
        country?: string;
        preferredLanguage?: string;
        preferredBibleVersion?: string;
    }
}
