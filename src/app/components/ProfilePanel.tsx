"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/context/ToastContext';
import { signOut, useSession } from 'next-auth/react';
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
  ChevronLeft,
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

// Sub-page components
import LikesPage from './LikesPage';
import SavedPage from './SavedPage';
import NotesPage from './NotesPage';
import HighlightsPage from './HighlightsPage';
import CommentsPage from './CommentsPage';
import ComingSoonPage from './ComingSoonPage';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onMenuOpen?: () => void;
}

type ProfileView =
  | null
  | 'likes'
  | 'saved'
  | 'notes'
  | 'highlights'
  | 'comments'
  | 'journals'
  | 'streaks'
  | 'share'
  | 'support';

const gridItems: Array<{
  icon: React.ElementType;
  label: string;
  view: ProfileView;
}> = [
  { icon: Bookmark,      label: 'Saved',              view: 'saved'      },
  { icon: FileText,      label: 'Notes',              view: 'notes'      },
  { icon: Highlighter,   label: 'Highlights',         view: 'highlights' },
  { icon: Heart,         label: 'Likes',              view: 'likes'      },
  { icon: MessageCircle, label: 'Comment',            view: 'comments'   },
  { icon: BookMarked,    label: 'Journals\n& Prayers', view: 'journals'   },
  { icon: Zap,           label: 'Streaks',            view: 'streaks'    },
  { icon: Share2,        label: 'Share',              view: 'share'      },
  { icon: HandHeart,     label: 'Support',            view: 'support'    },
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

// ─── Animated skeleton shimmer ─────────────────────────────────────────────
function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] animate-[shimmer_1.4s_ease-in-out_infinite] ${className ?? ''}`}
      style={style}
    />
  );
}

// Labels for sub-view header titles
const VIEW_LABELS: Record<Exclude<ProfileView, null>, string> = {
  likes:      'Likes',
  saved:      'Saved',
  notes:      'Notes',
  highlights: 'Highlights',
  comments:   'Comments',
  journals:   'Journals & Prayers',
  streaks:    'Streaks',
  share:      'Share',
  support:    'Support',
};

// Which views show ComingSoon (undeveloped features)
const COMING_SOON_VIEWS: ProfileView[] = ['streaks', 'share', 'support'];

export default function ProfilePanel({ isOpen, onClose, session, onMenuOpen }: ProfilePanelProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const user = session?.user;
  const [activeView, setActiveView] = useState<ProfileView>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('isPrivate', 'false');

      const uploadRes = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.success) {
        throw new Error(uploadData.error || 'Failed to upload image');
      }

      const imageUrl = uploadData.url;

      const profileRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageUrl }),
      });
      const profileData = await profileRes.json();

      if (!profileRes.ok || !profileData.success) {
        throw new Error(profileData.error || 'Failed to update avatar in profile');
      }

      if (updateSession) {
        await updateSession({
          user: {
            ...session.user,
            image: imageUrl,
          },
        });
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Avatar upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const initials = getInitials(user?.name, user?.email);
  const fullName = user?.name ?? user?.email ?? 'User';

  const handleLogout = async () => {
    setActiveView(null);
    onClose();
    await signOut({ callbackUrl: `${window.location.origin}/home`, redirect: true });
  };

  const handleClose = () => {
    setActiveView(null);
    onClose();
  };

  const handleOpenView = (view: ProfileView) => {
    // Journals & Prayers navigates to its own full-page module.
    // We intentionally keep the drawer open so the browser history retains
    // the correct state — back button on journals returns here via ?source=profile.
    if (view === 'journals') {
      router.push('/journals?source=profile');
      return;
    }
    setActiveView(view);
  };

  const handleBackToMenu = () => {
    setActiveView(null);
  };

  // Render the content for the active sub-view
  const renderSubView = () => {
    if (!activeView) return null;

    // Coming soon pages for undeveloped features
    if (COMING_SOON_VIEWS.includes(activeView)) {
      return (
        <div className="flex-1 overflow-y-auto">
          <ComingSoonPage
            variant="coming-soon"
            title={VIEW_LABELS[activeView]}
            actionLabel="Back to Profile"
            onAction={handleBackToMenu}
          />
        </div>
      );
    }

    // Developed profile pages
    const commonScrollClass = "flex-1 overflow-y-auto";

    switch (activeView) {
      case 'likes':
        return (
          <div className={commonScrollClass}>
            <LikesPage onBack={handleBackToMenu} />
          </div>
        );
      case 'saved':
        return (
          <div className={commonScrollClass}>
            <SavedPage onBack={handleBackToMenu} onClose={handleClose} />
          </div>
        );
      case 'notes':
        return (
          <div className={commonScrollClass}>
            <NotesPage onBack={handleBackToMenu} onClose={handleClose} />
          </div>
        );
      case 'highlights':
        return (
          <div className={commonScrollClass}>
            <HighlightsPage onBack={handleBackToMenu} onClose={handleClose} />
          </div>
        );
      case 'comments':
        return (
          <div className={commonScrollClass}>
            <CommentsPage onBack={handleBackToMenu} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setActiveView(null);
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-none sm:max-w-sm p-0 border-none [&>[data-slot=sheet-close]]:hidden flex flex-col h-full overflow-hidden"
      >
        {/* Visually hidden title for accessibility */}
        <SheetHeader className="sr-only">
          <SheetTitle>Profile</SheetTitle>
          <SheetDescription>Your profile and quick actions</SheetDescription>
        </SheetHeader>

        {/* ── Sub-view: slides in over the menu ── */}
        {activeView !== null ? (
          <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            {renderSubView()}
          </div>
        ) : (
          /* ── Main Profile Menu ── */
          <div className="flex flex-col h-full animate-in slide-in-from-left duration-300">
            {/* ─── Hero Banner ─── */}
            <div
              className="relative h-44 flex-shrink-0 bg-cover bg-center bg-no-repeat overflow-hidden"
              style={{ backgroundImage: `url(${bannerBible.src})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-black/30" />

              <button
                type="button"
                onClick={handleClose}
                className="absolute left-4 top-4 z-10 flex items-center gap-1.5 text-white/90 transition-colors hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back</span>
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
                <input
                  type="file"
                  id="avatar-upload-input"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploading}
                />
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title="Change photo"
                  onClick={() => document.getElementById('avatar-upload-input')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Name */}
              <h2 className="mt-3 text-lg font-bold text-gray-900 text-center">{fullName}</h2>

              {/* Edit Profile */}
              <button
                onClick={() => {
                  handleClose();
                  router.push('/auth/profile-setup');
                }}
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
                    {gridItems.map(({ icon: Icon, label, view }) => (
                      <button
                        key={label}
                        onClick={() => handleOpenView(view)}
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
                    onClick={() => {
                      onClose();
                      onMenuOpen?.();
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
                  >
                    <Settings className="w-4 h-4 text-gray-500" strokeWidth={1.8} />
                    <span className="text-sm font-medium text-gray-700">Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {/* future: open language modal */}}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all duration-150"
                  >
                    <Globe className="w-4 h-4 text-gray-500" strokeWidth={1.8} />
                    <span className="text-sm font-medium text-gray-700">Language</span>
                  </button>
                </div>

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all duration-150 border border-red-100"
                >
                  <LogOut className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-semibold text-red-600">Logout</span>
                </button>
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
