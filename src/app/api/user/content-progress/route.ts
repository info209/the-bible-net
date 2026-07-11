import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUserSession } from '@/lib/auth-helpers';
import { UserContentProgressRepository } from '@/repositories/userContentProgressRepository';
import { ProgressStatus } from '@/models/UserContentProgress';

const VALID_STATUSES: ProgressStatus[] = ['INCOMPLETE', 'IN_PROGRESS', 'COMPLETED'];
const VALID_CONTENT_TYPES = ['dailyDevotional'];

/**
 * GET /api/user/content-progress
 *
 * Fetch progress records for the current user.
 *
 * Query params:
 *   contentType  — e.g. "dailyDevotional"
 *   dates        — comma-separated YYYY-MM-DD values, e.g. "2026-07-05,2026-07-06"
 */
export async function GET(request: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const contentType = searchParams.get('contentType');
        const datesParam = searchParams.get('dates');

        if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
            return NextResponse.json({ error: 'Invalid or missing contentType' }, { status: 400 });
        }

        if (!datesParam) {
            return NextResponse.json({ error: 'Missing dates parameter' }, { status: 400 });
        }

        const dates = datesParam
            .split(',')
            .map((d) => d.trim())
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .slice(0, 30); // guard against excessive requests

        if (dates.length === 0) {
            return NextResponse.json({ data: {} });
        }

        await connectDB();

        const progressMap = await UserContentProgressRepository.findByUserAndDates(
            session.user.id,
            contentType,
            dates
        );

        // Serialize — strip Mongoose document internals
        const serialized: Record<string, any> = {};
        for (const [date, record] of Object.entries(progressMap)) {
            serialized[date] = {
                status: record.status,
                startedAt: record.startedAt ?? null,
                completedAt: record.completedAt ?? null,
            };
        }

        return NextResponse.json({ data: serialized });
    } catch (error) {
        console.error('[content-progress GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/user/content-progress
 *
 * Create or update a progress record.
 *
 * Body: { contentType, date, status }
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getUserSession();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const body = await request.json();
        const { contentType, date, status } = body;

        if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
            return NextResponse.json({ error: 'Invalid or missing contentType' }, { status: 400 });
        }

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return NextResponse.json({ error: 'Invalid or missing date (expected YYYY-MM-DD)' }, { status: 400 });
        }

        if (!status || !VALID_STATUSES.includes(status)) {
            return NextResponse.json(
                { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
                { status: 400 }
            );
        }

        await connectDB();

        const updated = await UserContentProgressRepository.upsertProgress(
            session.user.id,
            contentType,
            date,
            status as ProgressStatus
        );

        return NextResponse.json({
            success: true,
            data: {
                status: updated?.status ?? status,
                startedAt: updated?.startedAt ?? null,
                completedAt: updated?.completedAt ?? null,
            },
        });
    } catch (error) {
        console.error('[content-progress POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
