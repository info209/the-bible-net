import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { BibleVersion } from '@/models/Bible';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const version = await BibleVersion.findById(params.id).lean();
        if (!version) {
            return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: version });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const success = await BibleService.deleteVersion(params.id);
        if (!success) {
            return NextResponse.json({ success: false, error: 'Failed to delete version' }, { status: 500 });
        }
        return NextResponse.json({ success: true, message: 'Version deleted successfully.' });
    } catch (error: any) {
        console.error('Delete version error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
