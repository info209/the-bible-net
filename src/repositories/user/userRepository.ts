import { User, IUser } from '@/models/User';
import { UserRole } from '@/types/user';
export class UserRepository {
    static async create(data: Partial<IUser>): Promise<IUser> {
        const user = new User(data);
        return await user.save();
    }

    static async findByEmail(email: string): Promise<IUser | null> {
        return await User.findOne({ email }).select('+password');
    }

    static async findById(id: string): Promise<IUser | null> {
        return await User.findById(id);
    }

    static async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
        return await User.findByIdAndUpdate(id, data, { returnDocument: 'after' });
    }

    static async listUsers(
        filters: {
            role?: UserRole;
            country?: string;
            preferredLanguage?: string;
            preferredBibleVersion?: string;
            registrationDateStart?: Date;
            registrationDateEnd?: Date;
        } = {},
        options: { page: number; limit: number } = { page: 1, limit: 10 }
    ): Promise<{ users: IUser[]; total: number }> {
        const query: any = { role: UserRole.USER }; // Only list normal users per requirement

        if (filters.country) query.country = filters.country;
        if (filters.preferredLanguage) query.preferredLanguage = filters.preferredLanguage;
        if (filters.preferredBibleVersion) query.preferredBibleVersion = filters.preferredBibleVersion;

        if (filters.registrationDateStart || filters.registrationDateEnd) {
            query.createdAt = {};
            if (filters.registrationDateStart) query.createdAt.$gte = filters.registrationDateStart;
            if (filters.registrationDateEnd) query.createdAt.$lte = filters.registrationDateEnd;
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .sort({ createdAt: -1 })
            .skip((options.page - 1) * options.limit)
            .limit(options.limit);

        return { users, total };
    }

    static async delete(id: string): Promise<boolean> {
        const result = await User.findByIdAndDelete(id);
        return !!result;
    }

    static async countByRole(role: UserRole): Promise<number> {
        return await User.countDocuments({ role });
    }

    static async findUserByResetToken(tokenHash: string): Promise<IUser | null> {
        return await User.findOne({
            passwordResetTokenHash: tokenHash,
            passwordResetExpires: { $gt: Date.now() }
        });
    }
}
