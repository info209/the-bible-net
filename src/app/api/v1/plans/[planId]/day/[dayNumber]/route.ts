import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse, getAnyUserSession } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans/[planId]/day/[dayNumber] - Get day content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string; dayNumber: string } }
) {
  try {
    const { planId, dayNumber } = params;
    const dayNum = parseInt(dayNumber, 10);

    if (isNaN(dayNum)) {
      return getErrorResponse('Invalid day number', 400);
    }

    const planData = await PlanService.getPlanWithProgress(planId);
    if (!planData || !planData.plan) {
      return getErrorResponse('Plan not found', 404);
    }

    const dayContent = (planData.plan.days || []).find((d: any) => d.dayNumber === dayNum);
    if (!dayContent) {
      return getErrorResponse('Day content not found', 404);
    }

    return NextResponse.json(
      {
        success: true,
        data: dayContent,
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return getErrorResponse(error.message, 404);
    }
    if (error.message.includes('Invalid')) {
      return getErrorResponse(error.message, 400);
    }
    return getErrorResponse(error.message, 500);
  }
}

/**
 * PUT /api/v1/plans/[planId]/day/[dayNumber] - Mark day complete or update progress
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string; dayNumber: string } }
) {
  try {
    const userContext = await getAnyUserSession();
    if (!userContext?.userId) {
      return getErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { planId, dayNumber } = params;
    const dayNum = parseInt(dayNumber, 10);

    if (isNaN(dayNum)) {
      return getErrorResponse('Invalid day number', 400);
    }

    const { action } = body;

    if (action === 'mark-complete') {
      const progress = await PlanService.markDayComplete(userContext.userId, planId, dayNum);
      return NextResponse.json(
        {
          success: true,
          data: progress,
          message: 'Day marked as complete',
        },
        { status: 200 }
      );
    } else {
      const progress = await PlanService.getPlanWithProgress(planId, userContext.userId);
      return NextResponse.json(
        {
          success: true,
          data: progress,
          message: 'Progress retrieved',
        },
        { status: 200 }
      );
    }
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
