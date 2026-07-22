import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { parseVerseReferences, formatRefs } from '@/utils/verseReferenceParser';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined;
        const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined;
        const hasDevotional = searchParams.get('hasDevotional') === 'true';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '50', 10);

        const { data, total } = await DailyContentRepository.findAll(
            { year, month, hasDevotional },
            page,
            limit
        );

        return NextResponse.json({
            success: true,
            data,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();

        // Auto-compute contentYear from date
        if (data.date && !data.contentYear) {
            data.contentYear = parseInt(data.date.substring(0, 4), 10);
        }

        // Parse daily verse references if verseRefs not directly provided
        if (!data.verseRefs?.length && data.verseReference) {
            const parsed = parseVerseReferences(data.verseReference);
            if (parsed.errors.length === 0 && parsed.refs.length > 0) {
                data.verseRefs = parsed.refs;
            }
        }

        // Set primary verse fields for backward compat & year uniqueness index
        if (data.verseRefs && data.verseRefs.length > 0) {
            const firstRef = data.verseRefs[0];
            data.verseBook = firstRef.book;
            data.verseChapter = firstRef.chapter;
            data.verseNumber = firstRef.startVerse;
            if (!data.verseReference) {
                data.verseReference = formatRefs(data.verseRefs);
            }
        }

        // Parse devotional verse references into normalized array
        if (data.devotionalVerseRef && !data.devotionalVerseRefs?.length) {
            const parsed = parseVerseReferences(data.devotionalVerseRef);
            if (parsed.errors.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Invalid devotional verse reference: ${parsed.errors.join('; ')}`
                }, { status: 400 });
            }
            data.devotionalVerseRefs = parsed.refs;
        }

        // If devotionalVerseRefs already supplied (from new dynamic form), keep as-is

        const newContent = await DailyContentRepository.create(data);
        return NextResponse.json({ success: true, data: newContent });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Content for this date already exists, or this verse is already scheduled for this year.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/daily-content — deletes ALL records (migration endpoint)
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || session.user.role !== UserRole.SUPER_ADMIN) {
            return NextResponse.json({ error: 'Unauthorized. Only Super Admin can delete all records.' }, { status: 401 });
        }

        await connectDB();
        const deleted = await DailyContentRepository.deleteAll();
        return NextResponse.json({ success: true, deleted });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
