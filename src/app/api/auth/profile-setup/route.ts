import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const profileSetupSchema = z.object({
    userId: z.string().min(1, 'User ID is required'),
    country: z.string().optional(),
    preferredLanguage: z.string().optional(),
    preferredBibleVersion: z.string().optional(),
});

/**
 * @swagger
 * /api/auth/profile-setup:
 *   post:
 *     summary: Complete user profile setup
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string }
 *               country: { type: string }
 *               preferredLanguage: { type: string }
 *               preferredBibleVersion: { type: string }
 *     responses:
 *       200:
 *         description: Profile setup complete
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, ...fields } = profileSetupSchema.parse(body);

        const updatedUser = await UserService.completeOnboarding(userId, fields);
        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Profile completed successfully.',
            data: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Profile setup error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
