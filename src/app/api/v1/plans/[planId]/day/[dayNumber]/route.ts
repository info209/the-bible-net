import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans/[planId]/day/[dayNumber] - Get day content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string; dayNumber: string } }
) {
  try {
    const { planId, dayNumber } = params;
    const dayNum = parseInt(dayNumber);

    if (isNaN(dayNum)) {
      return getErrorResponse('Invalid day number', 400);
    }

    const dayContent = await PlanService.getDayContent(planId, dayNum);

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
    const session = await auth();
    if (!session?.user?.id) {
      return getErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { planId, dayNumber } = params;
    const dayNum = parseInt(dayNumber);

    if (isNaN(dayNum)) {
      return getErrorResponse('Invalid day number', 400);
    }

    const { action, scrollPosition } = body;

    if (action === 'mark-complete') {
      const progress = await PlanService.completDay(session.user.id, planId, dayNum);
      return NextResponse.json(
        {
          success: true,
          data: progress,
          message: 'Day marked as complete',
        },
        { status: 200 }
      );
    } else if (action === 'update-progress' && scrollPosition !== undefined) {
      const progress = await PlanService.updateReadingProgress(
        session.user.id,
        planId,
        dayNum,
        scrollPosition
      );
      return NextResponse.json(
        {
          success: true,
          data: progress,
          message: 'Progress updated',
        },
        { status: 200 }
      );
    } else {
      return getErrorResponse('Invalid action', 400);
    }
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
