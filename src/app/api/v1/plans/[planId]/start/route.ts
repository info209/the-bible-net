import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * POST /api/v1/plans/[planId]/start - Start a plan
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

    const progress = await PlanService.startPlan(session.user.id, planId);

    return NextResponse.json(
      {
        success: true,
        data: progress,
        message: 'Plan started successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.message.includes('already started')) {
      return getErrorResponse(error.message, 400);
    }
    if (error.message.includes('not found')) {
      return getErrorResponse(error.message, 404);
    }
    return getErrorResponse(error.message, 500);
  }
}
