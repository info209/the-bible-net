"use client";

import { Globe, Menu, User, LogIn, UserPlus, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatusContext } from '@/lib/offline/NetworkStatusContext';
import { usePWA } from '@/components/offline/PWAProvider';
import { toast } from '@/context/ToastContext';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

interface AppHeaderProps {
  onMenuOpen?: () => void;
  className?: string;
}

export default function AppHeader({ onMenuOpen, className }: AppHeaderProps) {
  const { session } = useAuth();
  const { isOnline } = useNetworkStatusContext();
  const { isInstalled, openInstallModal } = usePWA();
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get('profile') === 'true') {
      setIsProfilePanelOpen(true);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('profile');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const checkProfileParam = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('profile') === 'true') {
          setIsProfilePanelOpen(true);
          const url = new URL(window.location.href);
          url.searchParams.delete('profile');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }
      }
    };

    checkProfileParam();
    window.addEventListener('popstate', checkProfileParam);
    const handleOpenProfile = () => {
      setIsProfilePanelOpen(true);
    };
    window.addEventListener('open-profile-drawer', handleOpenProfile);
    return () => {
      window.removeEventListener('popstate', checkProfileParam);
      window.removeEventListener('open-profile-drawer', handleOpenProfile);
    };
  }, []);

  const navigateTo = (path: string) => {
    if (!isOnline && (path.startsWith('/auth/login') || path.startsWith('/auth/register'))) {
      toast.info('Sign in requires an internet connection.');
      return;
    }
    router.push(path);
  };

  const isStatic = className?.includes('!static');

  return (
    <>
      <header
        style={isStatic ? { marginTop: 'var(--offline-banner-total-height, 0px)' } : { top: 'var(--offline-banner-total-height, 0px)' }}
        className={`fixed left-0 right-[var(--removed-body-scroll-bar-size,0px)] z-50 h-16 glass-teal flex justify-center shadow-sm border-b border-white/10 transition-[top,margin-top] duration-250 ease-out ${className || ''}`}
      >
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
                aria-label="Open profile menu"
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
                  <button
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/30 cursor-pointer hover:bg-white/10 active:scale-95 transition-all"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="size-[18px] opacity-90" />
                    <User className="size-[18px] opacity-90 text-white" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-64 rounded-lg border-none bg-white p-0 shadow-2xl overflow-hidden"
                >
                  <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900">Welcome</p>
                    <p className="text-xs text-gray-500 mt-0.5">Explore Bible Net</p>
                  </div>
                  <DropdownMenuGroup className="py-1.5">
                    <DropdownMenuItem onClick={() => navigateTo('/auth/login')} className="px-4 py-3 gap-3 cursor-pointer font-medium">
                      <LogIn className="w-4 h-4 text-primary-teal" />
                      <span>Log in</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigateTo('/auth/register')} className="px-4 py-3 gap-3 cursor-pointer">
                      <UserPlus className="w-4 h-4 text-primary-teal" />
                      <span>Create account</span>
                    </DropdownMenuItem>
                    {!isInstalled && (
                      <>
                        <DropdownMenuSeparator className="my-1 bg-gray-100" />
                        <DropdownMenuItem onClick={() => openInstallModal()} className="px-4 py-3 gap-3 cursor-pointer">
                          <Download className="w-4 h-4 text-primary-teal" />
                          <span>Install app</span>
                        </DropdownMenuItem>
                      </>
                    )}
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
            session={session as any}
            onMenuOpen={onMenuOpen}
          />
        )}
      </header>
    </>
  );
}
