import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Journal } from '@/models/Journal';

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const folderId = searchParams.get('folderId') || '';
    const type = searchParams.get('type') || '';
    const isPinned = searchParams.get('isPinned');
    const isBookmarked = searchParams.get('isBookmarked');
    const label = searchParams.get('label') || '';

    // Build Mongoose Query
    const filter: any = { userId };

    if (folderId) {
      filter.folderId = folderId;
    }
    if (type) {
      filter.type = type;
    }
    if (isPinned !== null && isPinned !== undefined) {
      filter.isPinned = isPinned === 'true';
    }
    if (isBookmarked !== null && isBookmarked !== undefined) {
      filter.isBookmarked = isBookmarked === 'true';
    }
    if (label) {
      filter.labels = label;
    }

    // Text search query matching: title, content, labels, or linked bible verses
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      filter.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { labels: searchRegex },
        { 'verses.bookName': searchRegex }
      ];
    }

    // Fetch journals: pinned first, then by updatedAt
    const journals = await Journal.find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .populate('folderId', 'name');

    return NextResponse.json({ success: true, data: journals });
  } catch (error: any) {
    console.error('[GET /api/journals] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;

    const body = await req.json();
    const { title, content, type, labels, verses, folderId, audioUrl, checklistItems, isPinned, isBookmarked } = body;

    // Title validation
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (title.length > 120) {
      return NextResponse.json({ success: false, error: 'Title cannot exceed 120 characters' }, { status: 400 });
    }

    const newJournal = await Journal.create({
      userId,
      title: title.trim(),
      content: content || '',
      type: type || 'text',
      labels: labels || [],
      verses: verses || [],
      folderId: folderId || undefined,
      audioUrl: audioUrl || undefined,
      checklistItems: checklistItems || [],
      isPinned: !!isPinned,
      isBookmarked: !!isBookmarked,
    });

    return NextResponse.json({ success: true, data: newJournal }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/journals] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
