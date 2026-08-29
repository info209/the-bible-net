import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { PlanService } from '@/services/planService';
import { PlanRepository } from '@/repositories/planRepository';
import { connectDB } from '@/lib/db';
import { parseVerseReferences } from '@/utils/verseReferenceParser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/plans - List all plans (draft + published)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await adminAuth();
    if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'published', 'draft'
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (status === 'published') filter.isPublished = true;
    if (status === 'draft') filter.isPublished = false;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const { Plan } = await import('@/models/Plan');
    const plans = await Plan.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Plan.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: plans,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/plans - Create a new plan
 */
export async function POST(req: NextRequest) {
  try {
    const session = await adminAuth();
    if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const data = await req.json();

    // Validations
    if (!data.title || !data.description || !data.duration || !data.days || !data.category) {
      return NextResponse.json(
        { success: false, error: 'Title, description, category, duration, and days are required' },
        { status: 400 }
      );
    }

    if (data.days.length !== Number(data.duration)) {
      return NextResponse.json(
        { success: false, error: `Plan duration (${data.duration} days) does not match configured days count (${data.days.length})` },
        { status: 400 }
      );
    }

    // Validate scripture references in plan days
    for (const day of data.days) {
      if (!day.items || day.items.length === 0) {
        return NextResponse.json(
          { success: false, error: `Day ${day.dayNumber} must contain at least one reading item` },
          { status: 400 }
        );
      }

      for (const item of day.items) {
        if (item.type === 'scripture' && item.scriptureRef) {
          const { errors } = parseVerseReferences(item.scriptureRef);
          if (errors.length > 0) {
            return NextResponse.json(
              { success: false, error: `Invalid scripture reference on Day ${day.dayNumber}: ${errors.join('; ')}` },
              { status: 400 }
            );
          }
        }
      }
    }

    data.createdBy = session.user.id;
    data.author = data.author || session.user.name || 'Admin';

    const newPlan = await PlanService.createPlan(data);

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
