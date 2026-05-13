import { NextResponse } from 'next/server';
import { DailyContent } from '@/models/DailyContent';
import { connectDB } from '@/lib/db';
import { adminAuth } from '@/lib/auth/admin';
import { UserRole } from '@/types/user';

export async function GET() {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const content = await DailyContent.find().sort({ date: -1 });
        return NextResponse.json({ success: true, data: content });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await adminAuth();
        if (!session?.user || (session.user.role !== UserRole.SUPER_ADMIN && session.user.role !== UserRole.SUB_ADMIN)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();
        const data = await req.json();

        const newContent = new DailyContent(data);
        await newContent.save();

        return NextResponse.json({ success: true, data: newContent });
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ success: false, error: 'Content for this date already exists.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
