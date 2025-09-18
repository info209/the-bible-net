// src/app/api/auth/sessionLogin/route.ts
import { NextRequest } from 'next/server';
import { adminAuth } from '../../../../lib/firebaseAdmin';
import { serialize } from 'cookie';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const idToken = body?.idToken;
        if (!idToken) return new Response(JSON.stringify({ error: 'Missing idToken' }), { status: 400 });

        const expiresIn = Number(process.env.FIREBASE_AUTH_COOKIE_MAX_AGE) || 5 * 24 * 60 * 60 * 1000; // default 5 days
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const cookieName = process.env.FIREBASE_AUTH_COOKIE_NAME || '__session';
        const cookie = serialize(cookieName, sessionCookie, {
            maxAge: Math.floor(expiresIn / 1000),
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'strict',
        });

        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('sessionLogin error', err);
        return new Response(JSON.stringify({ error: err?.message || 'Unknown' }), { status: 500 });
    }
}
