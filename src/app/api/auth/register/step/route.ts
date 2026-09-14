import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { userAuth } from '@/lib/auth/user';
import { UserService } from '@/services/userService';
import { normalizeCountry, normalizeLanguage, normalizeBibleVersion } from '@/constants/profile';

const stepSchema = z.object({
    userId: z.string().optional(),
    step: z.number().int().min(2).max(3),
    skipped: z.boolean().optional(),
    country: z.string().optional(),
    preferredLanguage: z.string().optional(),
    preferredBibleVersion: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const { userId: explicitUserId, step, skipped, country, preferredLanguage, preferredBibleVersion } = stepSchema.parse(body);

        let targetUserId = explicitUserId;
        if (!targetUserId) {
            // @ts-ignore
            const session = await userAuth();
            targetUserId = session?.user?.id;
        }

        if (!targetUserId) {
            return NextResponse.json({ success: false, error: 'Unauthorized: User ID or session required' }, { status: 401 });
        }

        if (step === 2) {
            const updates: any = {};
            if (!skipped) {
                if (country) updates.country = normalizeCountry(country);
                if (preferredLanguage) updates.preferredLanguage = normalizeLanguage(preferredLanguage);
            }
            const updatedUser = await UserService.updateOnboardingStep(targetUserId, 3, updates);
            if (!updatedUser) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: skipped ? 'Step 2 skipped' : 'Step 2 completed',
                data: {
                    onboardingStep: 3,
                    onboardingCompleted: false,
                    country: updatedUser.country,
                    preferredLanguage: updatedUser.preferredLanguage,
                },
            });
        }

        if (step === 3) {
            const updates: any = {};
            if (!skipped && preferredBibleVersion) {
                updates.preferredBibleVersion = normalizeBibleVersion(preferredBibleVersion);
            }
            const updatedUser = await UserService.completeOnboarding(targetUserId, updates);
            if (!updatedUser) {
                return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                message: skipped ? 'Step 3 skipped - onboarding complete' : 'Step 3 completed - onboarding complete',
                data: {
                    onboardingStep: 4,
                    onboardingCompleted: true,
                    preferredBibleVersion: updatedUser.preferredBibleVersion,
                },
            });
        }

        return NextResponse.json({ success: false, error: 'Invalid step' }, { status: 400 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
        }
        console.error('Registration step error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
