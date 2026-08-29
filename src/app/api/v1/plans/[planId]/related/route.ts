import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans/[planId]/related - Get related plans
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '6', 10);

    const relatedPlans = await PlanService.getRelatedPlans(planId, limit);

    return NextResponse.json(
      {
        success: true,
        data: relatedPlans,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
