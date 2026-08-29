import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse, getAnyUserSession } from '@/lib/auth-helpers';

/**
 * POST /api/v1/plans/[planId]/rate - Rate a completed plan
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

    const body = await request.json();
    const { planId } = params;
    const { rating, review } = body;

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return getErrorResponse('Rating must be an integer between 1 and 5', 400);
    }

    const progress = await PlanService.ratePlan(
      userContext.userId,
      planId,
      rating,
      review
    );

    return NextResponse.json(
      {
        success: true,
        data: progress,
        message: 'Plan rated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message.includes('only rate completed')) {
      return getErrorResponse(error.message, 400);
    }
    return getErrorResponse(error.message, 500);
  }
}
