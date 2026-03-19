"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface BibleVersion {
    _id: string;
    name: string;
    abbreviation: string;
    language: string;
    copyright?: string;
    status: 'active' | 'importing' | 'failed';
    importProgress: number;
}

export default function BibleVersionsManagement() {
    const [versions, setVersions] = useState<BibleVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            showToast('Please upload a valid JSON file.', 'error');
            return;
        }

        setUploading(true);
        try {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                showToast('Invalid JSON file format.', 'error');
                return;
            }

            if (!data.metadata || !data.verses) {
                showToast('JSON must contain "metadata" and "verses".', 'error');
                return;
            }

            // Step 1: Init Import
            showToast('Initializing import...', 'success');
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
                // (Using toast for now to keep it simple)
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
                showToast('Import completed successfully!', 'success');
                fetchVersions();
            } else {
                throw new Error('Failed to finalize import');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            showToast(err.message || 'Error uploading file', 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated books, chapters, and verses. This action CANNOT be undone.`)) {
            return;
        }

        try {
            const res = await fetch(`/api/v1/versions/${id}`, {
                method: 'DELETE',
            });
            const result = await res.json();
            if (result.success) {
                showToast('Version deleted successfully.', 'success');
                fetchVersions();
            } else {
                showToast(result.error || 'Delete failed', 'error');
            }
        } catch (err) {
            showToast('Error deleting version', 'error');
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    <div className="flex items-center space-x-3">
                        <span className="text-xl">{toast.type === 'success' ? '✅' : '❌'}</span>
                        <p className="font-bold">{toast.message}</p>
                    </div>
                </div>
            )}

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
                                    <th className="px-6 py-4">Progress / Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {versions.map(version => (
                                    <tr key={version._id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{version.name}</div>
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{version.language}</div>
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
                                                    Importing
                                                </span>
                                            ) : version.status === 'failed' ? (
                                                <span className="flex items-center text-xs text-red-500 font-bold uppercase">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                                                    Failed
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-xs text-green-500 font-bold uppercase">
                                                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {version.status === 'importing' ? (
                                                <div className="w-full max-w-[200px]">
                                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1 font-bold">
                                                        <span>PROGRESS</span>
                                                        <span>{version.importProgress}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-500 transition-all duration-500"
                                                            style={{ width: `${version.importProgress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center space-x-4">
                                                    <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider">
                                                        Manage
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(version._id, version.name)}
                                                        className="text-[10px] font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-wider"
                                                    >
                                                        Delete
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
        </div>
    );
}

