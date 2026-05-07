import { NextRequest, NextResponse } from 'next/server';
import { LegalService } from '@/services/legalService';
import { getAdminSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        // Since upsert handles by type, we can just use that, 
        // but if we want to update by ID specifically:
        const content = await LegalService.upsertLegalContent({ ...body, id: params.id });
        return NextResponse.json({ success: true, data: content });
    } catch (error: any) {
        console.error('Admin update legal error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getAdminSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const success = await LegalService.deleteLegalContent(params.id);
        return NextResponse.json({ success });
    } catch (error: any) {
        console.error('Admin delete legal error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
