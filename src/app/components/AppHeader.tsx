"use client";

import { BookOpen, Globe, Menu, User, LogOut, Settings, UserCircle, ChevronDown, LogIn, UserPlus } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ProfilePanel from './ProfilePanel';

interface AppHeaderProps {
  onMenuOpen?: () => void;
  className?: string;
}

export default function AppHeader({ onMenuOpen, className }: AppHeaderProps) {
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const [currentLocale, setCurrentLocale] = useState('en');

  const languages = [
    { code: 'en', name: 'English', label: 'En', flag: '🇺🇸' },
    { code: 'hi', name: 'हिन्दी', label: 'Hi', flag: '🇮🇳' },
    { code: 'es', name: 'Español', label: 'Es', flag: '🇪🇸' },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    // Get lang from cookie if exists
    const cookies = document.cookie.split('; ');
    const localeCookie = cookies.find(row => row.startsWith('NEXT_LOCALE='));
    if (localeCookie) {
      setCurrentLocale(localeCookie.split('=')[1]);
    }

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const changeLanguage = (code: string) => {
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`;
    setCurrentLocale(code);
    setIsLangOpen(false);
    // Refresh to apply locale
    router.refresh();
  };

  const handleLogout = async () => {
    setIsProfileOpen(false);
    // Explicitly sign out
    await signOut({ 
      callbackUrl: '/home',
      redirect: true 
    });
  };

  const navigateTo = (path: string) => {
    setIsProfileOpen(false);
    router.push(path);
  };

  return (
    <div className={`sticky top-0 z-[50] bg-[#41ADB0] border-b border-black/5 shadow-md px-4 py-4 ${className || ''}`}>
      <div className="max-w-3xl mx-auto flex items-center justify-between">

        {/* Logo / App Name */}
        <Link href="/home" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <BookOpen className="w-6 h-6 text-white" />
          <div>
            <p className="text-white text-sm font-bold leading-tight">
              Holy Bible
            </p>
            <p className="text-white/80 text-[10px] font-medium uppercase tracking-wider leading-tight">
              Your Daily Companion
            </p>
          </div>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-4">
          {/* Language selector */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/30
            hover:bg-white/20 hover:scale-105 active:scale-95
            transition-all duration-200 shadow-sm"
            >
              <span className="text-white text-sm font-bold tracking-tight uppercase">
                {languages.find(l => l.code === currentLocale)?.label || 'En'}
              </span>
              <Globe className={`w-4 h-4 text-white transition-transform duration-500 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Language Dropdown */}
            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden py-2"
                >
                  <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50 mb-1">
                    Select Language
                  </p>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                        currentLocale === lang.code 
                          ? 'bg-[#41ADB0]/5 text-[#41ADB0] font-bold' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg leading-none">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </div>
                      {currentLocale === lang.code && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#41ADB0]" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Navigation */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                if (session?.user) {
                  setIsProfilePanelOpen(true);
                } else {
                  setIsProfileOpen(!isProfileOpen);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/30
            hover:bg-white/10 hover:scale-105 active:scale-95
            transition-all duration-200"
            >
              <Menu className="w-5 h-5 text-white" />
              {session?.user?.image ? (
                <img src={session.user.image} alt="User" className="w-5 h-5 rounded-full border border-white/20" />
              ) : (
                <User className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                >
                  {/* Header Section */}
                  {session?.user ? (
                    <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {session.user.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {session.user.email}
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-4 bg-gray-50/50 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900">
                        Welcome
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Sign in to sync your progress
                      </p>
                    </div>
                  )}

                  <div className="py-2">
                    {/* Public Options */}
                    <button 
                      onClick={() => navigateTo('/bible')}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-[#41ADB0]" />
                      <span>Open Bible</span>
                    </button>

                    {/* Authenticated Only Options */}
                    {session?.user ? (
                      <>
                        <button 
                          onClick={() => navigateTo('/auth/profile-setup')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <UserCircle className="w-4 h-4 text-gray-400" />
                          <span>Profile Setup</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => navigateTo('/auth/login')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium border-l-4 border-transparent hover:border-[#41ADB0]"
                        >
                          <LogIn className="w-4 h-4 text-[#41ADB0]" />
                          <span>Login</span>
                        </button>
                        <button 
                          onClick={() => navigateTo('/auth/register')}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-[#41ADB0]"
                        >
                          <UserPlus className="w-4 h-4 text-gray-400" />
                          <span>Create Account</span>
                        </button>
                      </>
                    )}

                    <button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        onMenuOpen?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>Settings</span>
                    </button>
                  </div>

                  {/* Logout Action (Authenticated Only) */}
                  {session?.user && (
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#d23952] hover:bg-red-50 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Profile Dashboard Panel (authenticated users only) */}
      {session && (
        <ProfilePanel
          isOpen={isProfilePanelOpen}
          onClose={() => setIsProfilePanelOpen(false)}
          session={session}
          onMenuOpen={onMenuOpen}
        />
      )}
    </div>
  );
}