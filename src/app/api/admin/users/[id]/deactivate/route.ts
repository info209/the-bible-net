import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@/types/user';
import { UserRepository } from '@/repositories/user/userRepository';
import { LoggingService } from '@/services/loggingService';

/**
 * @swagger
 * /api/admin/users/{id}/deactivate:
 *   put:
 *     summary: Deactivate a user (Admin only)
 *     description: Set a user's status to inactive. Super Admins can deactivate anyone; Sub-admins can only deactivate regular users.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The ID of the user to deactivate
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: User deactivated successfully }
 *       403:
 *         description: Forbidden - Admin access required or insufficient permissions
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       400:
 *         description: Error deactivating user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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
            adminId: session!.user.id as string,
            action: 'DEACTIVATE_USER',
            details: `Deactivated user ID: ${id} (${userToDeactivate.email})`,
        });

        return NextResponse.json({ message: 'User deactivated successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
