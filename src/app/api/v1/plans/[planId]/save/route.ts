import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse, getAnyUserSession } from '@/lib/auth-helpers';

/**
 * POST /api/v1/plans/[planId]/save - Toggle save plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const userContext = await getAnyUserSession();
    if (!userContext?.userId) {
      return getErrorResponse('Unauthorized', 401);
    }

    const { planId } = params;

    const progress = await PlanService.toggleSavePlan(userContext.userId, planId);

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
