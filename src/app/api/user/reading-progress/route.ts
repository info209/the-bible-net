import { NextRequest, NextResponse } from 'next/server';
import { getSessionWithType } from '@/lib/auth-helpers';
import { ReadingProgressRepository } from '@/repositories/readingProgressRepository';
import { readingProgressSchema, syncProgressSchema } from '@/lib/validations/user';

/**
 * Handle Bible reading progress
 */
export async function POST(req: NextRequest) {
  try {
    const { session, type: sessionType } = await getSessionWithType();
    
    // Progress for guests is NOT stored in DB, handled by localStorage
    if (sessionType === 'GUEST' || !session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Guest progress is handled client-side'
      }, { status: 401 });
    }

    const userId = session.user.id as string;
    const body = await req.json();

    // Check if it's a sync request (array of progress items)
    if (Array.isArray(body)) {
      const validatedData = syncProgressSchema.safeParse(body);
      if (!validatedData.success) {
        return NextResponse.json({ error: validatedData.error.issues[0].message }, { status: 400 });
      }

      await ReadingProgressRepository.syncProgress(userId as string, validatedData.data);
      return NextResponse.json({ success: true, message: 'Progress synced successfully' });
    }

    // Normal single update
    const validatedData = readingProgressSchema.safeParse(body);
    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.issues[0].message }, { status: 400 });
    }

    const { bookId, chapter, versionId, completed, progressPercent } = validatedData.data;

    await ReadingProgressRepository.upsertProgress(
      userId as string,
      validatedData.data
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Reading progress updated'
    });

  } catch (error: any) {
    console.error('Error in reading progress API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * Get reading progress for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const { session, type: sessionType } = await getSessionWithType();
    
    if (sessionType === 'GUEST' || !session?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized',
        message: 'Guest progress is handled client-side'
      }, { status: 401 });
    }

    const userId = session.user.id as string;
    
    // Optionally fetch only latest or all
    const searchParams = req.nextUrl.searchParams;
    const onlyLatest = searchParams.get('latest') === 'true';

    if (onlyLatest) {
      const latest = await ReadingProgressRepository.getLatestProgress(userId as string);
      return NextResponse.json({ success: true, data: latest });
    }

    const progress = await ReadingProgressRepository.getProgress(userId as string);
    return NextResponse.json({ success: true, data: progress });

  } catch (error: any) {
    console.error('Error in fetching reading progress:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}
