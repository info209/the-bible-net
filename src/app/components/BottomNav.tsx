"use client";

import { Home, Compass } from 'lucide-react';
import { BiBible } from 'react-icons/bi';
import { LuLibraryBig } from 'react-icons/lu';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

interface BottomNavProps {
  isVisible?: boolean;
  onNavigate?: (page: 'home' | 'bible' | 'library' | 'explore') => void;
}

const isBibleReadingRoute = (path?: string | null) => path === '/bible' || path?.startsWith('/bible/') || false;

export default function BottomNav({ isVisible = true, onNavigate }: BottomNavProps) {
  const pathname = usePathname();
  const isBiblePage = isBibleReadingRoute(pathname);
  const [theme, setTheme] = useState<'light' | 'sepia' | 'cream' | 'dark'>('light');

  useEffect(() => {
    if (!isBiblePage) return;
    const updateTheme = () => {
      const savedTheme = (localStorage.getItem('bible-reader-theme') as any) || 'light';
      setTheme(savedTheme);
    };
    updateTheme();

    const handleThemeChange = (e: any) => {
      if (e.detail?.theme) {
        setTheme(e.detail.theme);
      } else {
        updateTheme();
      }
    };

    window.addEventListener('bible-theme-change', handleThemeChange);
    window.addEventListener('storage', updateTheme);
    return () => {
      window.removeEventListener('bible-theme-change', handleThemeChange);
      window.removeEventListener('storage', updateTheme);
    };
  }, [isBiblePage]);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'bible', label: 'Bible', icon: BiBible, path: '/bible' },
    { id: 'library', label: 'Library', icon: LuLibraryBig, path: '/library' },
    { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  ];

  const themeNavStyle = isBiblePage ? {
    light: 'bg-white/95 backdrop-blur-xl border-t border-gray-200/80',
    sepia: 'bg-[#F7EFED]/95 backdrop-blur-xl border-t border-[#e2d5d2]',
    cream: 'bg-[#FEF6EB]/95 backdrop-blur-xl border-t border-[#e8dcca]',
    dark: 'bg-[#1c1c1e]/95 backdrop-blur-xl border-t border-[#2c2c2e]'
  }[theme] : 'glass-medium border-t border-white/30 shadow-[0_-1px_0_0_rgba(255,255,255,0.5),0_-2px_8px_0_rgba(0,0,0,0.04)]';

  const activeBadgeStyle = isBiblePage
    ? (theme === 'dark' ? 'bg-teal-500/20' : 'bg-[var(--color-primary-teal)]/10')
    : 'bg-[var(--color-primary-teal)]/10';

  const activeTextColor = isBiblePage
    ? (theme === 'dark' ? 'text-teal-400' : 'text-[var(--color-primary-teal)]')
    : 'text-[var(--color-primary-teal)]';

  const inactiveColor = isBiblePage
    ? {
        light: 'text-gray-500',
        sepia: 'text-[#7d6855]',
        cream: 'text-[#6e5f46]',
        dark: 'text-gray-400'
      }[theme]
    : 'text-gray-500';

  return (
    <div 
      data-bottom-nav="true"
      className={`fixed bottom-0 left-0 right-0 z-20 ${themeNavStyle} transition-all duration-700 ease-in-out ${
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
                <div className={`p-2 rounded-full transition-all ${isActive ? activeBadgeStyle : ''}`}>
                  <Icon className={`size-6 ${isActive ? activeTextColor : inactiveColor}`} />
                </div>
                <span className={`text-xs ${isActive ? activeTextColor : inactiveColor}`}>
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
