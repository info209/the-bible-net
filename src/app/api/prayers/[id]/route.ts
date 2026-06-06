import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { PersonalPrayer } from '@/models/PersonalPrayer';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const { id } = params;

    const prayer = await PersonalPrayer.findOne({ _id: id, userId });
    if (!prayer) {
      return NextResponse.json({ success: false, error: 'Personal prayer not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json();
    const { title, content, labels, verses, folderId, isPinned, isBookmarked, status } = body;

    // Field updates
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
      }
      if (title.length > 120) {
        return NextResponse.json({ success: false, error: 'Title cannot exceed 120 characters' }, { status: 400 });
      }
      prayer.title = title.trim();
    }

    if (content !== undefined) prayer.content = content;
    if (labels !== undefined) prayer.labels = labels;
    if (verses !== undefined) prayer.verses = verses;
    if (folderId !== undefined) prayer.folderId = folderId || undefined;
    if (isPinned !== undefined) prayer.isPinned = !!isPinned;
    if (isBookmarked !== undefined) prayer.isBookmarked = !!isBookmarked;
    // Status is one-way: can only transition active → prayed, never back
    if (status === 'prayed' && prayer.status !== 'prayed') {
      (prayer as any).status = 'prayed';
    }

    await prayer.save();

    return NextResponse.json({ success: true, data: prayer });
  } catch (error: any) {
    console.error('[PATCH /api/prayers/[id]] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const { id } = params;

    const result = await PersonalPrayer.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Personal prayer not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Personal prayer deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/prayers/[id]] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
