import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

const VERSE_HEADERS = ['Date (YYYY-MM-DD)', 'Book Name', 'Chapter Number', 'Verse Number', 'Background Image URL'];
const VERSE_EXAMPLES = [
    ['2026-05-14', 'Psalms', '23', '1', 'https://example.com/bg1.jpg'],
    ['2026-05-15', 'John', '3', '16', ''],
    ['2026-05-16', 'Romans', '8', '28', 'https://example.com/bg2.jpg'],
];

const DEVOTIONAL_HEADERS = ['Date (YYYY-MM-DD)', 'Verse Reference', 'Title', 'Body', 'Background Image URL'];
const DEVOTIONAL_EXAMPLES = [
    ['2026-05-14', 'Romans 8:28', 'Trust in God\'s Plan', 'God works in mysterious ways and has a purpose for every season of our lives. When we trust Him fully, even the hardest circumstances become stepping stones to His glory.', ''],
    ['2026-05-15', 'John 3:16', 'God\'s Unconditional Love', 'The love of God is so vast and deep that He gave His only Son so that we might have life. Meditate today on how much you are loved by your Heavenly Father.', 'https://example.com/bg.jpg'],
    ['2026-05-16', 'Philippians 4:13', 'Strength in Every Season', 'No matter what challenges you face today, remember that you can do all things through Christ who gives you strength. His power is made perfect in your weakness.', ''],
];

/**
 * GET /api/admin/daily-content/sample-template
 * Returns a downloadable sample CSV or XLSX template.
 * Query params: type=verse|devotional, format=csv|xlsx
 */
export async function GET(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'verse';
        const format = searchParams.get('format') || 'csv';

        const headers = type === 'devotional' ? DEVOTIONAL_HEADERS : VERSE_HEADERS;
        const examples = type === 'devotional' ? DEVOTIONAL_EXAMPLES : VERSE_EXAMPLES;

        const data = [headers, ...examples];
        const filename = `sample-daily-${type}-template.${format}`;

        if (format === 'csv') {
            const csvRows = data.map(row =>
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            );
            const csvContent = csvRows.join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                }
            });
        } else {
            const ws = XLSX.utils.aoa_to_sheet(data);

            // Style header row (bold)
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
                if (ws[cellAddress]) {
                    ws[cellAddress].s = { font: { bold: true } };
                }
            }

            // Set column widths
            ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, type === 'devotional' ? 'Devotionals' : 'Daily Verses');

            const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            return new NextResponse(xlsxBuffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                }
            });
        }
    } catch (error: any) {
        console.error('Sample template error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
