import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import {
    parseFileBuffer,
    validateVerseRows,
    importVerses,
    generateFailedRowsCsv,
} from '@/services/bulkImportService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/daily-content/bulk-verse
 * Accepts a CSV or XLSX file and bulk-imports daily verse schedules.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ];

        const isAllowed = allowedTypes.includes(file.type) ||
            file.name.endsWith('.csv') ||
            file.name.endsWith('.xlsx') ||
            file.name.endsWith('.xls');

        if (!isAllowed) {
            return NextResponse.json({ success: false, error: 'Only CSV and XLSX files are supported.' }, { status: 400 });
        }

        const MAX_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_SIZE) {
            return NextResponse.json({ success: false, error: 'File size exceeds 10MB limit.' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const rawRows = parseFileBuffer(buffer, file.name);

        if (rawRows.length === 0) {
            return NextResponse.json({ success: false, error: 'File is empty or has no data rows.' }, { status: 400 });
        }

        const { valid, errors } = await validateVerseRows(rawRows);

        let imported = 0;
        let upserted = 0;

        if (valid.length > 0) {
            const result = await importVerses(valid);
            imported = result.upserted + result.modified;
            upserted = result.upserted;
        }

        const failedRowsCsv = errors.length > 0 ? generateFailedRowsCsv(errors) : undefined;

        return NextResponse.json({
            success: true,
            data: {
                total: rawRows.length,
                imported,
                upserted,
                skipped: rawRows.length - valid.length - errors.length,
                errorCount: errors.length,
                errors,
                failedRowsCsv,
            }
        });
    } catch (error: any) {
        console.error('Bulk verse import error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Import failed' }, { status: 500 });
    }
}
