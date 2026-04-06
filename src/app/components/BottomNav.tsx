"use client";

import { Home, Compass } from 'lucide-react';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { usePathname } from 'next/navigation';

interface BottomNavProps {
  isVisible?: boolean;
  onNavigate?: (page: 'home' | 'bible' | 'library' | 'explore') => void;
}

export default function BottomNav({ isVisible = true, onNavigate }: BottomNavProps) {
  const pathname = usePathname();
  const isBiblePage = pathname?.startsWith('/bible') || pathname?.startsWith('/bible2') || false;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'bible', label: 'Bible', icon: BiBible, path: '/bible' },
    { id: 'library', label: 'Library', icon: LuLibraryBig, path: '/library' },
    { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  ];

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-20 glass-medium border-t border-white/30 shadow-[0_-1px_0_0_rgba(255,255,255,0.5),0_-2px_8px_0_rgba(0,0,0,0.04)] transition-all duration-700 ease-in-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
      }`}
    >
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = (pathname as string) === item.path || (item.id === 'bible' && isBiblePage);
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.id as any)}
                className="flex flex-col items-center gap-1 transition-colors min-w-[60px]"
              >
                <div className={`p-2 rounded-full transition-all ${isActive ? 'bg-[var(--color-primary-teal)]/10' : ''}`}>
                  <Icon className={`size-6 ${isActive ? 'text-[var(--color-primary-teal)]' : 'text-gray-500'}`} />
                </div>
                <span className={`text-xs ${isActive ? 'text-[var(--color-primary-teal)]' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
