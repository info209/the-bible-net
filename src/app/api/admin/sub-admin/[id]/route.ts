import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/db';
import { UserRole } from '@/types/user';
import { UserRepository } from '@/repositories/user/userRepository';
import { LoggingService } from '@/services/loggingService';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getAdminSession();
    const { id } = await params;
    
    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await connectDB();
        const body = await req.json();
        const updated = await UserRepository.update(id, body);
        
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await LoggingService.logAdminAction({
            adminId: session.user.id as string,
            action: 'UPDATE_SUB_ADMIN',
            details: `Updated sub-admin ID: ${id}`,
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getAdminSession();
    const { id } = await params;

    if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await connectDB();
        // We deactivate instead of hard delete for audit trails
        const updated = await UserRepository.update(id, { isActive: false });
        
        if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        await LoggingService.logAdminAction({
            adminId: session.user.id as string,
            action: 'DEACTIVATE_SUB_ADMIN',
            details: `Deactivated sub-admin ID: ${id}`,
        });

        return NextResponse.json({ message: 'Sub-admin deactivated' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
