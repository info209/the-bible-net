import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';
import { DailyContentRepository } from '@/repositories/dailyContentRepository';
import { isLeapYear, getTotalDaysInYear, getMissingDates } from '@/services/bulkImportService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/daily-content/coverage?year=2026
 * Returns yearly verse coverage statistics.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

        if (isNaN(year) || year < 2000 || year > 2100) {
            return NextResponse.json({ success: false, error: 'Invalid year. Use a 4-digit year between 2000 and 2100.' }, { status: 400 });
        }

        const leap = isLeapYear(year);
        const totalSlots = getTotalDaysInYear(year);
        const configuredDates = await DailyContentRepository.getCoverageForYear(year);
        const missingDates = getMissingDates(year, configuredDates);

        return NextResponse.json({
            success: true,
            data: {
                year,
                isLeapYear: leap,
                totalSlots,
                configured: configuredDates.length,
                configuredDates,
                missingCount: missingDates.length,
                missingDates,
                percentComplete: Math.round((configuredDates.length / totalSlots) * 100),
            }
        });
    } catch (error: any) {
        console.error('Coverage API error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
