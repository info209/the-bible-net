"use client";

import { Home, Book, BookOpen, Compass } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface BottomNavProps {
  isVisible?: boolean;
  onNavigate?: (page: 'home' | 'bible' | 'library' | 'explore') => void;
}

export default function BottomNav({ isVisible = true, onNavigate }: BottomNavProps) {
  const pathname = usePathname();
  const isBiblePage = pathname?.startsWith('/bible') || false;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'bible', label: 'Bible', icon: Book, path: '/bible' },
    { id: 'library', label: 'Library', icon: BookOpen, path: '/library' },
    { id: 'explore', label: 'Explore', icon: Compass, path: '/explore' },
  ];

  return (
    <div
      className={`fixed left-0 right-0 bottom-0 z-[100] glass-ios transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
    >
      <div className="max-w-3xl mx-auto pb-safe">
        <div className="flex items-center justify-around h-16 sm:h-20">
          {navItems.map((item) => {
            const isActive = (pathname as string) === item.path || (item.id === 'bible' && isBiblePage);
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate?.(item.id as any)}
                whileHover={{ y: -4, scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className="relative flex flex-col items-center justify-center gap-1 transition-all outline-none"
              >
                <div className={`relative p-2.5 rounded-2xl transition-all duration-500 ${isActive ? 'bg-[#41ADB0] text-white shadow-lg shadow-[#41ADB0]/20' : 'text-gray-500 hover:text-gray-800'
                  }`}>
                  <Icon className={`size-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                </div>
                <span className={`text-[10px] font-bold tracking-tight uppercase transition-all duration-300 ${isActive ? 'text-[#41ADB0] opacity-100' : 'text-gray-400 opacity-60'
                  }`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
