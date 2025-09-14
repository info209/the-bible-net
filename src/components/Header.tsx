// src/components/Header.tsx
'use client';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="bg-white w-full">
      <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
        {/* teal rounded rectangle behind logo (Figma-like badge) */}
        <div className="rounded-md w-[104px] h-[40px] flex items-center justify-center bg-gradient-to-r from-teal-400 to-teal-500 shadow-sm overflow-hidden">
          <Image
            src="/logo.jpg"
            alt="App logo"
            width={88}
            height={28}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>
        {/* Desktop-only right controls */}
        <div className="flex items-center gap-3 text-[rgba(49,57,58,0.8)]">
          <div className="text-sm">En</div>
          <button aria-label="locale" className="w-8 h-8 flex items-center justify-center">🌐</button>
          <button aria-label="menu" className="w-8 h-8 flex items-center justify-center">≡</button>
        </div>
      </div>
    </header>
  );
}
