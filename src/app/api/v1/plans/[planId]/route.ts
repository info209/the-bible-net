import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await auth();
    const { planId } = params;

    const planWithProgress = await PlanService.getPlanWithProgress(
      planId,
      session?.user?.id
    );

    if (!planWithProgress) {
      return getErrorResponse('Plan not found', 404);
    }

    return NextResponse.json(
      {
        success: true,
        data: planWithProgress,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}

/**
 * PUT /api/v1/plans/[planId] - Update plan (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return getErrorResponse('Unauthorized', 401);
    }

    const body = await request.json();
    const { planId } = params;

    // Update logic would go here
    // await PlanRepository.updatePlan(planId, body);

    return NextResponse.json(
      {
        success: true,
        message: 'Plan updated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}

/**
 * DELETE /api/v1/plans/[planId] - Delete plan (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return getErrorResponse('Unauthorized', 401);
    }

    const { planId } = params;

    // Delete logic would go here
    // await PlanRepository.deletePlan(planId);

    return NextResponse.json(
      {
        success: true,
        message: 'Plan deleted successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
