// src/components/FooterNav.tsx
'use client';
import Link from 'next/link';

export default function FooterNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white shadow-lg">
      <div className="max-w-3xl mx-auto h-full px-4 flex items-center justify-between">
        <Link href="/" className="flex flex-col items-center text-[rgba(49,57,58,0.4)]">
          <span className="text-2xl">🏠</span>
          <span className="text-xs mt-1">Home</span>
        </Link>

        <Link href="/reader" className="flex flex-col items-center text-[#006A6F]">
          <span className="text-2xl">
            {/* Reading icon: open book */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6.5V18a2 2 0 0 0 2 2c2.5 0 4.5-1 7-1s4.5 1 7 1a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2c-2.5 0-4.5 1-7 1s-4.5-1-7-1a2 2 0 0 0-2 2z" stroke="#009CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M12 7.5v13" stroke="#009CA6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="text-xs mt-1">Bible</span>
        </Link>

        <Link href="/library" className="flex flex-col items-center text-[rgba(49,57,58,0.4)]">
          <span className="text-2xl">📚</span>
          <span className="text-xs mt-1">Library</span>
        </Link>

        <Link href="/discover" className="flex flex-col items-center text-[rgba(49,57,58,0.4)]">
          <span className="text-2xl">🔍</span>
          <span className="text-xs mt-1">Discover</span>
        </Link>
      </div>
    </nav>
  );
}
