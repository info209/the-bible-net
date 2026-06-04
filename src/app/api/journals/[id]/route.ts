import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Journal } from '@/models/Journal';

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

    const journal = await Journal.findOne({ _id: id, userId });
    if (!journal) {
      return NextResponse.json({ success: false, error: 'Journal not found or unauthorized' }, { status: 404 });
    }

    const body = await req.json();
    const { title, content, type, labels, verses, folderId, audioUrl, checklistItems, isPinned, isBookmarked } = body;

    // Field updates
    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
      }
      if (title.length > 120) {
        return NextResponse.json({ success: false, error: 'Title cannot exceed 120 characters' }, { status: 400 });
      }
      journal.title = title.trim();
    }

    if (content !== undefined) journal.content = content;
    if (type !== undefined) journal.type = type;
    if (labels !== undefined) journal.labels = labels;
    if (verses !== undefined) journal.verses = verses;
    if (folderId !== undefined) journal.folderId = folderId || undefined;
    if (audioUrl !== undefined) journal.audioUrl = audioUrl || undefined;
    if (checklistItems !== undefined) journal.checklistItems = checklistItems;
    if (isPinned !== undefined) journal.isPinned = !!isPinned;
    if (isBookmarked !== undefined) journal.isBookmarked = !!isBookmarked;

    await journal.save();

    return NextResponse.json({ success: true, data: journal });
  } catch (error: any) {
    console.error('[PATCH /api/journals/[id]] Error:', error);
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

    const result = await Journal.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Journal not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Journal deleted successfully' });
  } catch (error: any) {
    console.error('[DELETE /api/journals/[id]] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
