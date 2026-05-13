import { NextResponse } from 'next/server';
import { DailyContent } from '@/models/DailyContent';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();

        const updatedContent = await DailyContent.findByIdAndUpdate(params.id, data, { new: true });
        if (!updatedContent) {
            return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedContent });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Content for this date already exists.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        
        const deletedContent = await DailyContent.findByIdAndDelete(params.id);
        if (!deletedContent) {
            return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: deletedContent });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
