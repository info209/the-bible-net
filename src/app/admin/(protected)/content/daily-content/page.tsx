"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

export default function DailyContentManagement() {
    const [contents, setContents] = useState<IDailyContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                    <p className="text-gray-400 mt-1">Manage verses and devotionals by date.</p>
                </div>
                <Link
                    href="/admin/content/daily-content/manage"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    + Schedule Content
                </Link>
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
                        <Link href="/admin/content/daily-content/manage" className="mt-4 text-blue-400 hover:underline">Schedule your first day</Link>
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
                                            <Link href={`/admin/content/daily-content/manage?id=${item._id}`} className="text-blue-400 hover:underline">Edit</Link>
                                            <button onClick={() => item._id && handleDelete(item._id)} className="text-red-400 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
