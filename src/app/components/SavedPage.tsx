'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LibraryPageHeader from './LibraryPageHeader';
import {
  MoreVertical, Tag, Eye, EyeOff, BookOpen, Share2, Trash2, Check, X, Bookmark, ExternalLink
} from 'lucide-react';
import { useSavedVerses, SavedVerseClient } from '@/lib/useSavedVerses';
import { useSavedItems, SavedItemClient } from '@/lib/useSavedItems';

type FilterTab = 'All' | 'Bible' | 'Reading plans';

const TABS: FilterTab[] = ['All', 'Bible', 'Reading plans'];

interface SavedPageProps {
  onBack?: () => void;
  onClose?: () => void;
}

export default function SavedPage({ onBack, onClose }: SavedPageProps = {}) {
  const router = useRouter();
  const { savedVerses, isLoading: versesLoading, updateSavedVerse, deleteSavedVerse } = useSavedVerses();
  const { savedItems, isLoading: itemsLoading, unsaveItem } = useSavedItems();
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<any>(null);

  // Modals / Dialogs
  const [editLabelsOpen, setEditLabelsOpen] = useState(false);
  const [editPrivacyOpen, setEditPrivacyOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Temporary Edit States
  const [tempLabels, setTempLabels] = useState<string[]>([]);
  const [tempLabelInput, setTempLabelInput] = useState('');
  const [tempPrivacy, setTempPrivacy] = useState(false);
  
  // Ref for click outside menu detection
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenMenu = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Position menu below the ellipsis, right-aligned to it
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setSelectedItemForMenu(item);
    setMenuOpenId(item._id);
  };

  // CRUD actions from floating menu
  const handleRead = () => {
    if (!selectedItemForMenu) return;
    setMenuOpenId(null);
    const book = selectedItemForMenu.bookId || 'GEN';
    const ch = selectedItemForMenu.chapter || 1;
    const version = selectedItemForMenu.version || 'NKJV';
    const verses = selectedItemForMenu.verses;
    const verseNum = Array.isArray(verses) && verses.length > 0 ? verses[0] : null;

    const query = new URLSearchParams({
      version,
      book,
      chapter: String(ch),
    });
    if (verseNum != null) {
      query.set('verse', String(verseNum));
    }

    router.push(`/bible?${query.toString()}`);
    if (onClose) onClose();
  };

  const handleOpenEditLabels = () => {
    if (!selectedItemForMenu) return;
    setMenuOpenId(null);
    setTempLabels(selectedItemForMenu.labels || []);
    setTempLabelInput('');
    setEditLabelsOpen(true);
  };

  const handleSaveLabels = async () => {
    if (!selectedItemForMenu) return;
    try {
      await updateSavedVerse(selectedItemForMenu._id, { labels: tempLabels });
      showToast('Labels updated successfully');
      setEditLabelsOpen(false);
    } catch (e) {
      showToast('Failed to update labels');
    }
  };

  const handleAddLabel = () => {
    const label = tempLabelInput.trim();
    if (label && !tempLabels.includes(label)) {
      setTempLabels([...tempLabels, label]);
      setTempLabelInput('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setTempLabels(tempLabels.filter(l => l !== labelToRemove));
  };

  const handleOpenEditPrivacy = () => {
    if (!selectedItemForMenu) return;
    setMenuOpenId(null);
    setTempPrivacy(selectedItemForMenu.isPrivate || false);
    setEditPrivacyOpen(true);
  };

  const handleSavePrivacy = async () => {
    if (!selectedItemForMenu) return;
    try {
      await updateSavedVerse(selectedItemForMenu._id, { isPrivate: tempPrivacy });
      showToast(tempPrivacy ? 'Verse set to Private' : 'Verse set to Public');
      setEditPrivacyOpen(false);
    } catch (e) {
      showToast('Failed to update privacy');
    }
  };

  const handleOpenCompare = () => {
    if (!selectedItemForMenu) return;
    setMenuOpenId(null);
    setCompareOpen(true);
  };

  const handleShare = async () => {
    if (!selectedItemForMenu) return;
    setMenuOpenId(null);
    const shareText = `"${selectedItemForMenu.verseText || ''}" - ${selectedItemForMenu.verseRangeText || ''} (${selectedItemForMenu.version || 'NKJV'})`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shared Saved Verse',
          text: shareText,
        });
      } catch (err) {
        // Fallback copy
        navigator.clipboard.writeText(shareText);
        showToast('Copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('Copied to clipboard!');
    }
  };

  const handleDelete = async () => {
    if (!selectedItemForMenu) return;
    const id = selectedItemForMenu._id;
    setMenuOpenId(null);
    try {
      await deleteSavedVerse(id);
      showToast('Saved verse deleted');
    } catch (e) {
      showToast('Failed to delete saved verse');
    }
  };

  // Formatting Relative Time for top row
  const getRelativeTime = (dateString: string) => {
    try {
      const created = new Date(dateString).getTime();
      const now = new Date().getTime();
      const diff = now - created;
      
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch (e) {
      return '10m ago';
    }
  };

  // Combine and Filter data
  const filteredData = useMemo(() => {
    if (activeTab === 'Bible') {
      return savedVerses;
    }
    if (activeTab === 'Reading plans') {
      return savedItems.filter(item => item.type === 'reading_plan');
    }
    // "All" Tab: display all saved verses
    return savedVerses;
  }, [activeTab, savedVerses, savedItems]);

  const isLoading = versesLoading || itemsLoading;

  return (
    <div className="min-h-screen bg-[#F4F8F8] dark:bg-[#0D0D0D] pb-10">
      
      {/* ── Header ─────────────────────────────────────────── */}
      <LibraryPageHeader title="Saved" onBack={() => onBack ? onBack() : router.back()} />

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex px-4 gap-3 overflow-x-auto scrollbar-none pb-4 bg-[#F4F8F8] dark:bg-[#0D0D0D]">
        {TABS.map(tab => {
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="h-8 px-4 rounded-[999px] text-[13px] font-[500] whitespace-nowrap shrink-0 transition-all flex items-center justify-center"
              style={{
                backgroundColor: isSelected ? '#FFFFFF' : '#F1F2F3',
                border: isSelected ? '1px solid #0B7A81' : 'none',
                color: isSelected ? '#0B7A81' : '#6D6D6D',
              }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Saved Verses List ─────────────────────────────────────────── */}
      <main className="px-5 mt-3 max-w-2xl mx-auto space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div
                key={n}
                className="h-[180px] w-full rounded-2xl bg-white dark:bg-[#111111] border border-[#D7D7D7] dark:border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-[#0B7A81]/10 flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-[#0B7A81]" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">No saved items</h3>
            <p className="text-xs text-gray-400 max-w-xs mt-1">
              {activeTab === 'Bible' || activeTab === 'All'
                ? 'Verses you bookmark in the reader will appear here.'
                : `Your saved ${activeTab.toLowerCase()} will appear here.`}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredData.map((item: any) => {
              const displayRef = item.verseRangeText || `${item.bookName} ${item.chapter}:${item.verses.join(', ')}`;
              const labelText = item.labels && item.labels.length > 0 ? item.labels.join(', ') : 'Joy';
              
              return (
                <div
                  key={item._id}
                  className="w-full bg-white dark:bg-[#151515] border border-[#D7D7D7] dark:border-white/[0.08] rounded-[16px] p-4 flex flex-col relative transition-shadow hover:shadow-sm"
                >
                  {/* Top Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[14px] font-[400] text-[#333333] dark:text-gray-300 leading-snug">
                        You have saved <span className="font-[700] text-[#111111] dark:text-white">{displayRef}</span>
                      </p>
                      <p className="text-[12px] font-[400] text-[#666666] dark:text-gray-400 mt-0.5">
                        ({item.version || 'NKJV'})
                      </p>
                      
                      {/* Label Row */}
                      <div className="flex items-center gap-1.5 mt-2">
                        <Tag className="w-3.5 h-3.5 text-[#0B7A81]" />
                        <span className="text-[12px] font-[500] text-[#0B7A81]">
                          Label: {labelText}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp & More Menu Trigger */}
                    <div className="flex items-center gap-2 select-none">
                      <div className="w-[8px] h-[8px] bg-[#0B7A81] rounded-full" />
                      <span className="text-[10px] text-[#111111] dark:text-gray-400 font-[400]">
                        {getRelativeTime(item.createdAt)}
                      </span>
                      <button
                        onClick={(e) => handleOpenMenu(e, item)}
                        className="w-8 h-8 rounded-full flex items-center justify-center active:bg-gray-100 dark:active:bg-white/[0.04] transition-colors"
                        aria-label="More actions"
                      >
                        <MoreVertical className="w-[18px] h-[18px] text-[#111111] dark:text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Verse Text Area */}
                  <div className="mt-4">
                    <p className="text-[16px] font-[400] leading-[26px] text-[#222222] dark:text-gray-200">
                      {item.verseText || 'Loading verse text...'}
                    </p>
                  </div>

                  {/* Footer Reference */}
                  <div className="mt-3">
                    <span className="text-[20px] font-[500] text-[#0B7A81] select-all cursor-pointer">
                      {displayRef}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Floating Popover Menu ─────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpenId && menuPosition && (
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)}>
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: menuPosition.top,
                right: menuPosition.right,
              }}
              className="w-[160px] bg-white dark:bg-[#202020] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-white/[0.08] py-1.5 overflow-hidden z-50"
              onClick={(e) => e.stopPropagation()}
            >
              {[
                { label: 'Read', icon: BookOpen, action: handleRead },
                { label: 'Edit', icon: Tag, action: handleOpenEditLabels },
                // { label: 'Compare verse', icon: ExternalLink, action: handleOpenCompare },
                { label: 'Share', icon: Share2, action: handleShare },
                { label: 'Delete', icon: Trash2, action: handleDelete, isDelete: true },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full h-[44px] px-4 flex items-center justify-between text-[14px] font-[500] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors active:bg-gray-100/50"
                    style={{
                      color: item.isDelete ? '#FF4D4F' : '#111111',
                    }}
                  >
                    <span className={item.isDelete ? 'text-[#FF4D4F]' : 'text-gray-800 dark:text-gray-200'}>
                      {item.label}
                    </span>
                    <Icon className="w-4 h-4 text-current" />
                  </button>
                );
              })}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Dialog: Edit Labels ─────────────────────────────────────────── */}
      <AnimatePresence>
        {editLabelsOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-sm p-5 shadow-xl border border-gray-100 dark:border-white/[0.08]"
            >
              <h3 className="text-[16px] font-[600] text-gray-900 dark:text-white">
                Edit Labels & Privacy
              </h3>
              
              <div className="mt-4 space-y-4">
                {/* Labels Edit */}
                <div>
                  <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">
                    Labels
                  </label>
                  
                  {/* Current Labels List */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {tempLabels.map(l => (
                      <span
                        key={l}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0B7A81]/10 text-[#0B7A81] rounded-full text-xs font-semibold"
                      >
                        {l}
                        <button
                          onClick={() => handleRemoveLabel(l)}
                          className="hover:text-red-500 font-bold ml-0.5"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                    {tempLabels.length === 0 && (
                      <span className="text-[12px] text-gray-400 italic">No labels added yet.</span>
                    )}
                  </div>

                  {/* Add Label Input */}
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      placeholder="Add label..."
                      value={tempLabelInput}
                      onChange={(e) => setTempLabelInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddLabel(); }}
                      className="flex-1 h-9 rounded-lg border border-gray-300 dark:border-white/[0.08] bg-transparent text-sm px-3 focus:outline-none focus:border-[#0B7A81]"
                    />
                    <button
                      onClick={handleAddLabel}
                      className="px-3 h-9 bg-[#0B7A81] text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Privacy Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/[0.04]">
                  <div>
                    <label className="text-[14px] font-[600] text-gray-800 dark:text-gray-200">
                      Private Verse
                    </label>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Private verses are hidden from public journals.
                    </p>
                  </div>
                  <button
                    onClick={() => setTempPrivacy(!tempPrivacy)}
                    className="w-12 h-6 rounded-full transition-colors relative flex items-center px-1"
                    style={{
                      backgroundColor: tempPrivacy ? '#0B7A81' : '#E5E7EB',
                    }}
                  >
                    <motion.div
                      layout
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                      animate={{ x: tempPrivacy ? 24 : 0 }}
                    />
                  </button>
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditLabelsOpen(false)}
                  className="flex-1 h-10 border border-gray-200 dark:border-white/[0.08] text-gray-500 rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLabels}
                  className="flex-1 h-10 bg-[#0B7A81] text-white rounded-xl text-sm font-medium"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Dialog: Compare Verse ─────────────────────────────────────────── */}
      <AnimatePresence>
        {compareOpen && selectedItemForMenu && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl w-full max-w-lg p-5 shadow-xl border border-gray-100 dark:border-white/[0.08]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.04] pb-3">
                <h3 className="text-[16px] font-[600] text-gray-900 dark:text-white">
                  Compare Verse - {selectedItemForMenu.verseRangeText || `${selectedItemForMenu.bookName} ${selectedItemForMenu.chapter}:${selectedItemForMenu.verses.join(', ')}`}
                </h3>
                <button onClick={() => setCompareOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {[
                  { ver: 'NKJV', text: selectedItemForMenu.verseText || 'Verifying content...' },
                  { ver: 'KJV', text: (selectedItemForMenu.verseText || '').replace(/you/g, 'thee').replace(/have/g, 'hast') || 'Verifying content...' },
                  { ver: 'NIV', text: selectedItemForMenu.verseText || 'Verifying content...' },
                  { ver: 'ESV', text: selectedItemForMenu.verseText || 'Verifying content...' },
                ].map((compare, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-[#202020] rounded-xl border border-gray-100 dark:border-white/[0.04]">
                    <span className="text-xs font-extrabold text-[#0B7A81] uppercase">{compare.ver}</span>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 leading-relaxed">
                      {compare.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setCompareOpen(false)}
                  className="px-6 h-10 bg-[#0B7A81] text-white rounded-xl text-sm font-medium"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Toast Notification ─────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0B7A81] text-white text-xs px-5 py-3 rounded-full shadow-lg font-semibold flex items-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
