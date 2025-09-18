// src/app/api/auth/sessionLogout/route.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { serialize, parse } from 'cookie';

export async function POST(req: NextRequest) {
    try {
        const cookieName = process.env.FIREBASE_AUTH_COOKIE_NAME || '__session';
        const cookieHeader = req.headers.get('cookie') || '';
        const cookies = parse(cookieHeader || '');
        const sessionCookie = cookies[cookieName];

        const clearCookie = serialize(cookieName, '', {
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
        });

        if (sessionCookie) {
            try {
                const decoded = await adminAuth.verifySessionCookie(sessionCookie);
                await adminAuth.revokeRefreshTokens(decoded.uid);
            } catch (e) {
                console.warn('Could not verify session cookie for revoke', e);
            }
        }

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Set-Cookie': clearCookie, 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('sessionLogout error', err);
        return new Response(JSON.stringify({ error: err?.message || 'Unknown' }), { status: 500 });
    }
}
