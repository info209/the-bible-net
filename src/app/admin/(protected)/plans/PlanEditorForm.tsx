'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  BookOpen,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { parseVerseReferences } from '@/utils/verseReferenceParser';
import { BIBLE_BOOKS } from '@/utils/bibleBooks';

interface PlanEditorFormProps {
  initialData?: any;
  planId?: string;
}

const CATEGORIES = [
  'Spiritual Growth',
  'Faith Building',
  'Bible Study',
  'Prayer & Worship',
  'Jesus & Gospels',
  'Old Testament',
  'New Testament',
  'Peace & Comfort',
];

const BIBLE_VERSIONS = ['NIV', 'KJV', 'NKJV', 'ESV', 'IRV'];

export default function PlanEditorForm({ initialData, planId }: PlanEditorFormProps) {
  const router = useRouter();
  const isEditing = Boolean(planId);

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || 'Spiritual Growth');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>(
    initialData?.difficulty || 'beginner'
  );
  const [author, setAuthor] = useState(initialData?.author || 'Bible Net');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
  const [duration, setDuration] = useState<number>(initialData?.duration || 5);
  const [isPublished, setIsPublished] = useState<boolean>(initialData?.isPublished || false);
  const [relatedPlanIds, setRelatedPlanIds] = useState<string[]>(
    (initialData?.relatedPlanIds || []).map((id: any) => id.toString())
  );

  const [allPublishedPlans, setAllPublishedPlans] = useState<any[]>([]);
  const [days, setDays] = useState<any[]>(
    initialData?.days ||
      Array.from({ length: 5 }, (_, i) => ({
        dayId: `day_${i + 1}_${Date.now().toString(36)}`,
        dayNumber: i + 1,
        title: `Day ${i + 1}`,
        description: '',
        items: [
          {
            itemId: `item_${i + 1}_1_${Date.now().toString(36)}`,
            type: 'devotional',
            title: 'Devotional',
            devotionalText: '',
          },
        ],
      }))
  );

  const [expandedDay, setExpandedDay] = useState<number>(1);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch available published plans for related plans selection
  useEffect(() => {
    fetch('/api/admin/plans?status=published')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAllPublishedPlans((data.data || []).filter((p: any) => p._id !== planId));
        }
      })
      .catch(() => {});
  }, [planId]);

  // Sync days count when duration changes
  const handleDurationChange = (newDuration: number) => {
    const validDuration = Math.max(1, Math.min(365, newDuration));
    setDuration(validDuration);

    setDays((prevDays) => {
      if (prevDays.length < validDuration) {
        const addedDays = Array.from({ length: validDuration - prevDays.length }, (_, idx) => {
          const dayNum = prevDays.length + idx + 1;
          return {
            dayId: `day_${dayNum}_${Date.now().toString(36)}`,
            dayNumber: dayNum,
            title: `Day ${dayNum}`,
            description: '',
            items: [
              {
                itemId: `item_${dayNum}_1_${Date.now().toString(36)}`,
                type: 'devotional',
                title: 'Devotional',
                devotionalText: '',
              },
            ],
          };
        });
        return [...prevDays, ...addedDays];
      } else if (prevDays.length > validDuration) {
        return prevDays.slice(0, validDuration);
      }
      return prevDays;
    });
  };

  // Image Upload helper
  const handleUploadFile = async (
    file: File,
    setTargetUrl: (url: string) => void,
    setLoadingState: (loading: boolean) => void
  ) => {
    try {
      setLoadingState(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.url) {
        setTargetUrl(json.url);
        toast.success('Image uploaded successfully!');
      } else {
        toast.error(json.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file');
    } finally {
      setLoadingState(false);
    }
  };

  // Days handlers
  const handleDayTitleChange = (dayIndex: number, newTitle: string) => {
    setDays((prev) => {
      const next = [...prev];
      next[dayIndex] = { ...next[dayIndex], title: newTitle };
      return next;
    });
  };

  const moveDay = (dayIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? dayIndex - 1 : dayIndex + 1;
    if (targetIndex < 0 || targetIndex >= days.length) return;

    setDays((prev) => {
      const next = [...prev];
      const temp = next[dayIndex];
      next[dayIndex] = next[targetIndex];
      next[targetIndex] = temp;
      // Re-assign dayNumber order while preserving stable dayId
      return next.map((d, idx) => ({ ...d, dayNumber: idx + 1 }));
    });
  };

  const moveItem = (dayIndex: number, itemIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    setDays((prev) => {
      const next = [...prev];
      const day = { ...next[dayIndex] };
      const items = [...day.items];
      if (targetIndex < 0 || targetIndex >= items.length) return prev;

      const temp = items[itemIndex];
      items[itemIndex] = items[targetIndex];
      items[targetIndex] = temp;
      day.items = items;
      next[dayIndex] = day;
      return next;
    });
  };

  const handleAddItem = (dayIndex: number, type: 'devotional' | 'scripture') => {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = { ...next[dayIndex] };
      const newItems = [...(targetDay.items || [])];
      newItems.push({
        itemId: `item_${dayIndex + 1}_${newItems.length + 1}_${Date.now().toString(36)}`,
        type,
        title: type === 'scripture' ? 'James 1:18-24 NIV' : 'Devotional',
        devotionalText: '',
        scriptureRef: type === 'scripture' ? 'James 1:18-24' : undefined,
        bibleVersion: type === 'scripture' ? 'NIV' : undefined,
      });
      targetDay.items = newItems;
      next[dayIndex] = targetDay;
      return next;
    });
  };

  const handleRemoveItem = (dayIndex: number, itemIndex: number) => {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = { ...next[dayIndex] };
      if (targetDay.items.length <= 1) {
        toast.error('Day must contain at least one reading item');
        return prev;
      }
      targetDay.items = targetDay.items.filter((_: any, idx: number) => idx !== itemIndex);
      next[dayIndex] = targetDay;
      return next;
    });
  };

  const handleItemChange = (dayIndex: number, itemIndex: number, field: string, value: any) => {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = { ...next[dayIndex] };
      const targetItems = [...targetDay.items];
      targetItems[itemIndex] = { ...targetItems[itemIndex], [field]: value };
      targetDay.items = targetItems;
      next[dayIndex] = targetDay;
      return next;
    });
  };

  // Form Save / Publish submit handler
  const handleSubmit = async (publish: boolean) => {
    if (!title.trim() || !description.trim()) {
      toast.error('Plan title and description are required');
      return;
    }

    if (days.length !== duration) {
      toast.error(`Duration (${duration} days) does not match days count (${days.length})`);
      return;
    }

    // Validate reading items
    for (const day of days) {
      if (!day.items || day.items.length === 0) {
        toast.error(`Day ${day.dayNumber} must contain at least one reading item`);
        return;
      }
      for (const item of day.items) {
        if (item.type === 'scripture' && item.scriptureRef) {
          const { errors } = parseVerseReferences(item.scriptureRef);
          if (errors.length > 0) {
            toast.error(`Invalid scripture reference on Day ${day.dayNumber}: ${errors[0]}`);
            return;
          }
        }
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      difficulty,
      author: author.trim() || 'Bible Net',
      imageUrl: imageUrl.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      duration,
      isPublished: publish,
      days,
      relatedPlanIds,
    };

    try {
      setIsSaving(true);
      const url = isEditing ? `/api/admin/plans/${planId}` : '/api/admin/plans';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(publish ? 'Plan published successfully!' : 'Draft saved successfully!');
        router.push('/admin/plans');
      } else {
        toast.error(json.error || 'Failed to save plan');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <button
          onClick={() => router.push('/admin/plans')}
          className="flex items-center space-x-2 text-sm font-medium text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Plans</span>
        </button>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleSubmit(false)}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-colors shadow-md cursor-pointer disabled:opacity-50"
          >
            {isEditing ? 'Update & Publish' : 'Publish Plan'}
          </button>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-white">
        {isEditing ? 'Edit Reading Plan' : 'Create New Reading Plan'}
      </h1>

      {/* 1. GENERAL METADATA SECTION */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-bold text-teal-400">1. Basic Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Plan Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5 Days of Finding Peace"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Description / About Content *</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what the user will experience..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Duration (Days) *</label>
              <input
                type="number"
                min={1}
                max={365}
                value={duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 1)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Author / Creator</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Bible Net"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1A1A1A] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* 2. IMAGE MEDIA SECTION */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
        <h2 className="text-lg font-bold text-teal-400">2. Plan Images (Cloud Storage)</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Main Cover Image */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">Cover Banner Image (16:9)</label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-xs"
              />
              <label className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0">
                {isUploadingImage ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUploadFile(e.target.files[0], setImageUrl, setIsUploadingImage);
                  }}
                />
              </label>
            </div>
            {imageUrl && (
              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black/40 border border-white/5 mt-2">
                <img src={imageUrl} alt="Cover preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Thumbnail Image */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-300">List Thumbnail Image (1:1 / Square)</label>
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-2 rounded-xl bg-[#1A1A1A] border border-white/10 text-white text-xs"
              />
              <label className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0">
                {isUploadingThumb ? 'Uploading...' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleUploadFile(e.target.files[0], setThumbnailUrl, setIsUploadingThumb);
                  }}
                />
              </label>
            </div>
            {thumbnailUrl && (
              <div className="size-20 rounded-xl overflow-hidden bg-black/40 border border-white/5 mt-2">
                <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. DAYS & READING ITEMS BUILDER */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-teal-400">3. Daily Content Builder</h2>
            <p className="text-xs text-gray-400">Configure readings & devotionals for each day</p>
          </div>
          <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-white">
            {days.length} Days Configured
          </span>
        </div>

        <div className="space-y-4">
          {days.map((day, dIdx) => {
            const isExpanded = expandedDay === day.dayNumber;

            return (
              <div
                key={day.dayId || dIdx}
                className="border border-white/10 rounded-2xl bg-[#1A1A1A] overflow-hidden"
              >
                {/* Day Header Bar */}
                <div
                  onClick={() => setExpandedDay(isExpanded ? 0 : day.dayNumber)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {/* Day Reorder Controls */}
                    <div className="flex flex-col space-y-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        disabled={dIdx === 0}
                        onClick={() => moveDay(dIdx, 'up')}
                        className="p-0.5 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Day Up"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={dIdx === days.length - 1}
                        onClick={() => moveDay(dIdx, 'down')}
                        className="p-0.5 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Day Down"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>

                    <span className="px-3 py-1 rounded-lg bg-teal-600/30 text-teal-300 font-bold text-xs">
                      Day {day.dayNumber}
                    </span>
                    <input
                      type="text"
                      value={day.title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleDayTitleChange(dIdx, e.target.value)}
                      placeholder="Day Title (e.g. Living by Faith)"
                      className="bg-transparent text-white font-semibold text-sm focus:outline-none focus:border-b border-teal-500 px-1"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">
                      {day.items?.length || 0} reading items
                    </span>
                    {isExpanded ? <ChevronUp className="size-4 text-gray-400" /> : <ChevronDown className="size-4 text-gray-400" />}
                  </div>
                </div>

                {/* Day Content Expanded */}
                {isExpanded && (
                  <div className="p-4 pt-0 space-y-4 border-t border-white/5">
                    {/* Items List */}
                    <div className="space-y-3 pt-3">
                      {(day.items || []).map((item: any, iIdx: number) => {
                        const parsedCheck = item.type === 'scripture' && item.scriptureRef ? parseVerseReferences(item.scriptureRef) : null;
                        const isValidScripture = parsedCheck ? parsedCheck.errors.length === 0 && parsedCheck.refs.length > 0 : true;

                        return (
                          <div
                            key={item.itemId || iIdx}
                            className="p-4 rounded-xl bg-[#141414] border border-white/5 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {/* Item Reorder Controls */}
                                <div className="flex items-center space-x-1">
                                  <button
                                    type="button"
                                    disabled={iIdx === 0}
                                    onClick={() => moveItem(dIdx, iIdx, 'up')}
                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Move Item Up"
                                  >
                                    <ArrowUp className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={iIdx === (day.items.length - 1)}
                                    onClick={() => moveItem(dIdx, iIdx, 'down')}
                                    className="p-1 text-gray-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Move Item Down"
                                  >
                                    <ArrowDown className="size-3.5" />
                                  </button>
                                </div>

                                <span className="text-xs font-bold text-gray-400">Item #{iIdx + 1}</span>
                                <select
                                  value={item.type}
                                  onChange={(e) => handleItemChange(dIdx, iIdx, 'type', e.target.value)}
                                  className="px-2.5 py-1 rounded-lg bg-[#1A1A1A] border border-white/10 text-white text-xs font-semibold cursor-pointer"
                                >
                                  <option value="devotional">Devotional Text</option>
                                  <option value="scripture">Scripture Reference</option>
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(dIdx, iIdx)}
                                className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>

                            {/* Item Display Title */}
                            <div>
                              <label className="block text-[11px] text-gray-400 font-medium mb-1">Item Title / Display Label</label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => handleItemChange(dIdx, iIdx, 'title', e.target.value)}
                                placeholder={item.type === 'scripture' ? 'e.g. James 1:18–24 NIV' : 'Devotional Title'}
                                className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white text-xs placeholder-gray-500"
                              />
                            </div>

                            {/* Devotional Content Inputs */}
                            {item.type === 'devotional' ? (
                              <div className="space-y-2">
                                <label className="block text-[11px] text-gray-400 font-medium">Devotional Content Text</label>
                                <textarea
                                  rows={4}
                                  value={item.devotionalText || ''}
                                  onChange={(e) => handleItemChange(dIdx, iIdx, 'devotionalText', e.target.value)}
                                  placeholder="Write devotional content here..."
                                  className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white text-xs placeholder-gray-500"
                                />
                              </div>
                            ) : (
                              /* Scripture Reference Inputs with Bible Selector Helpers */
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Quick Book Picker Helper */}
                                  <div>
                                    <label className="block text-[11px] text-gray-400 font-medium mb-1">Quick Select Book</label>
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const newRef = `${e.target.value} 1:1`;
                                          handleItemChange(dIdx, iIdx, 'scriptureRef', newRef);
                                          if (!item.title || item.title === 'James 1:18-24') {
                                            handleItemChange(dIdx, iIdx, 'title', `${newRef} ${item.bibleVersion || 'NIV'}`);
                                          }
                                        }
                                      }}
                                      className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white text-xs cursor-pointer"
                                    >
                                      <option value="">Select Bible Book...</option>
                                      {BIBLE_BOOKS.map((b) => (
                                        <option key={b.order} value={b.name}>
                                          {b.name} ({b.testament})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-gray-400 font-medium mb-1">Scripture Reference *</label>
                                    <input
                                      type="text"
                                      value={item.scriptureRef || ''}
                                      onChange={(e) => handleItemChange(dIdx, iIdx, 'scriptureRef', e.target.value)}
                                      placeholder="e.g. James 1:18-24"
                                      className={`w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border text-white text-xs ${
                                        isValidScripture ? 'border-white/10' : 'border-red-500'
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] text-gray-400 font-medium mb-1">Bible Version</label>
                                    <select
                                      value={item.bibleVersion || 'NIV'}
                                      onChange={(e) => handleItemChange(dIdx, iIdx, 'bibleVersion', e.target.value)}
                                      className="w-full px-3 py-2 rounded-lg bg-[#1A1A1A] border border-white/10 text-white text-xs cursor-pointer"
                                    >
                                      {BIBLE_VERSIONS.map((v) => (
                                        <option key={v} value={v}>
                                          {v}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* Validation Feedback Badge */}
                                {item.scriptureRef && (
                                  <div className="flex items-center space-x-2 text-xs">
                                    {isValidScripture ? (
                                      <span className="text-green-400 flex items-center space-x-1 font-medium">
                                        <Check className="size-3.5" />
                                        <span>Valid reference: {parsedCheck?.refs.map(r => `${r.book} ${r.chapter}:${r.startVerse}-${r.endVerse}`).join(', ')}</span>
                                      </span>
                                    ) : (
                                      <span className="text-red-400 flex items-center space-x-1 font-medium">
                                        <AlertCircle className="size-3.5" />
                                        <span>{parsedCheck?.errors[0] || 'Invalid reference syntax'}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Reading Item Buttons */}
                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleAddItem(dIdx, 'devotional')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-teal-400 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Devotional Item</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddItem(dIdx, 'scripture')}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-teal-400 text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Scripture Item</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. RELATED PLANS SELECTION */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-teal-400">4. Configure Related Plans</h2>
        <p className="text-xs text-gray-400">Select published plans to recommend upon plan completion</p>

        {allPublishedPlans.length === 0 ? (
          <p className="text-xs text-gray-500 italic">No other published plans available for selection.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
            {allPublishedPlans.map((p) => {
              const isSelected = relatedPlanIds.includes(p._id.toString());
              return (
                <div
                  key={p._id}
                  onClick={() => {
                    setRelatedPlanIds((prev) =>
                      isSelected ? prev.filter((id) => id !== p._id.toString()) : [...prev, p._id.toString()]
                    );
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-950/40 border-teal-500 text-white' : 'bg-[#1A1A1A] border-white/5 text-gray-400'
                  }`}
                >
                  <span className="text-xs font-semibold truncate max-w-[200px]">{p.title}</span>
                  <input type="checkbox" checked={isSelected} readOnly className="accent-teal-500" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Actions */}
      <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-colors cursor-pointer"
        >
          Save Draft
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={isSaving}
          className="px-8 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm transition-colors shadow-lg cursor-pointer"
        >
          {isEditing ? 'Update & Publish' : 'Publish Plan'}
        </button>
      </div>
    </div>
  );
}

