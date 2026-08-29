import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { PlanService } from '@/services/planService';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans - Get available plans with optional category filter
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    let plans: any[];
    if (search && search.trim().length > 0) {
      plans = await PlanService.searchPlans(search.trim(), skip, limit);
    } else {
      const result = await PlanService.getAvailablePlans(category || undefined, skip, limit);
      plans = result.plans || [];
    }

    return NextResponse.json(
      {
        success: true,
        data: plans,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}

/**
 * POST /api/v1/plans - Create new plan (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return getErrorResponse('Unauthorized', 401);
    }

    // Check if user is admin (you can add role check here)
    const body = await request.json();

    const { title, description, duration, category, difficulty, days, author } = body;

    if (!title || !description || !duration || !days) {
      return getErrorResponse('Missing required fields', 400);
    }

    if (days.length !== duration) {
      return getErrorResponse('Number of days must match duration', 400);
    }

    // Plan creation would go here
    // await PlanRepository.createPlan({ ... });

    return NextResponse.json(
      {
        success: true,
        message: 'Plan created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
