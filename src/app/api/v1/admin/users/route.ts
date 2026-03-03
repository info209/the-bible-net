import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AdminService } from '@/services/admin/adminService';
import { UserRole } from '@/models/User';

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: language
 *         schema: { type: string }
 *       - in: query
 *         name: version
 *         schema: { type: string }
 *       - in: query
 *         name: dateStart
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateEnd
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        const isAdmin = session?.user?.role === UserRole.SUPER_ADMIN || session?.user?.role === UserRole.SUB_ADMIN;

        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Admins only.' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const country = searchParams.get('country') || undefined;
        const preferredLanguage = searchParams.get('language') || undefined;
        const preferredBibleVersion = searchParams.get('version') || undefined;
        const registrationDateStart = searchParams.get('dateStart') || undefined;
        const registrationDateEnd = searchParams.get('dateEnd') || undefined;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');

        const result = await AdminService.listUsers(
            { country, preferredLanguage, preferredBibleVersion, registrationDateStart, registrationDateEnd },
            { page, limit }
        );

        return NextResponse.json({
            success: true,
            data: result.users,
            total: result.total,
            page,
            limit,
        });
    } catch (error: any) {
        console.error('Admin user listing error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
