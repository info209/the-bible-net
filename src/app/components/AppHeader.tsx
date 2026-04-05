"use client";

import { BookOpen, Globe, Menu, User, LogOut, Settings, UserCircle, LogIn, UserPlus, ChevronDown, BiBible } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import ProfilePanel from './ProfilePanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface AppHeaderProps {
  onMenuOpen?: () => void;
  className?: string;
}

export default function AppHeader({ onMenuOpen, className }: AppHeaderProps) {
  const { data: session } = useSession();
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = useState('en');

  const languages = [
    { code: 'en', name: 'English', label: 'En', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', label: 'Hi', flag: '🇮🇳' },
    { code: 'es', name: 'Español', label: 'Es', flag: '🇪🇸' },
  ];

  // Read locale from cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split('; ');
    const localeCookie = cookies.find(row => row.startsWith('NEXT_LOCALE='));
    if (localeCookie) {
      setCurrentLocale(localeCookie.split('=')[1]);
    }
  }, []);

  const changeLanguage = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    setCurrentLocale(code);
    setIsLangOpen(false);
    router.refresh();
  };

  const handleLogout = async () => {
    await signOut({ 
      callbackUrl: `${window.location.origin}/home`,
      redirect: true 
    });
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-16 glass-teal flex items-center justify-between px-4 sm:px-6 shadow-sm border-b border-white/10 ${className || ''}`}>
      {/* Logo Section */}
      <Link href="/home" className="flex items-center gap-3 hover:opacity-90 transition-all active:scale-95">
        <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
          <BookOpen className="size-6 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-white leading-tight">WordOfLife</h1>
          <span className="text-[10px] font-medium text-white/70 tracking-widest uppercase">The Bible App</span>
        </div>
      </Link>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Language Selector */}
        <Popover open={isLangOpen} onOpenChange={setIsLangOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white cursor-pointer hover:bg-white/20 active:scale-95 transition-all">
              <span className="text-sm font-bold uppercase">{currentLocale.toUpperCase()}</span>
              <ChevronDown className={`size-4 opacity-70 transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-48 rounded-xl border-none bg-white p-0 shadow-2xl overflow-hidden"
          >
            <p className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 border-b border-gray-100">
              Select Language
            </p>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all duration-150 ${
                  currentLocale === lang.code
                    ? 'bg-primary-teal-subtle text-primary-teal font-bold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
                {currentLocale === lang.code && (
                  <div className="w-2 h-2 rounded-full bg-primary-teal" />
                )}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* User Account */}
        {session?.user ? (
          <button 
            onClick={() => setIsProfilePanelOpen(true)}
            className="size-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all"
          >
             {session.user.image ? (
                <img src={session.user.image} alt="User" className="w-6 h-6 rounded-full" />
              ) : (
                <User className="size-5" />
              )}
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="size-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 active:scale-95 transition-all">
                <User className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
                className="w-64 rounded-2xl border-none bg-white p-0 shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900">Welcome</p>
                <p className="text-xs text-gray-500 mt-0.5">Sign in to sync your progress</p>
              </div>
              <DropdownMenuGroup className="py-1.5">
                <DropdownMenuItem onClick={() => navigateTo('/auth/login')} className="px-4 py-3 gap-3 cursor-pointer font-medium">
                  <LogIn className="w-4 h-4 text-primary-teal" />
                  <span>Login</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('/auth/register')} className="px-4 py-3 gap-3 cursor-pointer">
                  <UserPlus className="w-4 h-4 text-gray-400" />
                  <span>Create Account</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={() => onMenuOpen?.()} className="px-4 py-3 gap-3 cursor-pointer">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Floating Menu Toggle (Optional, can be used for sidebar) */}
        <button 
          onClick={onMenuOpen}
          className="size-10 rounded-lg bg-black/10 border border-black/5 flex items-center justify-center text-white/80 hover:bg-black/20 hover:text-white active:scale-95 transition-all"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {session && (
        <ProfilePanel
          isOpen={isProfilePanelOpen}
          onClose={() => setIsProfilePanelOpen(false)}
          session={session}
          onMenuOpen={onMenuOpen}
        />
      )}
    </header>
  );
}
