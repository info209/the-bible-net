import { UserRole } from '../models/User';

declare module 'next-auth' {
    interface User {
        id?: string;
        role?: UserRole;
        onboardingCompleted?: boolean;
        emailVerified?: boolean;
        firstName?: string;
        lastName?: string;
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
    }
}
