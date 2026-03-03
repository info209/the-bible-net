import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserService } from '@/services/userService';
import { z } from 'zod';

const onboardingSchema = z.object({
    preferredLanguage: z.string().min(1),
    preferredBibleVersion: z.string().min(1),
    country: z.string().min(1),
});

/**
 * @swagger
 * /api/v1/user/onboarding:
 *   post:
 *     summary: Complete missing onboarding data for social accounts
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [preferredLanguage, preferredBibleVersion, country]
 *             properties:
 *               preferredLanguage: { type: string }
 *               preferredBibleVersion: { type: string }
 *               country: { type: string }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: User not found
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Please login.' }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = onboardingSchema.parse(body);

        const updatedUser = await UserService.completeOnboarding(session.user.id, validatedData);
        if (!updatedUser) {
            return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Onboarding complete.',
            data: updatedUser,
        });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Onboarding error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
