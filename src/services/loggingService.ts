import { AdminLog } from '@/models/AdminLog';
import { headers } from 'next/headers';

export class LoggingService {
    static async logAdminAction(data: {
        adminId: string;
        action: string;
        details?: string;
    }) {
        try {
            const headersList = await headers();
            const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
            const userAgent = headersList.get('user-agent') || 'unknown';

            await AdminLog.create({
                adminId: data.adminId,
                action: data.action,
                details: data.details,
                ipAddress,
                userAgent,
            });
        } catch (error) {
            console.error('Failed to log admin action:', error);
            // Don't throw, we don't want to break the main flow if logging fails
        }
    }
}
