import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { parseVerseReferences } from '@/utils/verseReferenceParser';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectDB();
        const content = await DailyContentRepository.findById(params.id);
        if (!content) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: content });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectDB();
        const data = await req.json();

        // Auto-compute contentYear if date changed
        if (data.date) {
            data.contentYear = parseInt(data.date.substring(0, 4), 10);
            // Only rebuild verseReference if the daily verse fields are being updated
            if (data.verseBook && data.verseChapter && data.verseNumber) {
                data.verseReference = `${data.verseBook} ${data.verseChapter}:${data.verseNumber}`;
            }
        }

        // Parse devotional verse references into normalized array
        if (data.devotionalVerseRef && !data.devotionalVerseRefs?.length) {
            const parsed = parseVerseReferences(data.devotionalVerseRef);
            if (parsed.errors.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Invalid verse reference: ${parsed.errors.join('; ')}`
                }, { status: 400 });
            }
            data.devotionalVerseRefs = parsed.refs;
        }

        const updated = await DailyContentRepository.updateById(params.id, data);
        if (!updated) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'This verse is already scheduled for this year, or the date already has content.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await connectDB();
        const deleted = await DailyContentRepository.deleteById(params.id);
        if (!deleted) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
