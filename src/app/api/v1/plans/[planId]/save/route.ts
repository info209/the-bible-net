import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * POST /api/v1/plans/[planId]/save - Toggle save plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return getErrorResponse('Unauthorized', 401);
    }

    const { planId } = params;

    const progress = await PlanService.toggleSavePlan(session.user.id, planId);

    return NextResponse.json(
      {
        success: true,
        data: progress,
        message: progress?.isSaved ? 'Plan saved' : 'Plan unsaved',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
