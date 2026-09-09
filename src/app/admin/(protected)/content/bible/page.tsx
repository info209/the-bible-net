"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

interface BibleVersion {
    _id: string;
    name: string;
    abbreviation: string;
    language: string;
    copyright?: string;
    licenseType?: 'public-domain' | 'licensed' | 'proprietary' | 'unknown';
    status: 'active' | 'inactive' | 'importing' | 'failed';
    importProgress?: number;
    isActive?: boolean;
}

export default function BibleVersionsManagement() {
    const confirm = useConfirm();
    const [versions, setVersions] = useState<BibleVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit modal states
    const [editingVersion, setEditingVersion] = useState<BibleVersion | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        abbreviation: '',
        language: '',
        copyright: '',
        licenseType: 'unknown' as 'public-domain' | 'licensed' | 'proprietary' | 'unknown',
        status: 'active' as 'active' | 'inactive',
    });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        fetchVersions();
    }, []);

    // Poll for progress if any version is importing
    useEffect(() => {
        const hasImporting = versions.some(v => v.status === 'importing');
        if (hasImporting) {
            const interval = setInterval(fetchVersions, 3000);
            return () => clearInterval(interval);
        }
    }, [versions]);

    const fetchVersions = async () => {
        try {
            const res = await fetch('/api/v1/versions');
            const result = await res.json();
            if (result.success) {
                setVersions(result.data);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to fetch versions');
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            toast.error('Please upload a valid JSON file.');
            return;
        }

        setUploading(true);
        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                toast.error('Invalid JSON file format.');
                return;
            }

            if (!data.metadata || !data.verses) {
                toast.error('JSON must contain "metadata" and "verses".');
                return;
            }

            // Step 1: Init Import
            toast.success('Initializing import...');
            const initRes = await fetch('/api/v1/versions/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metadata: data.metadata, action: 'init' }),
            });

            if (!initRes.ok) {
                const err = await initRes.json();
                throw new Error(err.error || 'Failed to initialize import');
            }

            const { versionId } = await initRes.json();

            // Step 2: Group verses by book and upload one by one
            const versesByBook = new Map<number, any[]>();
            for (const v of data.verses) {
                if (!versesByBook.has(v.book)) {
                    versesByBook.set(v.book, []);
                }
                versesByBook.get(v.book)!.push(v);
            }

            const bookNums = Array.from(versesByBook.keys()).sort((a, b) => a - b);
            const totalBooks = bookNums.length;

            for (let i = 0; i < totalBooks; i++) {
                const bookNum = bookNums[i];
                const verses = versesByBook.get(bookNum)!;
                const progress = Math.round(((i + 1) / totalBooks) * 100);

                // Update UI state if you want real-time progress in the button
                if (i % 5 === 0 || i === totalBooks - 1) {
                   console.log(`Uploading book ${bookNum} (${i + 1}/${totalBooks})...`);
                }

                const bookRes = await fetch('/api/v1/versions/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'book',
                        versionId,
                        bookNum,
                        verses,
                        progress: progress < 100 ? progress : 99 // Keep as importing until finalize
                    }),
                });

                if (!bookRes.ok) {
                    throw new Error(`Failed to upload book ${bookNum}`);
                }
            }

            // Step 3: Finalize
            const finalizeRes = await fetch('/api/v1/versions/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId, action: 'finalize', progress: 100 }),
            });

            if (finalizeRes.ok) {
                toast.success('Import completed successfully!');
                fetchVersions();
            } else {
                throw new Error('Failed to finalize import');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            toast.error(err.message || 'Error uploading file');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEditClick = (version: BibleVersion) => {
        setEditingVersion(version);
        setEditForm({
            name: version.name || '',
            abbreviation: version.abbreviation || '',
            language: version.language || '',
            copyright: version.copyright || '',
            licenseType: version.licenseType || 'unknown',
            status: version.status === 'inactive' ? 'inactive' : 'active',
        });
        setEditErrors({});
    };

    const handleCancelEdit = () => {
        setEditingVersion(null);
        setEditErrors({});
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVersion) return;

        const errors: Record<string, string> = {};
        if (!editForm.name.trim()) errors.name = 'Version name is required';
        if (!editForm.abbreviation.trim()) {
            errors.abbreviation = 'Abbreviation is required';
        } else if (!/^[A-Za-z0-9_-]{1,10}$/.test(editForm.abbreviation.trim())) {
            errors.abbreviation = 'Abbreviation must be 1-10 alphanumeric characters';
        }
        if (!editForm.language.trim()) {
            errors.language = 'Language code is required';
        } else if (!/^[a-zA-Z]{2,3}$/.test(editForm.language.trim())) {
            errors.language = 'Language must be a 2-3 letter ISO code (e.g., en, es, hi)';
        }
        if (editForm.copyright && editForm.copyright.length > 500) {
            errors.copyright = 'Copyright must not exceed 500 characters';
        }

        if (Object.keys(errors).length > 0) {
            setEditErrors(errors);
            return;
        }

        setSavingEdit(true);
        try {
            const payload = {
                name: editForm.name.trim(),
                abbreviation: editForm.abbreviation.trim().toUpperCase(),
                language: editForm.language.trim().toLowerCase(),
                copyright: editForm.copyright.trim() || undefined,
                licenseType: editForm.licenseType,
                status: editForm.status,
                isActive: editForm.status === 'active',
            };

            const res = await fetch(`/api/v1/versions/${editingVersion._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (result.success && result.data) {
                toast.success('Bible version updated successfully!');
                setVersions(prev => prev.map(v => v._id === editingVersion._id ? { ...v, ...result.data } : v));
                setEditingVersion(null);
            } else {
                toast.error(result.error || 'Failed to update version');
            }
        } catch (err: any) {
            toast.error(err.message || 'Error updating version');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirm({
            title: 'Delete Bible Version',
            message: `Are you sure you want to delete "${name}"? This will also delete all associated books, chapters, and verses. This action CANNOT be undone.`,
            destructive: true
        });
        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/v1/versions/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                toast.success('Version deleted successfully.');
                fetchVersions();
            } else {
                toast.error(result.error || 'Delete failed');
            }
        } catch (err) {
            toast.error('Error deleting version');
        }
    };

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">Bible Versions</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Bible Versions</h1>
                    <p className="text-gray-400 mt-1">Manage Bible translations and track database status</p>
                </div>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".json"
                    />
                    <button
                        onClick={handleUploadClick}
                        disabled={uploading}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {uploading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Reading file...</span>
                            </>
                        ) : (
                            <>
                                <span>📤 Upload Version</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        Loading versions...
                    </div>
                ) : error ? (
                    <div className="p-20 text-center text-red-400">
                        {error}
                        <button onClick={fetchVersions} className="block mx-auto mt-4 text-sm text-blue-400 hover:underline">Try Again</button>
                    </div>
                ) : versions.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">
                        <div className="text-4xl mb-4">📖</div>
                        <p>No Bible versions found.</p>
                        <p className="border mt-4 text-xs">Upload a JSON file to get started.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-400 font-bold border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Version Name</th>
                                    <th className="px-6 py-4">Abbr</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {versions.map(version => (
                                    <tr key={version._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{version.name}</div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{version.language}</span>
                                                {version.licenseType && (
                                                    <span className="text-[10px] text-gray-600 uppercase font-medium">· {version.licenseType}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-bold uppercase">
                                                {version.abbreviation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {version.status === 'importing' ? (
                                                <span className="flex items-center text-xs text-yellow-500 font-bold uppercase animate-pulse">
                                                    <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                                                    Importing ({version.importProgress || 0}%)
                                                </span>
                                            ) : version.status === 'failed' ? (
                                                <span className="flex items-center text-xs text-red-500 font-bold uppercase">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                                    Failed
                                                </span>
                                            ) : version.status === 'inactive' ? (
                                                <span className="flex items-center text-xs text-gray-400 font-bold uppercase">
                                                    <span className="w-2 h-2 bg-gray-500 rounded-full mr-2"></span>
                                                    Inactive
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-xs text-green-500 font-bold uppercase">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {version.status === 'importing' ? (
                                                <div className="w-full max-w-[160px] ml-auto">
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${version.importProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => handleEditClick(version)}
                                                        className="px-3 py-1.5 text-xs font-medium text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg transition-all flex items-center gap-1.5"
                                                        title="Edit Version Metadata"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        <span>Edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(version._id, version.name)}
                                                        className="px-3 py-1.5 text-xs font-medium text-red-400/80 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all flex items-center gap-1.5"
                                                        title="Delete Version"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Version Modal */}
            {editingVersion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h2 className="text-xl font-bold text-white">Edit Bible Version</h2>
                                <p className="text-xs text-gray-400 mt-0.5">Update metadata for {editingVersion.name}</p>
                            </div>
                            <button
                                onClick={handleCancelEdit}
                                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            {/* Version Name */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Version Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="e.g. King James Version"
                                    required
                                />
                                {editErrors.name && (
                                    <p className="text-xs text-red-400 mt-1">{editErrors.name}</p>
                                )}
                            </div>

                            {/* Abbreviation & Language in a 2-col grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                        Abbreviation <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.abbreviation}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, abbreviation: e.target.value.toUpperCase() }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono uppercase"
                                        placeholder="e.g. KJV"
                                        maxLength={10}
                                        required
                                    />
                                    {editErrors.abbreviation && (
                                        <p className="text-xs text-red-400 mt-1">{editErrors.abbreviation}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                        Language Code <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.language}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, language: e.target.value.toLowerCase() }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors font-mono lowercase"
                                        placeholder="e.g. en, es, hi"
                                        maxLength={3}
                                        required
                                    />
                                    {editErrors.language && (
                                        <p className="text-xs text-red-400 mt-1">{editErrors.language}</p>
                                    )}
                                </div>
                            </div>

                            {/* License Type & Status in a 2-col grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                        License Type
                                    </label>
                                    <select
                                        value={editForm.licenseType}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, licenseType: e.target.value as any }))}
                                        className="w-full bg-[#202024] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="public-domain">Public Domain</option>
                                        <option value="licensed">Licensed</option>
                                        <option value="proprietary">Proprietary</option>
                                        <option value="unknown">Unknown</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                        Status
                                    </label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                                        className="w-full bg-[#202024] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    >
                                        <option value="active">Active (Visible)</option>
                                        <option value="inactive">Inactive (Hidden)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Copyright */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                                    Copyright Notice / Attribution
                                </label>
                                <textarea
                                    value={editForm.copyright}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, copyright: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600 resize-none h-20"
                                    placeholder="e.g. Public Domain. Free for non-commercial and commercial distribution."
                                    maxLength={500}
                                />
                                <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                                    <span>Optional legal attribution</span>
                                    <span>{editForm.copyright.length}/500</span>
                                </div>
                                {editErrors.copyright && (
                                    <p className="text-xs text-red-400 mt-1">{editErrors.copyright}</p>
                                )}
                            </div>

                            {/* Note about Scripture preservation */}
                            <div className="p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl text-xs text-gray-400 flex items-start gap-2">
                                <span className="text-blue-400 font-bold">ℹ</span>
                                <span>Editing version metadata does not modify, re-import, or delete any chapters or verses.</span>
                            </div>

                            {/* Form Buttons */}
                            <div className="pt-2 flex justify-end space-x-3 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    disabled={savingEdit}
                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-medium rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {savingEdit ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Changes</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

