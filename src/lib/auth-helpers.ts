import { adminAuth } from "./auth/admin";
import { userAuth } from "./auth/user";
import { UserRole } from "@/types/user";
import { Session } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Ensures the session is an Admin session (SUPER_ADMIN or SUB_ADMIN)
 * and verifies it was issued via the ADMIN auth flow.
 */
export async function getAdminSession(): Promise<Session | null> {
    const session = await adminAuth();
    if (session?.user?.sessionType === 'ADMIN' && 
        (session.user.role === UserRole.SUPER_ADMIN || session.user.role === UserRole.SUB_ADMIN)) {
        return session;
    }
    return null;
}

/**
 * Ensures the session is a User session
 * and verifies it was issued via the USER auth flow.
 */
export async function getUserSession(): Promise<Session | null> {
    const session = await userAuth();
    if (session?.user?.sessionType === 'USER' && session.user.role === UserRole.USER) {
        return session;
    }
    return null;
}

/**
 * Returns any available session or identifies as GUEST
 */
export async function getSessionWithType(): Promise<{ session: Session | null, type: 'ADMIN' | 'USER' | 'GUEST' }> {
    const adminSession = await adminAuth();
    if (adminSession?.user?.sessionType === 'ADMIN') {
        return { session: adminSession, type: 'ADMIN' };
    }

    const userSession = await userAuth();
    if (userSession?.user?.sessionType === 'USER') {
        return { session: userSession, type: 'USER' };
    }

    return { session: null, type: 'GUEST' };
}

/**
 * Resolves any valid logged-in session (userAuth, adminAuth, or default NextAuth)
 */
export async function getAnyUserSession(): Promise<{ userId: string; session: Session } | null> {
    try {
        const userSession = await userAuth();
        if (userSession?.user?.id) {
            return { userId: userSession.user.id, session: userSession };
        }
    } catch (e) {}

    try {
        const adminSession = await adminAuth();
        if (adminSession?.user?.id) {
            return { userId: adminSession.user.id, session: adminSession };
        }
    } catch (e) {}

    return null;
}

/**
 * Standardized error response for API routes
 */
export function getErrorResponse(message: string, status: number = 500) {
    return NextResponse.json(
        {
            success: false,
            error: message,
        },
        { status }
    );
}
