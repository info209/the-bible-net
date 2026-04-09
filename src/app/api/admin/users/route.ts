import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth-helpers';
import { AdminService } from '@/services/admin/adminService';
import { UserRole } from '@/types/user';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: List regular users (Admin only)
 *     description: Retrieve a filtered and paginated list of all non-admin users. Restricted to Super Admins and Sub Admins.
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *         description: Filter by user country
 *       - in: query
 *         name: language
 *         schema: { type: string }
 *         description: Filter by preferred language
 *       - in: query
 *         name: version
 *         schema: { type: string }
 *         description: Filter by preferred Bible version
 *       - in: query
 *         name: dateStart
 *         schema: { type: string, format: date }
 *         description: Filter by registration start date (YYYY-MM-DD)
 *       - in: query
 *         name: dateEnd
 *         schema: { type: string, format: date }
 *         description: Filter by registration end date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Users per page
 *     responses:
 *       200:
 *         description: Successfully retrieved user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *                 total: { type: number }
 *                 page: { type: number }
 *                 limit: { type: number }
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getAdminSession();

        if (!session) {
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
