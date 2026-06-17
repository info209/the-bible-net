'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Save, Trash2, Eye, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

interface LegalContent {
    _id: string;
    type: 'terms' | 'privacy';
    title: string;
    content: string;
    isActive: boolean;
    lastUpdated: string;
}

export default function LegalCMSClient() {
    const confirm = useConfirm();
    const [contents, setContents] = useState<LegalContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingContent, setEditingContent] = useState<Partial<LegalContent> | null>(null);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);

    useEffect(() => {
        fetchContents();
    }, []);

    const fetchContents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/content/legal');
            const data = await res.json();
            if (data.success) {
                setContents(data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch legal content');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (content: LegalContent) => {
        setEditingContent(content);
        setPreviewMode(false);
    };

    const handleCreateNew = (type: 'terms' | 'privacy') => {
        setEditingContent({
            type,
            title: type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy',
            content: '',
            isActive: true,
        });
        setPreviewMode(false);
    };

    const handleSave = async () => {
        if (!editingContent?.content) {
            toast.error('Content is required');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/admin/content/legal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingContent),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Content saved successfully');
                setEditingContent(null);
                fetchContents();
            } else {
                toast.error(data.error || 'Failed to save content');
            }
        } catch (error) {
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Document',
            message: 'Are you sure you want to delete this content?',
            destructive: true
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/content/legal/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Content deleted');
                fetchContents();
            }
        } catch (error) {
            toast.error('Failed to delete content');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-gray-400 font-medium">Loading CMS...</p>
            </div>
        );
    }

    if (editingContent) {
        return (
            <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setEditingContent(null)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-white capitalize">
                            Edit {editingContent.type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                                previewMode ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                            }`}
                        >
                            {previewMode ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            {previewMode ? 'Back to Editor' : 'Preview'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-900/20"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">Document Title</label>
                                <input 
                                    type="text" 
                                    value={editingContent.title || ''}
                                    onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white font-medium"
                                    placeholder="Enter title..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">Status</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setEditingContent({ ...editingContent, isActive: !editingContent.isActive })}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                                            editingContent.isActive 
                                                ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                                                : 'bg-red-600/20 text-red-400 border border-red-600/30'
                                        }`}
                                    >
                                        {editingContent.isActive ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {editingContent.isActive ? 'Active' : 'Inactive'}
                                    </button>
                                    <p className="text-xs text-gray-500">Toggle to enable/disable this content on the live site.</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-400">Content (HTML Supported)</label>
                                {!previewMode ? (
                                    <textarea 
                                        value={editingContent.content || ''}
                                        onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 min-h-[500px] outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white font-mono text-sm leading-relaxed"
                                        placeholder="<h1>Heading</h1><p>Your content here...</p>"
                                    />
                                ) : (
                                    <div className="w-full bg-white border border-gray-200 rounded-2xl p-8 min-h-[500px] overflow-auto">
                                        <div 
                                            className="prose prose-slate max-w-none text-black"
                                            dangerouslySetInnerHTML={{ __html: editingContent.content || '' }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hidden lg:block space-y-4">
                            <div className="p-6 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
                                <h3 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" />
                                    Quick Tips
                                </h3>
                                <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                                    <li>Use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt; for formatting.</li>
                                    <li>Links can be added with &lt;a href="..."&gt;Text&lt;/a&gt;.</li>
                                    <li>Preview your changes before saving to ensure correct rendering.</li>
                                    <li>Setting "Inactive" will hide this content from users.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {['terms', 'privacy'].map((type) => {
                const item = contents.find(c => c.type === type);
                return (
                    <div key={type} className="bg-[#111] rounded-2xl border border-white/5 p-8 flex flex-col justify-between group hover:border-white/20 transition-all shadow-xl">
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white capitalize">
                                    {type === 'terms' ? 'Terms & Conditions' : 'Privacy Policy'}
                                </h2>
                                {item && (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        item.isActive ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'
                                    }`}>
                                        {item.isActive ? 'Live' : 'Hidden'}
                                    </span>
                                )}
                            </div>
                            
                            {item ? (
                                <div className="space-y-4">
                                    <div className="text-gray-400 line-clamp-3 text-sm leading-relaxed" 
                                        dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]*>/g, '') }} 
                                    />
                                    <div className="text-xs text-gray-500 font-medium">
                                        Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-sm italic mb-8">
                                    No content has been added yet.
                                </div>
                            )}
                        </div>

                        <div className="mt-10 flex items-center gap-3">
                            {item ? (
                                <>
                                    <button 
                                        onClick={() => handleEdit(item)}
                                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Edit Content
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(item._id)}
                                        className="p-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-xl transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={() => handleCreateNew(type as any)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Document
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Plus({ className }: { className?: string }) {
    return (
        <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );
}
