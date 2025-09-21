// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Import AuthProvider
import { AuthProvider } from '../context/AuthProvider';

export const metadata = {
    title: 'Bible App',
    description: 'Next.js + Tailwind setup',
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
        <body className="antialiased">
        <AuthProvider>
            {/* Persistent global audio element for music playback */}
            <audio id="global-audio" style={{ position: 'fixed', left: '-9999px', width: 0, height: 0 }} />
            {children}
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
        </body>
        </html>
    );
}
