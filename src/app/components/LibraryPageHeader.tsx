'use client';

import { ArrowLeft } from 'lucide-react';

interface LibraryPageHeaderProps {
  title: string;
  onBack: () => void;
}

export default function LibraryPageHeader({ title, onBack }: LibraryPageHeaderProps) {
  return (
    <header className="px-4 pt-4 pb-5 flex items-center bg-[#F4F8F8] dark:bg-[#0D0D0D] sticky top-0 z-30">
      <button
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={onBack}
        className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-gray-200/50 dark:active:bg-white/[0.06] transition-colors cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-[#111111] dark:text-white" strokeWidth={2} />
      </button>
      <h1 className="ml-2 text-[18px] font-[600] leading-[24px] text-[#111111] dark:text-white">
        {title}
      </h1>
    </header>
  );
}
