// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Bible App',
  description: 'Next.js + Tailwind setup',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
