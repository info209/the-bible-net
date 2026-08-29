import { NextRequest, NextResponse } from 'next/server';
import { PlanService } from '@/services/planService';
import { getErrorResponse, getAnyUserSession } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans/user/library?tab=my-plans - Get user's library
 */
export async function GET(request: NextRequest) {
  try {
    const userContext = await getAnyUserSession();
    if (!userContext?.userId) {
      return getErrorResponse('Unauthorized', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get('tab') || 'my-plans') as
      | 'my-plans'
      | 'find-plans'
      | 'saved'
      | 'completed';
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    const plans = await PlanService.getUserLibrary(userContext.userId, tab, skip, limit);

    return NextResponse.json(
      {
        success: true,
        data: plans,
        tab,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
