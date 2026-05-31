import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { SavedItemRepository } from '@/repositories/savedItemRepository';
import { connectDB } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    await connectDB();

    const item = await SavedItemRepository.getById(session.user.id as string, id);
    if (item && item.type === 'note') {
      try {
        const bookId = item.metadata.bookId;
        const chapter = item.metadata.chapter;
        const verses = item.metadata.verses as number[] | undefined;
        if (bookId && chapter && verses) {
          const NoteModel = (await import('@/models/Note')).Note;
          const mongoose = (await import('mongoose')).default;
          await NoteModel.findOneAndDelete({
            userId: new mongoose.Types.ObjectId(session.user.id as string),
            'verses.bookId': bookId,
            'verses.chapter': chapter,
            'verses.verses': verses
          });
        }
      } catch (err) {
        console.error('[DELETE /api/user/save/[id]] Note delete sync error:', err);
      }
    }

    const deleted = await SavedItemRepository.unsaveItem(
      session.user.id as string,
      id
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Item unsaved' });
  } catch (error: unknown) {
    console.error('[DELETE /api/user/save/[id]] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
