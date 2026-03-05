import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { isDBConnected } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Health Check API
 * GET /api/v1/health
 * Returns status of the application and database connection
 */
export async function GET(request: NextRequest) {
    const dbStatus = isDBConnected() ? 'connected' : 'disconnected';
    const readyState = mongoose.connection.readyState;

    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const readyStateMap = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized',
    };

    return NextResponse.json({
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
            status: dbStatus,
            readyState: readyState,
            readyStateText: readyStateMap[readyState as keyof typeof readyStateMap] || 'unknown',
        },
        env: {
            nodeEnv: process.env.NODE_ENV,
            hasMongoUri: !!process.env.MONGODB_URI,
        }
    }, {
        status: dbStatus === 'connected' ? 200 : 503
    });
}
