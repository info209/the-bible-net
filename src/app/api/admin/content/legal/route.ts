import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legalService';
import { getAdminSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const data = await LegalService.getAllLegalContent();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Admin fetch legal error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const content = await LegalService.upsertLegalContent(body);
        return NextResponse.json({ success: true, data: content });
    } catch (error: any) {
        console.error('Admin upsert legal error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
