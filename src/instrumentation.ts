// import { initializeDB } from './lib/db';

/**
 * Instrumentation file for Next.js
 * This runs once when the server starts
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Dynamic import to prevent bundling mongoose in edge/client
        const { initializeDB } = await import('@/lib/db');
        await initializeDB();
    }
}
