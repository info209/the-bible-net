import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { parseVerseReferences } from '@/utils/verseReferenceParser';
import { getErrorResponse } from '@/lib/auth-helpers';

/**
 * GET /api/v1/plans/[planId]/scripture?ref=James%201:18-24&version=NIV
 * Dynamic scripture text resolution for reading plans using existing Bible data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ref = searchParams.get('ref');
    const version = searchParams.get('version') || 'NIV';

    if (!ref) {
      return getErrorResponse('Scripture reference is required', 400);
    }

    const { refs, errors } = parseVerseReferences(ref);

    if (errors.length > 0 && refs.length === 0) {
      return getErrorResponse(`Invalid scripture reference: ${errors.join('; ')}`, 400);
    }

    const verseTexts: Array<{ refString: string; book: string; chapter: number; text: string }> = [];

    for (const r of refs) {
      const verseNumbers: number[] = [];
      for (let i = r.startVerse; i <= r.endVerse; i++) {
        verseNumbers.push(i);
      }

      const text = await BibleService.findVersesText(
        version,
        r.book,
        r.book,
        r.chapter,
        verseNumbers
      );

      const refString = r.startVerse === r.endVerse
        ? `${r.book} ${r.chapter}:${r.startVerse}`
        : `${r.book} ${r.chapter}:${r.startVerse}-${r.endVerse}`;

      verseTexts.push({
        refString,
        book: r.book,
        chapter: r.chapter,
        text: text || `[Scripture passage: ${refString}]`,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          reference: ref,
          version,
          passages: verseTexts,
          fullText: verseTexts.map((p) => p.text).join(' '),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    return getErrorResponse(error.message, 500);
  }
}
