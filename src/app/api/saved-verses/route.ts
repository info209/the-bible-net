import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { SavedVerse } from '@/models/SavedVerse';
import { Verse } from '@/models/Bible';
import mongoose from 'mongoose';
import { z } from 'zod';

// ─── Validation Schemas ──────────────────────────────────────────────────────
const createSchema = z.object({
  bookId: z.string().min(1),
  bookName: z.string().min(1),
  chapter: z.number().int().positive(),
  verses: z.array(z.number().int().positive()).min(1),
  verseRangeText: z.string().optional().default(''),
  labels: z.array(z.string()).optional().default([]),
  note: z.string().optional().default(''),
  version: z.string().optional().default('NKJV'),
  isPrivate: z.boolean().optional().default(false),
});

// ─── GET /api/saved-verses ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = req.nextUrl;
    const bookId = searchParams.get('bookId');
    const chapter = searchParams.get('chapter');
    const label = searchParams.get('label');
    const isPrivate = searchParams.get('isPrivate');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.user.id as string),
    };

    if (bookId) filter.bookId = bookId;
    if (chapter) filter.chapter = parseInt(chapter);
    if (label) filter.labels = label; // matches arrays containing this label
    if (isPrivate !== null && isPrivate !== undefined) {
      filter.isPrivate = isPrivate === 'true';
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SavedVerse.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SavedVerse.countDocuments(filter),
    ]);

    // Populate verse texts dynamically
    const populatedItems = await Promise.all(
      items.map(async (item: any) => {
        try {
          const verseDocs = await Verse.find({
            versionCode: (item.version || 'NKJV').toUpperCase(),
            bookName: item.bookName,
            chapterNumber: item.chapter,
            number: { $in: item.verses }
          }).sort({ number: 1 }).lean();

          const text = verseDocs.map(v => v.text).join(' ');
          return {
            ...item,
            verseText: text || 'Verse text not found.'
          };
        } catch (e) {
          console.error('[GET /api/saved-verses] Verse populate error:', e);
          return {
            ...item,
            verseText: 'Failed to load verse text.'
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: populatedItems,
      pagination: { total, page, limit, hasMore: skip + items.length < total },
    });
  } catch (error) {
    console.error('[GET /api/saved-verses]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

// ─── POST /api/saved-verses ──────────────────────────────────────────────────
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
    const { bookId, bookName, chapter, verses, verseRangeText, labels, note, version, isPrivate } =
      parsed.data;

    // Upsert: one save per user per (bookId, chapter, verses)
    const sortedVerses = [...verses].sort((a, b) => a - b);

    const saved = await SavedVerse.findOneAndUpdate(
      { userId, bookId, chapter, verses: sortedVerses },
      {
        $set: { bookName, verses: sortedVerses, verseRangeText, labels, note, version, isPrivate },
        $setOnInsert: { userId, bookId, chapter, createdAt: new Date() },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/saved-verses]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
