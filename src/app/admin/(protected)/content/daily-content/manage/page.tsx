"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface IDailyContent {
    _id?: string;
    date: string;
    verse: string;
    verseReference: string;
    devotionalTitle?: string;
    devotionalContent?: string;
    backgroundImage?: string;
    isPublished: boolean;
}

function ManageForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    
    const [loading, setLoading] = useState(!!id);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<IDailyContent>({
        date: new Date().toISOString().split('T')[0],
        verse: '',
        verseReference: '',
        devotionalTitle: '',
        devotionalContent: '',
        backgroundImage: '',
        isPublished: true,
    });

    useEffect(() => {
        if (id) {
            fetchContent(id);
        }
    }, [id]);

    const fetchContent = async (contentId: string) => {
        try {
            const res = await fetch(`/api/admin/daily-content/${contentId}`);
            const result = await res.json();
            if (result.success) {
                setFormData(result.data);
            } else {
                alert(result.error || 'Failed to fetch content');
                router.push('/admin/content/daily-content');
            }
        } catch (err) {
            alert('Error fetching content');
            router.push('/admin/content/daily-content');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = id ? `/api/admin/daily-content/${id}` : '/api/admin/daily-content';
            const method = id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await res.json();
            if (result.success) {
                router.push('/admin/content/daily-content');
                router.refresh();
            } else {
                alert(result.error || 'Failed to save');
            }
        } catch (err) {
            alert('Error saving content');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-20 text-center text-gray-500">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                Loading content details...
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8 pb-20">
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Schedule Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Background Image URL (Optional)</label>
                        <input
                            type="url"
                            value={formData.backgroundImage || ''}
                            onChange={(e) => setFormData({...formData, backgroundImage: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">1. Daily Verse</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Reference (e.g. John 3:16)</label>
                        <input
                            type="text"
                            value={formData.verseReference}
                            onChange={(e) => setFormData({...formData, verseReference: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="Book Chapter:Verse"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Verse Text</label>
                        <textarea
                            value={formData.verse}
                            onChange={(e) => setFormData({...formData, verse: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-32 resize-none"
                            placeholder="Enter the Bible verse text here..."
                            required
                        />
                    </div>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="text-lg font-bold text-white border-b border-white/5 pb-4">2. Daily Devotional</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Devotional Title</label>
                        <input
                            type="text"
                            value={formData.devotionalTitle || ''}
                            onChange={(e) => setFormData({...formData, devotionalTitle: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="Enter title..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Devotional Content</label>
                        <textarea
                            value={formData.devotionalContent || ''}
                            onChange={(e) => setFormData({...formData, devotionalContent: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-48 resize-none"
                            placeholder="Write the devotional content here..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
                <label htmlFor="isPublished" className="ml-3 text-white font-medium cursor-pointer">Publish this content immediately</label>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
                <Link
                    href="/admin/content/daily-content"
                    className="px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors"
                >
                    Cancel
                </Link>
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                >
                    {submitting ? 'Saving...' : (id ? 'Update Content' : 'Schedule Content')}
                </button>
            </div>
        </form>
    );
}

export default function ManageDailyContent() {
    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Link 
                    href="/admin/content/daily-content" 
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                >
                    <ArrowLeft className="size-5" />
                </Link>
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-1">
                        <Link href="/admin/content" className="hover:text-white">Content</Link>
                        <span>/</span>
                        <Link href="/admin/content/daily-content" className="hover:text-white">Daily Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">Manage</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Manage Daily Content</h1>
                </div>
            </div>

            <Suspense fallback={<div className="p-20 text-center text-gray-500">Loading form...</div>}>
                <ManageForm />
            </Suspense>
        </div>
    );
}
