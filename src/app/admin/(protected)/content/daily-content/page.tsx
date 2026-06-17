"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';
import {
    Calendar, BookOpen, Image as ImageIcon, BarChart2, Upload,
    Download, Search, ChevronLeft, ChevronRight, Trash2, Edit,
    Plus, RefreshCw, Filter, X, AlertTriangle, FileSpreadsheet
} from 'lucide-react';
import { BulkUploadZone } from './BulkUploadZone';
import { UploadResultModal } from './UploadResultModal';
import { ImageUploadManager } from './ImageUploadManager';
import { CoverageCalendar } from './CoverageCalendar';

type Tab = 'verse' | 'devotional' | 'images' | 'coverage';

interface DailyContent {
    _id: string;
    date: string;
    verseReference: string;
    verseBook: string;
    verseChapter: number;
    verseNumber: number;
    devotionalTitle?: string;
    devotionalVerseRef?: string;
    backgroundImage?: string;
    isPublished: boolean;
}

interface UploadResult {
    total: number;
    imported: number;
    skipped?: number;
    errorCount: number;
    errors: any[];
    failedRowsCsv?: string;
}

const TABS = [
    { id: 'verse' as Tab, label: 'Verse Schedule', icon: BookOpen },
    { id: 'devotional' as Tab, label: 'Devotional Manager', icon: Calendar },
    { id: 'images' as Tab, label: 'Image Manager', icon: ImageIcon },
    { id: 'coverage' as Tab, label: 'Coverage Dashboard', icon: BarChart2 },
];

