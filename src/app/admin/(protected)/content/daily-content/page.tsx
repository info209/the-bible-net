"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DailyContentService } from '@/services/dailyContentService';

interface IDailyContent {
    _id?: string;
    date: string;
    verse: string;
    verseReference: string;
    devotionalTitle?: string;
    devotionalContent?: string;
    prayerTitle?: string;
    prayerContent?: string;
    backgroundImage?: string;
    isPublished: boolean;
}

export default function DailyContentManagement() {
    const [contents, setContents] = useState<IDailyContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState<IDailyContent>({
        date: new Date().toISOString().split('T')[0],
        verse: '',
        verseReference: '',
        devotionalTitle: '',
        devotionalContent: '',
        prayerTitle: '',
        prayerContent: '',
        backgroundImage: '',
        isPublished: true,
    });
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchContents();
    }, []);

    const fetchContents = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/daily-content');
            const result = await res.json();
            if (result.success) {
                setContents(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch content');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this Daily Content?')) return;

        try {
            const res = await fetch(`/api/admin/daily-content/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                fetchContents();
            } else {
                alert(result.error || 'Failed to delete');
            }
        } catch (err) {
            alert('Error deleting content');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const url = isEditing && formData._id ? `/api/admin/daily-content/${formData._id}` : '/api/admin/daily-content';
            const method = isEditing && formData._id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await res.json();
            if (result.success) {
                setIsModalOpen(false);
                fetchContents();
            } else {
                alert(result.error || 'Failed to save');
            }
        } catch (err) {
            alert('Error saving content');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (content: IDailyContent) => {
        setFormData(content);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setFormData({
            date: new Date().toISOString().split('T')[0],
            verse: '',
            verseReference: '',
            devotionalTitle: '',
            devotionalContent: '',
            prayerTitle: '',
            prayerContent: '',
            backgroundImage: '',
            isPublished: true,
        });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">Daily Content</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Daily Content Schedule</h1>
                    <p className="text-gray-400 mt-1">Manage verses, devotionals, and prayers by date.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    + Schedule Content
                </button>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        Loading schedule...
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-red-400">
                        {error}
                        <button onClick={fetchContents} className="block mx-auto mt-4 text-sm text-blue-400 hover:underline">Try Again</button>
                    </div>
                ) : contents.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="text-4xl mb-4">📅</div>
                        <p>No content scheduled.</p>
                        <button onClick={openAddModal} className="mt-4 text-blue-400 hover:underline">Schedule your first day</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 text-gray-400 text-sm">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Verse Ref</th>
                                    <th className="p-4 font-medium">Devotional Title</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {contents.map(item => (
                                    <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 font-medium text-white">{item.date}</td>
                                        <td className="p-4 text-gray-300">{item.verseReference || '—'}</td>
                                        <td className="p-4 text-gray-300">{item.devotionalTitle || '—'}</td>
                                        <td className="p-4">
                                            {item.isPublished ? (
                                                <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-bold uppercase">Published</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-xs font-bold uppercase">Draft</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-3">
                                            <button onClick={() => openEditModal(item)} className="text-blue-400 hover:underline">Edit</button>
                                            <button onClick={() => item._id && handleDelete(item._id)} className="text-red-400 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl my-8">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#181818] z-10 rounded-t-2xl">
                            <h2 className="text-xl font-bold">{isEditing ? 'Edit Scheduled Content' : 'Schedule New Content'}</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Date (YYYY-MM-DD)</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Background Image URL (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.backgroundImage || ''}
                                        onChange={(e) => setFormData({...formData, backgroundImage: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-lg font-bold text-white mb-4">1. Daily Verse</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Reference (e.g. John 3:16)</label>
                                        <input
                                            type="text"
                                            value={formData.verseReference}
                                            onChange={(e) => setFormData({...formData, verseReference: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Verse Text</label>
                                        <textarea
                                            value={formData.verse}
                                            onChange={(e) => setFormData({...formData, verse: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-lg font-bold text-white mb-4">2. Daily Devotional</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Devotional Title</label>
                                        <input
                                            type="text"
                                            value={formData.devotionalTitle || ''}
                                            onChange={(e) => setFormData({...formData, devotionalTitle: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Devotional Content</label>
                                        <textarea
                                            value={formData.devotionalContent || ''}
                                            onChange={(e) => setFormData({...formData, devotionalContent: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors h-32 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-white/5 pt-6">
                                <h3 className="text-lg font-bold text-white mb-4">3. Daily Prayer</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Prayer Title (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.prayerTitle || ''}
                                            onChange={(e) => setFormData({...formData, prayerTitle: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Prayer Content (Optional)</label>
                                        <textarea
                                            value={formData.prayerContent || ''}
                                            onChange={(e) => setFormData({...formData, prayerContent: e.target.value})}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center mt-4">
                                <input
                                    type="checkbox"
                                    id="isPublished"
                                    checked={formData.isPublished}
                                    onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500"
                                />
                                <label htmlFor="isPublished" className="ml-2 text-white font-medium">Publish this content</label>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Content'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
