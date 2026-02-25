import User, { IUser } from '@/models/User';
import bcrypt from 'bcryptjs';

/**
 * User Service Layer
 * Handles all user-related business logic
 */

export class UserService {
    /**
     * Create a new user with credentials
     */
    static async createUser(data: {
        name: string;
        email: string;
        password?: string;
        country?: string;
        language?: string;
        bibleVersion?: string;
        image?: string;
    }): Promise<IUser> {
        // Check if user already exists
        const email = data.email.toLowerCase();
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password if provided
        let hashedPassword;
        if (data.password) {
            hashedPassword = await bcrypt.hash(data.password, 12);
        }

        // Create user
        const user = await User.create({
            name: data.name,
            email,
            password: hashedPassword,
            image: data.image,
            accounts: [],
            role: 'user',
            profile: {
                country: data.country,
            },
            preferences: {
                language: data.language || 'en',
                bibleVersion: data.bibleVersion,
            }
        });

        return user;
    }

    /**
     * Find or create user from OAuth provider
     */
    static async findOrCreateOAuthUser(data: {
        email: string;
        name: string;
        image?: string;
        provider: string;
        providerAccountId: string;
        access_token?: string;
    }): Promise<IUser> {
        let user = await User.findOne({ email: data.email.toLowerCase() });

        if (user) {
            // Check if this provider is already linked
            const accountExists = user.accounts.some(
                (acc) => acc.provider === data.provider && acc.providerAccountId === data.providerAccountId
            );

            if (!accountExists) {
                // Link new provider to existing user
                user.accounts.push({
                    provider: data.provider,
                    type: 'oauth',
                    providerAccountId: data.providerAccountId,
                    access_token: data.access_token,
                });
                await user.save();
            }
        } else {
            // Create new user
            user = await User.create({
                name: data.name,
                email: data.email.toLowerCase(),
                image: data.image,
                accounts: [
                    {
                        provider: data.provider,
                        type: 'oauth',
                        providerAccountId: data.providerAccountId,
                        access_token: data.access_token,
                    },
                ],
                role: 'user',
            });
        }

        return user;
    }

    /**
     * Verify user credentials
     */
    static async verifyCredentials(email: string, password: string): Promise<IUser | null> {
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !user.password) {
            return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return null;
        }

        return user;
    }

    /**
     * Get user by ID
     */
    static async getUserById(id: string): Promise<IUser | null> {
        return User.findById(id);
    }

    /**
     * Get user by email
     */
    static async getUserByEmail(email: string): Promise<IUser | null> {
        return User.findOne({ email: email.toLowerCase() });
    }

    /**
     * Update user profile
     */
    static async updateProfile(
        userId: string,
        data: {
            name?: string;
            image?: string;
            profile?: {
                bio?: string;
                location?: string;
                website?: string;
            };
            preferences?: {
                theme?: 'light' | 'dark' | 'system';
                fontSize?: number;
                notificationsEnabled?: boolean;
            };
        }
    ): Promise<IUser | null> {
        const updateData: any = {};
        if (data.name) updateData.name = data.name;
        if (data.image) updateData.image = data.image;
        if (data.profile) updateData.profile = data.profile;
        if (data.preferences) updateData.preferences = data.preferences;

        return User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    }
}
