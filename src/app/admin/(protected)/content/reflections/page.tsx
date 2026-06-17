"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

interface Content {
    _id: string;
    type: 'verse' | 'devotion';
    title?: string;
    reference?: string;
    text: string;
    createdAt: string;
}

export default function ReflectionsManagement() {
    const confirm = useConfirm();
    const [selectedType, setSelectedType] = useState<'devotion' | 'verse'>('devotion');
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [reference, setReference] = useState('');
    const [text, setText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchContents();
    }, [selectedType]);

    const fetchContents = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/content?type=${selectedType}`);
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
        const confirmed = await confirm({
            title: `Delete ${selectedType === 'devotion' ? 'Devotional' : 'Verse'}`,
            message: `Are you sure you want to delete this ${selectedType}?`,
            destructive: true
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/v1/content/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Content deleted successfully');
                fetchContents();
            } else {
                toast.error(result.error || 'Failed to delete');
            }
        } catch (err) {
            toast.error('Error deleting content');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const res = await fetch('/api/v1/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedType,
                    title: selectedType === 'devotion' ? title : undefined,
                    reference: selectedType === 'verse' ? reference : undefined,
                    text,
                    createdBy: 'admin'
                }),
            });

            const result = await res.json();
            if (result.success) {
                setIsModalOpen(false);
                setTitle('');
                setReference('');
                setText('');
                toast.success(`${selectedType === 'devotion' ? 'Reflection' : 'Daily Verse'} created successfully`);
                fetchContents();
            } else {
                toast.error(result.error || 'Failed to create');
            }
        } catch (err) {
            toast.error('Error creating content');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">Daily Reflections</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Daily Reflections</h1>
                    <p className="text-gray-400 mt-1">Manage the library of verses and devotionals for daily rotation</p>
                </div>
                <button
                    onClick={() => {
                        setTitle('');
                        setReference('');
                        setText('');
                        setIsModalOpen(true);
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    + Add {selectedType === 'devotion' ? 'Reflection' : 'Daily Verse'}
                </button>
            </div>

            <div className="flex space-x-4 border-b border-white/5 pb-1">
                <button
                    onClick={() => setSelectedType('devotion')}
                    className={`px-4 py-2 text-sm font-bold transition-colors relative ${selectedType === 'devotion' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Devotionals
                    {selectedType === 'devotion' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />}
                </button>
                <button
                    onClick={() => setSelectedType('verse')}
                    className={`px-4 py-2 text-sm font-bold transition-colors relative ${selectedType === 'verse' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    Daily Verses
                    {selectedType === 'verse' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 rounded-full" />}
                </button>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        Loading {selectedType}s...
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-red-400">
                        {error}
                        <button onClick={fetchContents} className="block mx-auto mt-4 text-sm text-blue-400 hover:underline">Try Again</button>
                    </div>
                ) : contents.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="text-4xl mb-4">{selectedType === 'devotion' ? '💡' : '📖'}</div>
                        <p>No {selectedType}s found in the library.</p>
                        <button onClick={() => setIsModalOpen(true)} className="mt-4 text-blue-400 hover:underline">Create your first {selectedType}</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-px bg-white/5">
                        {contents.map(item => (
                            <div key={item._id} className="bg-[#111] p-6 hover:bg-white/[0.02] transition-colors group">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        {item.type === 'devotion' ? (
                                            <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                                        ) : (
                                            <h3 className="text-xl font-bold text-blue-400 mb-2">{item.reference}</h3>
                                        )}
                                        <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{item.text}</p>
                                        <div className="mt-4 flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                            <span>Added {new Date(item.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleDelete(item._id)}
                                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#181818] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-bold">New {selectedType === 'devotion' ? 'Reflection' : 'Daily Verse'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {selectedType === 'devotion' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700"
                                        placeholder="Enter devotion title..."
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Bible Reference</label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700"
                                        placeholder="e.g. John 3:16"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Content Text</label>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors h-48 resize-none placeholder:text-gray-700"
                                    placeholder={selectedType === 'devotion' ? "Write the reflection content here..." : "Enter the verse text..."}
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-4">
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
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? 'Creating...' : `Create ${selectedType === 'devotion' ? 'Reflection' : 'Verse'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
