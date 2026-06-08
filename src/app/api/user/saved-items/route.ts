import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-helpers';
import { SavedItemRepository } from '@/repositories/savedItemRepository';
import { connectDB } from '@/lib/db';
import { SavedItemType } from '@/models/SavedItem';
import { BibleService } from '@/services/bibleService';

const VALID_TYPES: SavedItemType[] = ['bible', 'journal', 'reading_plan', 'highlight', 'note'];

export async function GET(req: NextRequest) {
  try {
    const session = await getUserSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

    // Validate type filter
    const type: SavedItemType | undefined =
      typeParam && VALID_TYPES.includes(typeParam as SavedItemType)
        ? (typeParam as SavedItemType)
        : undefined;

    const bookId = searchParams.get('bookId');
    const chapterParam = searchParams.get('chapter');
    const chapter = chapterParam ? parseInt(chapterParam) : undefined;

    await connectDB();

    const result = await SavedItemRepository.getSavedItems(
      session.user.id as string,
      type,
      page,
      limit,
      { bookId: bookId || undefined, chapter }
    );

    // Populate verse texts for highlight items dynamically using robust helper
    const populatedItems = await Promise.all(
      result.items.map(async (item: any) => {
        if (item.type === 'highlight' && item.metadata) {
          try {
            const text = await BibleService.findVersesText(
              (item.metadata.versionId as string) || 'NKJV',
              (item.metadata.bookId as string) || '',
              (item.metadata.bookName as string) || '',
              (item.metadata.chapter as number) || 1,
              [(item.metadata.verse as number) || 1]
            );
            return {
              ...item,
              metadata: {
                ...item.metadata,
                content: text || 'Verse text not found.'
              }
            };
          } catch (e) {
            console.error('[GET /api/user/saved-items] Highlight populate error:', e);
          }
        }
        return item;
      })
    );

    return NextResponse.json({
      success: true,
      data: populatedItems,
      pagination: {
        total: result.total,
        page,
        limit,
        hasMore: result.hasMore,
      },
    });
  } catch (error: unknown) {
    console.error('[GET /api/user/saved-items] error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
