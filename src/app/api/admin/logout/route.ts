import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
    const cookieStore = await cookies();
    
    // Clear NextAuth session cookies
    cookieStore.delete('next-auth.session-token');
    cookieStore.delete('__Secure-next-auth.session-token');
    cookieStore.delete('next-auth.csrf-token');
    cookieStore.delete('next-auth.callback-url');

    return NextResponse.json({ message: 'Logged out successfully' });
}
