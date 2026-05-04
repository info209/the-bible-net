"use client";

import { Globe, Menu, User, Settings, LogIn, UserPlus } from 'lucide-react';
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

  // Capitalize the first letter for the label
  const localeLabel = currentLocale.charAt(0).toUpperCase() + currentLocale.slice(1);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-16 glass-teal flex justify-center w-full shadow-sm border-b border-white/10 ${className || ''}`}>
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-8 h-full flex items-center justify-between">
        
        {/* Logo Section (Left Aligned with Content) */}
        <div className="flex items-center pointer-events-none shrink-0">
          <Link href="/home" className="flex items-center hover:opacity-90 transition-all active:scale-95 pointer-events-auto">
            <img src="/logo.svg" alt="The Bible Net" width={104} height={40} />
          </Link>
        </div>

        {/* Action Buttons (Right Aligned with Content) */}
        <div className="flex justify-end items-center gap-3 text-white">
        {/* Language Selector */}
        <Popover open={isLangOpen} onOpenChange={setIsLangOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
              <span className="text-[14px] font-medium">{localeLabel}</span>
              <Globe className="size-4 opacity-90" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-48 rounded-xl border-none bg-white p-0 shadow-2xl overflow-hidden"
          >
            <p className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
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

        {/* User Account & Menu */}
        {session?.user ? (
          <button 
            onClick={() => setIsProfilePanelOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30 cursor-pointer hover:bg-white/10 active:scale-95 transition-all"
          >
            <Menu className="size-[18px] opacity-90" />
            <div className="size-[22px] rounded-full overflow-hidden flex items-center justify-center">
              {session.user.image ? (
                <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User className="size-4 opacity-90 text-white" />
              )}
            </div>
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 cursor-pointer hover:bg-white/10 active:scale-95 transition-all">
                <Menu className="size-[18px] opacity-90" />
                <User className="size-[18px] opacity-90 text-white" />
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
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
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

