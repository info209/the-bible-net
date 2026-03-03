import { UserRepository } from '@/repositories/user/userRepository';
import { UserRole } from '@/models/User';

export class AdminService {
    /**
     * Fetches a paginated list of users with filters.
     */
    static async listUsers(
        filters: {
            country?: string;
            preferredLanguage?: string;
            preferredBibleVersion?: string;
            registrationDateStart?: string;
            registrationDateEnd?: string;
        } = {},
        options: { page: number; limit: number } = { page: 1, limit: 10 }
    ) {
        // Standardize dates
        const standardizedFilters = {
            ...filters,
            registrationDateStart: filters.registrationDateStart ? new Date(filters.registrationDateStart) : undefined,
            registrationDateEnd: filters.registrationDateEnd ? new Date(filters.registrationDateEnd) : undefined,
        };

        return await UserRepository.listUsers(standardizedFilters, options);
    }

    /**
     * Only SuperAdmin can create SubAdmins.
     */
    static async createSubAdmin(data: { email: string; firstName: string; lastName: string }) {
        const existing = await UserRepository.findByEmail(data.email);
        if (existing) throw new Error('Email already registered');

        return await UserRepository.create({
            ...data,
            role: UserRole.SUB_ADMIN,
            emailVerified: true, // Admin-created accounts are auto-verified
            onboardingCompleted: true,
        });
    }

    /**
     * SuperAdmin can deactivate/delete users.
     */
    static async deleteUser(id: string) {
        const user = await UserRepository.findById(id);
        if (!user) throw new Error('User not found');
        if (user.role === UserRole.SUPER_ADMIN) throw new Error('Cannot delete SUPER_ADMIN');

        return await UserRepository.delete(id);
    }
}
