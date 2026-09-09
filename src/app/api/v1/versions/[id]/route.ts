import { NextRequest, NextResponse } from 'next/server';
import { BibleService } from '@/services/bibleService';
import { BibleVersion } from '@/models/Bible';
import { z } from 'zod';

const UpdateBibleVersionSchema = z.object({
    name: z.string().min(1, 'Version name is required').max(100, 'Version name cannot exceed 100 characters').optional(),
    abbreviation: z.string().min(1, 'Abbreviation is required').max(10, 'Abbreviation cannot exceed 10 characters').regex(/^[A-Za-z0-9]+$/, 'Abbreviation must be alphanumeric').optional(),
    language: z.string().regex(/^[A-Za-z]{2,3}$/, 'Language must be a 2 or 3 letter ISO code').optional(),
    copyright: z.string().max(500, 'Copyright notice cannot exceed 500 characters').optional(),
    licenseType: z.enum(['public-domain', 'licensed', 'proprietary', 'unknown']).optional(),
    status: z.enum(['active', 'inactive', 'importing', 'failed']).optional(),
    isActive: z.boolean().optional(),
});

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

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const parseResult = UpdateBibleVersionSchema.safeParse(body);
        if (!parseResult.success) {
            return NextResponse.json(
                { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' },
                { status: 400 }
            );
        }

        const updatedVersion = await BibleService.updateVersion(params.id, parseResult.data);
        return NextResponse.json({
            success: true,
            data: updatedVersion,
            message: 'Version updated successfully.'
        });
    } catch (error: any) {
        console.error('Update version error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update version' },
            { status: error.message === 'Bible version not found' ? 404 : 400 }
        );
    }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
    return PUT(req, ctx);
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
