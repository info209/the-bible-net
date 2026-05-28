import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { UserLabel } from '@/models/UserLabel';
import mongoose from 'mongoose';
import { z } from 'zod';

const createSchema = z.object({
  label: z.string().min(1).max(40),
});

// ─── GET /api/user-labels ────────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const labels = await UserLabel.find({
      userId: new mongoose.Types.ObjectId(session.user.id as string),
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: labels.map((l) => l.label),
    });
  } catch (error) {
    console.error('[GET /api/user-labels]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/user-labels ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id as string);

    // Upsert — idempotent
    await UserLabel.findOneAndUpdate(
      { userId, label: parsed.data.label },
      { $setOnInsert: { userId, label: parsed.data.label, createdAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ success: true, data: parsed.data.label }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/user-labels]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
