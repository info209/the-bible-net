"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LogOut,
  Camera,
  Pencil,
  Bookmark,
  FileText,
  Highlighter,
  Heart,
  MessageCircle,
  BookMarked,
  Zap,
  Share2,
  HandHeart,
  Settings,
  Globe,
} from 'lucide-react';
import type { Session } from 'next-auth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import bannerBible from '@/../assets/images/banner_bible.jpg';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onMenuOpen?: () => void;
}

const gridItems = [
  { icon: Bookmark, label: 'Saved', route: '/saved' },
  { icon: FileText, label: 'Notes', route: '/notes' },
  { icon: Highlighter, label: 'Highlights', route: '/highlights' },
  { icon: Heart, label: 'Likes', route: '/likes' },
  { icon: MessageCircle, label: 'Comment', route: '/comments' },
  { icon: BookMarked, label: 'Journals\n& Prayers', route: '/journals' },
  { icon: Zap, label: 'Streaks', route: '/streaks' },
  { icon: Share2, label: 'Share', route: '/share' },
  { icon: HandHeart, label: 'Support', route: '/support' },
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return 'ME';
}

export default function ProfilePanel({ isOpen, onClose, session, onMenuOpen }: ProfilePanelProps) {
  const router = useRouter();
  const user = session?.user;
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const initials = getInitials(user?.name, user?.email);
  const fullName = user?.name ?? user?.email ?? 'User';

  const handleLogout = async () => {
    onClose();
    await signOut({ callbackUrl: `${window.location.origin}/home`, redirect: true });
  };

  const handleNav = useCallback((route: string) => {
    onClose();
    router.push(route);
  }, [onClose, router]);

  const handleSettingsClick = () => {
    setShowSettingsMenu(prev => !prev);
  };

  useEffect(() => {
    if (!isOpen) setShowSettingsMenu(false);
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full max-w-none sm:max-w-sm p-0 border-none [&>[data-slot=sheet-close]]:hidden flex flex-col h-full"
      >
        {/* Visually hidden title for accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>Profile</SheetTitle>
          <SheetDescription>Your profile and quick actions</SheetDescription>
        </SheetHeader>

        {/* ─── Hero Banner ─── */}
        <div 
          className="relative h-44 flex-shrink-0 bg-cover bg-center bg-no-repeat overflow-hidden"
          style={{ backgroundImage: `url(${bannerBible.src})` }}
        >
          {/* Gradient overlay to ensure text contrast for interactive buttons */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />
          
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-10 flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
          >
            <span className="text-sm font-medium">← Back</span>
          </button>
        </div>
        <div className="flex flex-col items-center -mt-10 px-4 pb-2 flex-shrink-0">
          <div className="relative">
            {user?.image ? (
              <img
                src={user.image}
                alt={fullName}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-[#f0d6e8] flex items-center justify-center">
                <span className="text-[#6d2c5e] text-2xl font-bold tracking-wide">{initials}</span>
              </div>
            )}

            {/* Camera badge */}
            <button
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Change photo"
              onClick={() => {/* future: open image picker */ }}
            >
              <Camera className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>

          {/* Name */}
          <h2 className="mt-3 text-lg font-bold text-gray-900 text-center">{fullName}</h2>

          {/* Edit Profile */}
          <button
            onClick={() => handleNav('/auth/profile-setup')}
            className="mt-0.5 flex items-center gap-1 text-sm text-gray-400 hover:text-[var(--color-primary-teal)] transition-colors"
          >
            <Pencil className="w-3 h-3" />
            <span>Edit profile</span>
          </button>
        </div>

        <Separator className="bg-gray-100" />

        {/* ─── Scrollable body ─── */}
        <ScrollArea className="flex-1 px-4 pt-3 pb-6">
          <div className="space-y-4">
            {/* 3×3 Grid */}
            <div className="bg-[#f4f8f8] rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-3">
                {gridItems.map(({ icon: Icon, label, route }) => (
                  <button
                    key={label}
                    onClick={() => handleNav(route)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white hover:shadow-sm active:scale-95 transition-all duration-150"
                  >
                    <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--color-primary-teal)]" strokeWidth={1.7} />
                    </div>
                    <span className="text-[11px] font-medium text-gray-600 text-center leading-tight whitespace-pre-line">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings & Language row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSettingsClick}
                aria-expanded={showSettingsMenu}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
              >
                <Settings className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.8} />
                <span className="text-sm font-medium text-gray-700">Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {/* future: open language modal */ }}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
              >
                <Globe className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.8} />
                <span className="text-sm font-medium text-gray-700">Language</span>
              </button>
            </div>

            {showSettingsMenu && (
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-2 shadow-sm">
                {onMenuOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onMenuOpen();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-white active:scale-[0.98] transition-all duration-150"
                  >
                    <span className="text-sm font-semibold">App Settings</span>
                    <Settings className="w-4 h-4 text-gray-500" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 active:scale-[0.98] transition-all duration-150"
                >
                  <span className="text-sm font-semibold">Logout</span>
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
