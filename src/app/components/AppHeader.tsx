"use client";

import { Globe, Menu, User, LogIn, UserPlus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProfilePanel from './ProfilePanel';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface AppHeaderProps {
  onMenuOpen?: () => void;
  className?: string;
}

export default function AppHeader({ onMenuOpen, className }: AppHeaderProps) {
  const { data: session } = useSession();
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('profile') === 'true') {
        setIsProfilePanelOpen(true);
        // Clean up the URL parameter without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete('profile');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }, []);

  const navigateTo = (path: string) => {
    router.push(path);
  };

  return (
    <header className={`fixed top-0 left-0 right-[var(--removed-body-scroll-bar-size,0px)] z-50 h-16 glass-teal flex justify-center shadow-sm border-b border-white/10 ${className || ''}`}>
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-8 h-full flex items-center justify-between">

        {/* Logo Section (Left Aligned with Content) */}
        <div className="flex items-center pointer-events-none shrink-0">
          <Link href="/home" className="flex items-center hover:opacity-90 transition-all active:scale-95 pointer-events-auto">
            <img src="/logo.svg" alt="The Bible Net" width={104} height={40} />
          </Link>
        </div>

        {/* Action Buttons (Right Aligned with Content) */}
        <div className="flex justify-end items-center gap-3 text-white">
          {/* Language Selector (disabled – English only) */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 opacity-70 cursor-default pointer-events-none select-none">
            <Globe className="size-4 opacity-90" />
            <span className="text-[14px] font-medium">En</span>
          </div>

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
            <DropdownMenu modal={false}>
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
                    <span>Log in</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo('/auth/register')} className="px-4 py-3 gap-3 cursor-pointer">
                    <UserPlus className="w-4 h-4 text-gray-400" />
                    <span>Create account</span>
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
