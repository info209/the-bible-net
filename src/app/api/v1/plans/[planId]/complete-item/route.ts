import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse, getAnyUserSession } from '@/lib/auth-helpers';

/**
 * POST /api/v1/plans/[planId]/complete-item - Complete a specific reading item
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
    const body = await request.json();
    const { dayNumber, itemId } = body;

    if (!dayNumber || !itemId) {
      return getErrorResponse('dayNumber and itemId are required', 400);
    }

    const progress = await PlanService.completeReadingItem(
      userContext.userId,
      planId,
      Number(dayNumber),
      String(itemId)
    );

    return NextResponse.json(
      {
        success: true,
        data: progress,
        message: 'Item marked as complete',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
