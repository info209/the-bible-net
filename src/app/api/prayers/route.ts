import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Prayer } from '@/models/Prayer';
import { PersonalPrayer } from '@/models/PersonalPrayer';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectDB();
    const session = await getUserSession();
    const { searchParams } = new URL(req.url);
    const personal = searchParams.get('personal') === 'true';

    // ── PERSONAL PRIVATE PRAYERS ──
    if (personal) {
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const userId = (session.user as any).id;
      const q = searchParams.get('q') || '';
      const folderId = searchParams.get('folderId') || '';
      const isPinned = searchParams.get('isPinned');
      const isBookmarked = searchParams.get('isBookmarked');
      const label = searchParams.get('label') || '';

      const filter: any = { userId };
      if (folderId) filter.folderId = folderId;
      if (isPinned !== null && isPinned !== undefined) filter.isPinned = isPinned === 'true';
      if (isBookmarked !== null && isBookmarked !== undefined) filter.isBookmarked = isBookmarked === 'true';
      if (label) filter.labels = label;

      if (q) {
        const searchRegex = new RegExp(q, 'i');
        filter.$or = [
          { title: searchRegex },
          { content: searchRegex },
          { labels: searchRegex },
          { 'verses.bookName': searchRegex }
        ];
      }

      const personalPrayers = await PersonalPrayer.find(filter)
        .sort({ isPinned: -1, updatedAt: -1 });

      return NextResponse.json({ success: true, data: personalPrayers });
    }

    // ── PUBLIC WALL COMMUNITY PRAYERS (Original Logic) ──
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'newest';

    const sortOption: any = {};
    if (sort === 'trending') {
      sortOption.intercessionCount = -1;
      sortOption.createdAt = -1;
    } else {
      sortOption.createdAt = -1;
    }

    const prayers = await Prayer.find({ isPublic: true })
      .sort(sortOption)
      .limit(limit)
      .populate('userId', 'firstName lastName image');

    return NextResponse.json(prayers);
  } catch (error: any) {
    console.error('Error fetching prayers:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getUserSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await req.json();
    const { searchParams } = new URL(req.url);

    // Differentiate Personal private prayers vs Public Wall Community prayers
    const isPersonal =
      searchParams.get('personal') === 'true' ||
      body.personal === true ||
      'title' in body;

    // ── PERSONAL PRIVATE PRAYER CREATION ──
    if (isPersonal) {
      const { title, content, labels, verses, folderId, isPinned, isBookmarked } = body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
      }

      if (title.length > 120) {
        return NextResponse.json({ success: false, error: 'Title cannot exceed 120 characters' }, { status: 400 });
      }

      const personalPrayer = await PersonalPrayer.create({
        userId: (session.user as any).id,
        title: title.trim(),
        content: content || '',
        labels: labels || [],
        verses: verses || [],
        folderId: folderId || undefined,
        isPinned: !!isPinned,
        isBookmarked: !!isBookmarked,
      });

      return NextResponse.json({ success: true, data: personalPrayer }, { status: 201 });
    }

    // ── PUBLIC WALL COMMUNITY PRAYER CREATION (Original Logic) ──
    const { text, isPublic, anonymous } = body;

    if (!text) {
      return NextResponse.json({ error: 'Prayer text is required' }, { status: 400 });
    }

    const newPrayer = await Prayer.create({
      userId: (session.user as any).id,
      text,
      isPublic: isPublic ?? true,
      anonymous: anonymous ?? false,
    });

    return NextResponse.json(newPrayer, { status: 201 });
  } catch (error: any) {
    console.error('Error creating prayer:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
