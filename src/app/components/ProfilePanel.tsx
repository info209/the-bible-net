"use client";

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onMenuOpen?: () => void;
}

const gridItems = [
  { icon: Bookmark,       label: 'Saved',              route: '/saved' },
  { icon: FileText,       label: 'Notes',               route: '/notes' },
  { icon: Highlighter,    label: 'Highlights',          route: '/highlights' },
  { icon: Heart,          label: 'Likes',               route: '/likes' },
  { icon: MessageCircle,  label: 'Comment',             route: '/comments' },
  { icon: BookMarked,     label: 'Journals\n& Prayers', route: '/journals' },
  { icon: Zap,            label: 'Streaks',             route: '/streaks' },
  { icon: Share2,         label: 'Share',               route: '/share' },
  { icon: HandHeart,      label: 'Support',             route: '/support' },
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

  const initials  = getInitials(user?.name, user?.email);
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';
  const lastName  = user?.name?.trim().split(/\s+/).slice(1).join(' ') ?? '';
  const fullName  = user?.name ?? user?.email ?? 'User';

  // ESC key close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await signOut({ callbackUrl: `${window.location.origin}/home`, redirect: true });
  };

  const handleNav = useCallback((route: string) => {
    onClose();
    router.push(route);
  }, [onClose, router]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 z-[101] h-full w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ─── Hero Banner ─── */}
            <div className="relative h-44 bg-gradient-to-br from-[#41ADB0] via-[#319ea1] to-[#1d7e82] flex-shrink-0">
              {/* Back */}
              <button
                onClick={onClose}
                className="absolute top-4 left-4 flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
                <span className="text-sm font-medium">Back</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="absolute top-4 right-4 flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
              >
                <span className="text-sm font-medium">Logout</span>
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* ─── Avatar (overlaps hero) ─── */}
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
                  onClick={() => {/* future: open image picker */}}
                >
                  <Camera className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>

              {/* Name */}
              <h2 className="mt-3 text-lg font-bold text-gray-900 text-center">{fullName}</h2>

              {/* Edit Profile */}
              <button
                onClick={() => handleNav('/auth/profile-setup')}
                className="mt-0.5 flex items-center gap-1 text-sm text-gray-400 hover:text-[#41ADB0] transition-colors"
              >
                <Pencil className="w-3 h-3" />
                <span>Edit profile</span>
              </button>
            </div>

            {/* ─── Scrollable body ─── */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-4">

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
                        <Icon className="w-5 h-5 text-[#41ADB0]" strokeWidth={1.7} />
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
                  onClick={() => {
                    onClose();
                    onMenuOpen?.();
                  }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
                >
                  <Settings className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.8} />
                  <span className="text-sm font-medium text-gray-700">Settings</span>
                </button>

                <button
                  onClick={() => {/* future: open language modal */}}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
                >
                  <Globe className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.8} />
                  <span className="text-sm font-medium text-gray-700">Language</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
