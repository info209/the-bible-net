import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { PlanService } from '@/services/planService';
import { PlanRepository } from '@/repositories/planRepository';
import { connectDB } from '@/lib/db';
import { parseVerseReferences } from '@/utils/verseReferenceParser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/plans/[planId] - Get single plan details for editing
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await adminAuth();
    if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const plan = await PlanRepository.getPlanById(params.planId);

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * PUT /api/admin/plans/[planId] - Update plan safely
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await adminAuth();
    if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { planId } = params;
    const updates = await req.json();

    if (updates.days && updates.duration && updates.days.length !== Number(updates.duration)) {
      return NextResponse.json(
        { success: false, error: `Plan duration (${updates.duration} days) does not match configured days count (${updates.days.length})` },
        { status: 400 }
      );
    }

    if (updates.days) {
      for (const day of updates.days) {
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
    }

    const updatedPlan = await PlanService.updatePlan(planId, updates);

    if (!updatedPlan) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedPlan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/plans/[planId] - Delete plan
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const session = await adminAuth();
    if (!session?.user || session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Only Super Admin can delete plans.' }, { status: 401 });
    }

    await connectDB();
    const { planId } = params;

    const deleted = await PlanService.deletePlan(planId);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
