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
            {children}
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
        </body>
        </html>
    );
}
