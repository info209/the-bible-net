import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { SavedVerse } from '@/models/SavedVerse';
import mongoose from 'mongoose';
import { z } from 'zod';

const patchSchema = z.object({
  labels: z.array(z.string()).optional(),
  note: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

// ─── PATCH /api/saved-verses/[id] ───────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await SavedVerse.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(session.user.id as string),
      },
      { $set: { ...parsed.data, updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/saved-verses/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── DELETE /api/saved-verses/[id] ──────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    await connectDB();

    const deleted = await SavedVerse.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id as string),
    });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('[DELETE /api/saved-verses/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
