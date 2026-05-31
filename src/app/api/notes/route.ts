import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Note } from '@/models/Note';
import { Verse } from '@/models/Bible';
import mongoose from 'mongoose';
import { z } from 'zod';

const createNoteSchema = z.object({
  noteText: z.string().min(1, 'Note content is required'),
  labels: z.array(z.string()).optional().default([]),
  verses: z.array(
    z.object({
      bookId: z.string(),
      bookName: z.string(),
      chapter: z.number().int().positive(),
      verses: z.array(z.number().int().positive())
    })
  ).optional().default([]),
  version: z.string().optional().default('NKJV')
});

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = req.nextUrl;
    const label = searchParams.get('label');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(session.user.id as string),
    };

    if (label) {
      filter.labels = label;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Note.countDocuments(filter),
    ]);

    // Populate verse texts dynamically
    const populatedItems = await Promise.all(
      items.map(async (item: any) => {
        try {
          const versesWithText = await Promise.all(
            (item.verses || []).map(async (vRef: any) => {
              const verseDocs = await Verse.find({
                versionCode: (item.version || 'NKJV').toUpperCase(),
                bookName: vRef.bookName,
                chapterNumber: vRef.chapter,
                number: { $in: vRef.verses }
              }).sort({ number: 1 }).lean();

              const text = verseDocs.map(v => v.text).join(' ');
              return {
                ...vRef,
                verseText: text || 'Verse text not found.'
              };
            })
          );

          return {
            ...item,
            verses: versesWithText
          };
        } catch (e) {
          console.error('[GET /api/notes] Verse populate error:', e);
          return {
            ...item,
            verses: (item.verses || []).map((vRef: any) => ({
              ...vRef,
              verseText: 'Failed to load verse text.'
            }))
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
    console.error('[GET /api/notes]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(session.user.id as string);
    const { noteText, labels, verses, version } = parsed.data;

    const note = await Note.create({
      userId,
      noteText,
      labels,
      verses,
      version,
    });

    return NextResponse.json({ success: true, data: note }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/notes]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
