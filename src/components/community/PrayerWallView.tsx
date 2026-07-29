'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Search,
  Filter,
  Users,
  Clock,
  LayoutGrid,
  List as ListIcon,
  X,
  Send,
  Lock,
  Globe,
  UserCheck,
  UserX
} from 'lucide-react';
import { toast } from '@/context/ToastContext';
import { RelativeTimestamp } from '@/components/RelativeTimestamp';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithOfflineCache } from '@/lib/offline';

interface Prayer {
  _id: string;
  text: string;
  userId: {
    firstName: string;
    lastName?: string;
    image?: string;
  };
  anonymous: boolean;
  intercessionCount: number;
  intercessors: string[];
  createdAt: string;
}

export default function PrayerWallView() {
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'newest' | 'trending'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Post Prayer States
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPrayerText, setNewPrayerText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { data: prayers = [], isLoading: loading } = useQuery<Prayer[]>({
    queryKey: ['prayers', filter],
    queryFn: () =>
      fetchWithOfflineCache(`prayers_community_${filter}`, async () => {
        const res = await fetch(`/api/prayers?limit=50&sort=${filter === 'trending' ? 'trending' : 'newest'}`);
        if (!res.ok) throw new Error('Failed to fetch prayers');
        return res.json();
      }),
    staleTime: 30 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const handleIntercede = async (id: string) => {
    if (!session) {
      return;
    }

    const previousPrayers = queryClient.getQueryData<Prayer[]>(['prayers', filter]);
    const userId = (session.user as any)?.id;

    if (previousPrayers && userId) {
      const updated = previousPrayers.map((p) => {
        if (p._id === id) {
          const isInterceding = p.intercessors?.includes(userId);
          const nextIntercessors = isInterceding
            ? p.intercessors.filter((uid) => uid !== userId)
            : [...(p.intercessors || []), userId];
          const nextCount = isInterceding
            ? Math.max(0, p.intercessionCount - 1)
            : p.intercessionCount + 1;
          return {
            ...p,
            intercessors: nextIntercessors,
            intercessionCount: nextCount,
          };
        }
        return p;
      });
      queryClient.setQueryData(['prayers', filter], updated);
    }

    try {
      const res = await fetch(`/api/prayers/${id}/intercede`, {
        method: 'POST',
      });
      if (res.ok) {
        const updatedPrayer = await res.json();
        queryClient.setQueryData<Prayer[]>(['prayers', filter], (prev) => {
          return (prev || []).map((p) => (p._id === id ? updatedPrayer : p));
        });
      } else {
        if (previousPrayers) {
          queryClient.setQueryData(['prayers', filter], previousPrayers);
        }
      }
    } catch (error) {
      console.error('Error interceding:', error);
      if (previousPrayers) {
        queryClient.setQueryData(['prayers', filter], previousPrayers);
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ['prayers'] });
    }
  };

  const handlePostPrayer = async () => {
    if (!newPrayerText.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newPrayerText,
          isPublic,
          anonymous: isAnonymous
        }),
      });

      if (res.ok) {
        setNewPrayerText('');
        setIsAnonymous(false);
        setIsPublic(true);
        setShowPostModal(false);
        queryClient.invalidateQueries({ queryKey: ['prayers'] });
      }
    } catch (error) {
      console.error('Error posting prayer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrayers = prayers.filter(p =>
    p.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (!p.anonymous && p.userId?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f8fafb]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-gray-100 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="size-6 text-gray-700" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Community prayer wall</h1>
              <p className="text-xs text-gray-500 font-medium">Supporting one another in faith</p>
            </div>
          </div>
          <button
            onClick={() => setShowPostModal(true)}
            className="flex items-center space-x-2 bg-[var(--color-primary-teal)] text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-teal-700/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span>Post a Prayer</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prayers or names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-[16px] md:text-sm focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 focus:border-[var(--color-primary-teal)] outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-white border border-gray-200 rounded-xl p-1 flex">
              <button
                onClick={() => setFilter('newest')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'newest' ? 'bg-[#e6f0f1] text-[var(--color-primary-teal)]' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Clock className="size-3.5" />
                <span>Newest</span>
              </button>
              <button
                onClick={() => setFilter('trending')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === 'trending' ? 'bg-[#e6f0f1] text-[var(--color-primary-teal)]' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Filter className="size-3.5" />
                <span>Most Prayed</span>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-1 flex">
              <button
                onClick={() => setLayout('grid')}
                className={`p-1.5 rounded-xl transition-all ${layout === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                onClick={() => setLayout('list')}
                className={`p-1.5 rounded-xl transition-all ${layout === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:bg-gray-50'}`}
              >
                <ListIcon className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Prayer List */}
        {loading ? (
          <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="size-10 bg-gray-200 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-3 w-24 bg-gray-200 rounded" />
                    <div className="h-2 w-16 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-200 rounded" />
                  <div className="h-4 w-5/6 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPrayers.length === 0 ? (
          <div className="bg-white rounded-xl p-20 text-center shadow-lg border border-teal-100/30">
            <div className="bg-teal-50 size-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="size-10 text-[var(--color-primary-teal)] opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No prayers found</h3>
            <p className="text-gray-500 max-w-sm mx-auto">
              Be the light in someone's day. Post a prayer request or search for another term.
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            <AnimatePresence mode="popLayout">
              {filteredPrayers.map((prayer) => (
                <motion.div
                  key={prayer._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all border border-gray-100 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-600">
                      <Share2 className="size-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 mb-4">
                    {!prayer.anonymous && prayer.userId?.image ? (
                      <img
                        src={prayer.userId.image}
                        alt={prayer.userId.firstName || 'User'}
                        className="size-11 rounded-full object-cover ring-2 ring-white shadow-inner"
                      />
                    ) : (
                      <div className="size-11 rounded-full bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white font-extrabold uppercase shadow-inner text-sm ring-2 ring-white">
                        {prayer.anonymous 
                          ? 'A' 
                          : prayer.userId 
                            ? `${prayer.userId.firstName?.[0] || ''}${prayer.userId.lastName?.[0] || ''}`.toUpperCase() || 'U'
                            : 'U'
                        }
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-gray-900 leading-none mb-1">
                        {prayer.anonymous 
                          ? 'Anonymous' 
                          : `${prayer.userId?.firstName || 'User'}${prayer.userId?.lastName?.[0] ? ' ' + prayer.userId.lastName[0] : ''}`
                        }
                      </h4>
                      <RelativeTimestamp
                        date={prayer.createdAt}
                        className="text-[10px] font-bold tracking-wider text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-gray-700 font-medium leading-relaxed text-sm lg:text-base">
                      {prayer.text}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <button
                      onClick={() => handleIntercede(prayer._id)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${prayer.intercessors?.includes((session?.user as any)?.id)
                          ? 'bg-orange-50 text-orange-600 font-bold'
                          : 'bg-teal-50 text-[var(--color-primary-teal)] font-bold hover:bg-teal-100'
                        }`}
                    >
                      <Heart className={`size-4 ${prayer.intercessors?.includes((session?.user as any)?.id) ? 'fill-orange-600' : ''}`} />
                      <span className="text-xs">
                        {prayer.intercessionCount > 0 ? `${prayer.intercessionCount} praying` : 'Pray for this'}
                      </span>
                    </button>

                    <button className="flex items-center space-x-1.5 text-gray-400 hover:text-gray-600 font-bold transition-all">
                      <MessageCircle className="size-4" />
                      <span className="text-xs">Amen</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Post Prayer Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="sm:max-w-lg p-0 border-none bg-transparent shadow-none [&>[data-slot=dialog-close]]:hidden">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl overflow-hidden shadow-2xl"
          >
            <DialogHeader className="p-6 pb-2 flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center space-x-3">
                <div className="bg-teal-50 p-2.5 rounded-2xl">
                  <Plus className="size-6 text-[var(--color-primary-teal)]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Post a Prayer</DialogTitle>
                  <DialogDescription className="text-xs font-medium text-gray-500 italic">Share your request with the community</DialogDescription>
                </div>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="size-5 text-gray-400" />
              </button>
            </DialogHeader>

            <div className="p-6 pt-4 space-y-6">
              <div className="relative">
                <textarea
                  value={newPrayerText}
                  onChange={(e) => setNewPrayerText(e.target.value)}
                  placeholder="What would you like the community to pray for?"
                  className="w-full bg-gray-50/50 rounded-xl p-4 text-gray-800 placeholder:text-gray-400 outline-none ring-2 ring-transparent focus:ring-[var(--color-primary-teal)]/20 focus:bg-white transition-all min-h-[160px] resize-none font-medium"
                />
                <div className="absolute bottom-4 right-4 text-[10px] font-bold text-gray-400 tracking-widest">
                  {newPrayerText.length}/1000
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`flex-1 flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isAnonymous
                      ? 'border-[var(--color-primary-teal)] bg-teal-50/30'
                      : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {isAnonymous ? <UserX className="size-5 text-[var(--color-primary-teal)]" /> : <UserCheck className="size-5 text-gray-400" />}
                    <div className="text-left">
                      <p className={`text-sm font-bold ${isAnonymous ? 'text-[var(--color-primary-teal)]' : 'text-gray-700'}`}>Anonymous</p>
                      <p className="text-[10px] font-medium text-gray-500">Hide your identity</p>
                    </div>
                  </div>
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${isAnonymous ? 'border-[var(--color-primary-teal)] bg-[var(--color-primary-teal)]' : 'border-gray-200'}`}>
                    {isAnonymous && <div className="size-1.5 bg-white rounded-full" />}
                  </div>
                </button>

                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`flex-1 flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isPublic
                      ? 'border-[var(--color-primary-teal)] bg-teal-50/30'
                      : 'border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    {isPublic ? <Globe className="size-5 text-[var(--color-primary-teal)]" /> : <Lock className="size-5 text-gray-400" />}
                    <div className="text-left">
                      <p className={`text-sm font-bold ${isPublic ? 'text-[var(--color-primary-teal)]' : 'text-gray-700'}`}>Public Wall</p>
                      <p className="text-[10px] font-medium text-gray-500">Visible to everyone</p>
                    </div>
                  </div>
                  <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${isPublic ? 'border-[var(--color-primary-teal)] bg-[var(--color-primary-teal)]' : 'border-gray-200'}`}>
                    {isPublic && <div className="size-1.5 bg-white rounded-full" />}
                  </div>
                </button>
              </div>

              <button
                onClick={handlePostPrayer}
                disabled={submitting || !newPrayerText.trim()}
                className="w-full py-4 bg-[var(--color-primary-teal)] text-white rounded-xl font-extrabold shadow-xl shadow-teal-700/30 hover:shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
              >
                {submitting ? (
                  <div className="size-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Send className="size-5" />
                    <span>Post Prayer Request</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
