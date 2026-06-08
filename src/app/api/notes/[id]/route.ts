import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { Note } from '@/models/Note';
import mongoose from 'mongoose';
import { z } from 'zod';

const patchNoteSchema = z.object({
  noteText: z.string().optional(),
  labels: z.array(z.string()).optional(),
  verses: z.array(
    z.object({
      bookId: z.string(),
      bookName: z.string(),
      chapter: z.number().int().positive(),
      verses: z.array(z.number().int().positive())
    })
  ).optional(),
  version: z.string().optional()
});

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
    const parsed = patchNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    await connectDB();

    const updated = await Note.findOneAndUpdate(
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

    // Synchronize note update back to SavedItem collection
    if (updated.verses && updated.verses.length > 0) {
      try {
        const SavedItemModel = (await import('@/models/SavedItem')).SavedItem;
        const bookId = updated.verses[0].bookId;
        const chapter = updated.verses[0].chapter;
        const verses = updated.verses[0].verses;
        const version = updated.version || 'NKJV';

        await SavedItemModel.findOneAndUpdate(
          {
            userId: new mongoose.Types.ObjectId(session.user.id as string),
            type: 'note',
            'metadata.bookId': bookId,
            'metadata.chapter': chapter,
            'metadata.verses': verses
          },
          {
            $set: {
              'metadata.content': updated.noteText,
              'metadata.labels': updated.labels,
              'metadata.versionId': version,
              updatedAt: new Date()
            }
          }
        );
      } catch (err) {
        console.error('[PATCH /api/notes/[id]] SavedItem sync error:', err);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/notes/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

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

    const deleted = await Note.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(session.user.id as string),
    });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    // Synchronize note deletion back to SavedItem collection
    if (deleted.verses && deleted.verses.length > 0) {
      try {
        const SavedItemModel = (await import('@/models/SavedItem')).SavedItem;
        const bookId = deleted.verses[0].bookId;
        const chapter = deleted.verses[0].chapter;
        const verses = deleted.verses[0].verses;

        await SavedItemModel.findOneAndDelete({
          userId: new mongoose.Types.ObjectId(session.user.id as string),
          type: 'note',
          'metadata.bookId': bookId,
          'metadata.chapter': chapter,
          'metadata.verses': verses
        });
      } catch (err) {
        console.error('[DELETE /api/notes/[id]] SavedItem sync error:', err);
      }
    }

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('[DELETE /api/notes/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
