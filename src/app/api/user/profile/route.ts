import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { UserRepository } from '@/repositories/user/userRepository';
import { z } from 'zod';

const profileUpdateSchema = z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
    lastName: z.string().min(1, 'Last name is required').optional(),
    country: z.enum(['New Zealand', 'United States', 'United Kingdom', 'India', 'Australia', 'Canada']).optional(),
    preferredLanguage: z.enum(['English', 'Spanish', 'French', 'Hindi', 'Telugu']).optional(),
    preferredBibleVersion: z.string().min(1, 'Preferred Bible version is required').optional(),
    onboardingCompleted: z.boolean().optional(),
    image: z.string().optional().nullable(),
});

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the authenticated user's profile information. Sensitive fields are excluded.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information (e.g., name, preferences).
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, country, preferredLanguage, preferredBibleVersion]
 *             properties:
 *               firstName: { type: string, minLength: 2 }
 *               lastName: { type: string }
 *               country: { type: string, enum: [New Zealand, United States, United Kingdom, India, Australia, Canada] }
 *               preferredLanguage: { type: string, enum: [English, Spanish, French, Hindi, Telugu] }
 *               preferredBibleVersion: { type: string, description: 'Bible version abbreviation (e.g. NKJV, KJV, TEL, HIN)' }
 *               onboardingCompleted: { type: boolean }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

export async function GET(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const user = await UserRepository.findById(session.user.id);
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Remove sensitive fields
        const userObj = user.toObject ? user.toObject() : user;
        const { password, passwordResetTokenHash, passwordResetExpires, ...safeUser } = userObj;

        return NextResponse.json({
            success: true,
            data: safeUser,
        });
    } catch (error: any) {
        console.error('Profile fetch error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        console.log(`[Profile Update] User ID: ${session.user.id}`, body);
        
        // Use partial for general updates if needed, but for setup we want full validation
        // The user request specified these fields are required now
        const validatedData = profileUpdateSchema.parse(body);

        // Convert any possible 'null' to 'undefined' to match Partial<IUser> type definition
        const updatePayload = {
            ...validatedData,
            image: validatedData.image === null ? undefined : validatedData.image,
        };

        const updatedUser = await UserRepository.update(session.user.id, updatePayload);
        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.issues[0].message, errors: error.issues }, { status: 400 });
        }
        console.error('Profile update error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
