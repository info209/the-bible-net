import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user';
import { UserRepository } from '@/repositories/user/userRepository';
import { LoggingService } from '@/services/loggingService';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const { id } = await params;

    const isAdmin = session?.user?.role === UserRole.SUPER_ADMIN || session?.user?.role === UserRole.SUB_ADMIN;

    if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const userToDeactivate = await UserRepository.findById(id);
        if (!userToDeactivate) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        // SUB_ADMIN cannot deactivate other admins or SUPER_ADMIN
        if (session?.user?.role === UserRole.SUB_ADMIN) {
            if (userToDeactivate.role !== UserRole.USER) {
                return NextResponse.json({ error: 'Sub-admins can only deactivate regular users' }, { status: 403 });
            }
        }

        const updated = await UserRepository.update(id, { isActive: false });

        await LoggingService.logAdminAction({
            adminId: session!.user.id,
            action: 'DEACTIVATE_USER',
            details: `Deactivated user ID: ${id} (${userToDeactivate.email})`,
        });

        return NextResponse.json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