export default function DailyContentManagement() {
    const confirm = useConfirm();
    const [activeTab, setActiveTab] = useState<Tab>('verse');

    // Data state
    const [contents, setContents] = useState<DailyContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const LIMIT = 50;

    // Filters
    const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
    const [monthFilter, setMonthFilter] = useState<number | ''>('');
    const [searchDate, setSearchDate] = useState('');

    // Upload state
    const [uploadingVerse, setUploadingVerse] = useState(false);
    const [uploadingDevotion, setUploadingDevotion] = useState(false);
    const [verseResult, setVerseResult] = useState<UploadResult | null>(null);
    const [devotionResult, setDevotionResult] = useState<UploadResult | null>(null);

    // Coverage state
    const [coverageYear, setCoverageYear] = useState(new Date().getFullYear());
    const [coverage, setCoverage] = useState<any>(null);
    const [loadingCoverage, setLoadingCoverage] = useState(false);

    const fetchContents = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: String(LIMIT),
                year: String(yearFilter),
                ...(monthFilter ? { month: String(monthFilter) } : {}),
                ...(activeTab === 'devotional' ? { hasDevotional: 'true' } : {}),
            });
            const res = await fetch(`/api/admin/daily-content?${params}`);
            const result = await res.json();
            if (result.success) {
                setContents(result.data);
                setTotal(result.pagination?.total || 0);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [page, yearFilter, monthFilter, activeTab]);

    useEffect(() => {
        if (activeTab === 'verse' || activeTab === 'devotional') {
            fetchContents();
        }
    }, [activeTab, fetchContents]);

    const fetchCoverage = useCallback(async (year: number) => {
        setLoadingCoverage(true);
        try {
            const res = await fetch(`/api/admin/daily-content/coverage?year=${year}`);
            const data = await res.json();
            if (data.success) setCoverage(data.data);
        } catch (e) {
            console.error('Coverage error:', e);
        } finally {
            setLoadingCoverage(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'coverage') fetchCoverage(coverageYear);
    }, [activeTab, coverageYear, fetchCoverage]);

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Record',
            message: 'Are you sure you want to delete this record?',
            destructive: true
        });
        if (!confirmed) return;
        const res = await fetch(`/api/admin/daily-content/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            toast.success('Record deleted successfully');
            fetchContents();
        } else {
            toast.error(data.error || 'Failed to delete');
        }
    };

    const handleDeleteAll = async () => {
        const confirmed = await confirm({
            title: 'Delete All Records',
            message: '⚠️ This will DELETE ALL daily content records. This is irreversible. Continue?',
            destructive: true
        });
        if (!confirmed) return;
        const res = await fetch('/api/admin/daily-content', { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            fetchContents();
            toast.success(`Deleted ${data.deleted} records.`);
        } else {
            toast.error(data.error || 'Failed to delete all');
        }
    };

    const handleBulkVerseUpload = async (file: File) => {
        setUploadingVerse(true);
        setVerseResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/daily-content/bulk-verse', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setVerseResult(data.data);
                toast.success('Verses uploaded successfully');
                fetchContents();
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch (e) {
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploadingVerse(false);
        }
    };

    const handleBulkDevotionUpload = async (file: File) => {
        setUploadingDevotion(true);
        setDevotionResult(null);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/daily-content/bulk-devotional', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                setDevotionResult(data.data);
                toast.success('Devotionals uploaded successfully');
                fetchContents();
            } else {
                toast.error(data.error || 'Upload failed');
            }
        } catch (e) {
            toast.error('Upload failed. Please try again.');
        } finally {
            setUploadingDevotion(false);
        }
    };

    const downloadTemplate = (type: 'verse' | 'devotional', format: 'csv' | 'xlsx') => {
        window.open(`/api/admin/daily-content/sample-template?type=${type}&format=${format}`, '_blank');
    };

    const downloadMissingDates = () => {
        if (!coverage?.missingDates?.length) return;
        const csv = ['Date', ...coverage.missingDates].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `missing-dates-${coverageYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const filteredContents = searchDate
        ? contents.filter(c => c.date.includes(searchDate))
        : contents;

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i);
    const months = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        <Link href="/admin/content" className="hover:text-white transition-colors">Content</Link>
                        <span>/</span>
                        <span className="text-gray-200">Daily Content</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Daily Content CMS</h1>
                    <p className="text-gray-400 mt-1">Bulk upload and manage verses, devotionals, and more.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDeleteAll}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Trash2 className="size-4" />
                        Clear All
                    </button>
                    <Link
                        href="/admin/content/daily-content/manage"
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20 text-sm"
                    >
                        <Plus className="size-4" />
                        Add Single
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/5 overflow-x-auto">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-shrink-0
                                ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Icon className="size-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── TAB: VERSE SCHEDULE ── */}
            {activeTab === 'verse' && (
                <div className="space-y-6">
                    {/* Bulk Upload */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-white font-bold text-lg">Bulk Upload — Daily Verses</h2>
                                <p className="text-gray-500 text-sm mt-1">Upload a CSV or XLSX with Date, Book, Chapter, Verse columns</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadTemplate('verse', 'csv')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-medium transition-colors"
                                >
                                    <Download className="size-3.5" />
                                    CSV Template
                                </button>
                                <button
                                    onClick={() => downloadTemplate('verse', 'xlsx')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="size-3.5" />
                                    XLSX Template
                                </button>
                            </div>
                        </div>

                        <BulkUploadZone
                            onUpload={handleBulkVerseUpload}
                            uploading={uploadingVerse}
                            label="Drop your Verse Schedule CSV / XLSX here"
                            description="Required columns: Date, Book Name, Chapter Number, Verse Number"
                        />
                    </div>

                    {/* Filters + Table */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <Search className="size-4 text-gray-500" />
                                <input
                                    type="text"
                                    value={searchDate}
                                    onChange={e => setSearchDate(e.target.value)}
                                    placeholder="Search by date (e.g. 2026-05)"
                                    className="bg-transparent text-white text-sm placeholder:text-gray-600 outline-none flex-1"
                                />
                                {searchDate && <button onClick={() => setSearchDate('')}><X className="size-4 text-gray-500" /></button>}
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={yearFilter}
                                    onChange={e => { setYearFilter(Number(e.target.value)); setPage(1); }}
                                    className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select
                                    value={monthFilter}
                                    onChange={e => { setMonthFilter(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
                                    className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none"
                                >
                                    {months.map((m, i) => <option key={i} value={i || ''}>{i === 0 ? 'All Months' : m}</option>)}
                                </select>
                                <button onClick={fetchContents} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10">
                                    <RefreshCw className={`size-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-16 text-center">
                                <div className="size-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Loading schedule...</p>
                            </div>
                        ) : filteredContents.length === 0 ? (
                            <div className="p-16 text-center text-gray-500">
                                <Calendar className="size-10 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">No verses scheduled yet.</p>
                                <p className="text-sm mt-1">Upload a CSV or XLSX file to get started.</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 text-gray-400 text-sm">
                                                <th className="p-4 font-medium">Date</th>
                                                <th className="p-4 font-medium">Verse Reference</th>
                                                <th className="p-4 font-medium">Devotional</th>
                                                <th className="p-4 font-medium">Status</th>
                                                <th className="p-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {filteredContents.map(item => (
                                                <tr key={item._id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 font-mono text-white font-medium">{item.date}</td>
                                                    <td className="p-4 text-gray-300">
                                                        <span className="font-medium text-blue-400">{item.verseReference}</span>
                                                    </td>
                                                    <td className="p-4 text-gray-400 max-w-[200px] truncate">
                                                        {item.devotionalTitle || <span className="text-gray-600 italic">—</span>}
                                                    </td>
                                                    <td className="p-4">
                                                        {item.isPublished
                                                            ? <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-bold uppercase">Published</span>
                                                            : <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs font-bold uppercase">Draft</span>
                                                        }
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link
                                                                href={`/admin/content/daily-content/manage?id=${item._id}`}
                                                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
                                                            >
                                                                <Edit className="size-3.5" /> Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => handleDelete(item._id)}
                                                                className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs"
                                                            >
                                                                <Trash2 className="size-3.5" /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {total > LIMIT && (
                                    <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
                                        <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-40"
                                            >
                                                <ChevronLeft className="size-4" />
                                            </button>
                                            <span className="text-white font-medium">Page {page}</span>
                                            <button
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={page * LIMIT >= total}
                                                className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-40"
                                            >
                                                <ChevronRight className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: DEVOTIONAL MANAGER ── */}
            {activeTab === 'devotional' && (
                <div className="space-y-6">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-white font-bold text-lg">Bulk Upload — Devotionals</h2>
                                <p className="text-gray-500 text-sm mt-1">Upload CSV / XLSX with: Date, Verse Reference, Title, Body, Background URL</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => downloadTemplate('devotional', 'csv')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-medium transition-colors"
                                >
                                    <Download className="size-3.5" />
                                    CSV Template
                                </button>
                                <button
                                    onClick={() => downloadTemplate('devotional', 'xlsx')}
                                    className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-medium transition-colors"
                                >
                                    <FileSpreadsheet className="size-3.5" />
                                    XLSX Template
                                </button>
                            </div>
                        </div>

                        <BulkUploadZone
                            onUpload={handleBulkDevotionUpload}
                            uploading={uploadingDevotion}
                            label="Drop your Devotional Schedule CSV / XLSX here"
                            description="Required columns: Date, Verse Reference, Title, Body"
                        />
                    </div>

                    {/* Devotional table (reuse same data) */}
                    <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-white/5">
                            <h3 className="text-white font-semibold text-sm">Scheduled Devotionals</h3>
                        </div>
                        {loading ? (
                            <div className="p-16 text-center">
                                <div className="size-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Loading...</p>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/5 text-gray-400 text-sm">
                                                <th className="p-4 font-medium">Date</th>
                                                <th className="p-4 font-medium">Key Verse</th>
                                                <th className="p-4 font-medium">Title</th>
                                                <th className="p-4 font-medium text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-sm">
                                            {filteredContents.filter(c => c.devotionalTitle).map(item => (
                                                <tr key={item._id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="p-4 font-mono text-white font-medium">{item.date}</td>
                                                    <td className="p-4 text-pink-400 font-medium">{item.devotionalVerseRef || '—'}</td>
                                                    <td className="p-4 text-gray-300 max-w-xs truncate">{item.devotionalTitle}</td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Link
                                                                href={`/admin/content/daily-content/manage?id=${item._id}`}
                                                                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
                                                            >
                                                                <Edit className="size-3.5" /> Edit
                                                            </Link>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredContents.filter(c => c.devotionalTitle).length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="p-16 text-center text-gray-500">
                                                        <Calendar className="size-10 mx-auto mb-3 opacity-30" />
                                                        <p>No devotionals scheduled yet.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Pagination */}
                                {total > LIMIT && (
                                    <div className="p-4 border-t border-white/5 flex items-center justify-between text-sm text-gray-400">
                                        <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-40"
                                            >
                                                <ChevronLeft className="size-4" />
                                            </button>
                                            <span className="text-white font-medium">Page {page}</span>
                                            <button
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={page * LIMIT >= total}
                                                className="p-1.5 hover:bg-white/5 rounded-lg disabled:opacity-40"
                                            >
                                                <ChevronRight className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── TAB: IMAGE MANAGER ── */}
            {activeTab === 'images' && (
                <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                    <div className="mb-6">
                        <h2 className="text-white font-bold text-lg">Background Image Manager</h2>
                        <p className="text-gray-500 text-sm mt-1">Upload images and copy their URLs to use in verse & devotional backgrounds</p>
                    </div>
                    <ImageUploadManager />
                </div>
            )}

            {/* ── TAB: COVERAGE DASHBOARD ── */}
            {activeTab === 'coverage' && (
                <div className="space-y-6">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div>
                                <h2 className="text-white font-bold text-lg">Yearly Coverage Dashboard</h2>
                                <p className="text-gray-500 text-sm mt-1">See which days have verses scheduled vs. missing</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={coverageYear}
                                    onChange={e => setCoverageYear(Number(e.target.value))}
                                    className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 outline-none text-sm"
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                {coverage?.missingDates?.length > 0 && (
                                    <button
                                        onClick={downloadMissingDates}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors"
                                    >
                                        <Download className="size-4" />
                                        Missing Dates CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        <CoverageCalendar
                            year={coverageYear}
                            configuredDates={coverage?.configuredDates || []}
                            isLoading={loadingCoverage}
                        />
                    </div>
                </div>
            )}

            {/* Upload Result Modals */}
            {verseResult && (
                <UploadResultModal
                    result={verseResult}
                    onClose={() => { setVerseResult(null); fetchContents(); }}
                    type="verse"
                />
            )}
            {devotionResult && (
                <UploadResultModal
                    result={devotionResult}
                    onClose={() => { setDevotionResult(null); fetchContents(); }}
                    type="devotional"
                />
            )}
        </div>
    );
}
