"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/context/ToastContext';
import Link from 'next/link';
import { ArrowLeft, Eye, Loader } from 'lucide-react';

interface FormData {
    _id?: string;
    date: string;
    verseBook: string;
    verseChapter: string;
    verseNumber: string;
    verseReference?: string;
    devotionalTitle: string;
    devotionalContent: string;
    devotionalVerseRef: string;
    backgroundImage: string;
    devotionalBackgroundImage: string;
    isPublished: boolean;
}

function ManageForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const id = searchParams.get('id');

    const [loading, setLoading] = useState(!!id);
    const [submitting, setSubmitting] = useState(false);
    const [previewText, setPreviewText] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState(false);
    const [previewVersion, setPreviewVersion] = useState('KJV');

    const [formData, setFormData] = useState<FormData>({
        date: new Date().toISOString().split('T')[0],
        verseBook: '',
        verseChapter: '',
        verseNumber: '',
        devotionalTitle: '',
        devotionalContent: '',
        devotionalVerseRef: '',
        backgroundImage: '',
        devotionalBackgroundImage: '',
        isPublished: true,
    });

    const set = (field: keyof FormData, value: any) =>
        setFormData(prev => ({ ...prev, [field]: value }));

    useEffect(() => {
        if (id) {
            fetch(`/api/admin/daily-content/${id}`)
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        const d = res.data;
                        setFormData({
                            _id: d._id,
                            date: d.date,
                            verseBook: d.verseBook || '',
                            verseChapter: String(d.verseChapter || ''),
                            verseNumber: String(d.verseNumber || ''),
                            devotionalTitle: d.devotionalTitle || '',
                            devotionalContent: d.devotionalContent || '',
                            devotionalVerseRef: d.devotionalVerseRef || '',
                            backgroundImage: d.backgroundImage || '',
                            devotionalBackgroundImage: d.devotionalBackgroundImage || '',
                            isPublished: d.isPublished ?? true,
                        });
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handlePreview = async () => {
        if (!formData.verseBook || !formData.verseChapter || !formData.verseNumber) return;
        setPreviewing(true);
        setPreviewText(null);
        try {
            const res = await fetch(
                `/api/daily?days=1&version=${previewVersion}`
            );
            // Actually resolve inline via the Bible API
            const bibleRes = await fetch(
                `/api/v1/bible/${previewVersion}/${encodeURIComponent(formData.verseBook)}/${formData.verseChapter}`
            );
            const data = await bibleRes.json();
            if (data.verses) {
                const verse = data.verses.find((v: any) => v.number === parseInt(formData.verseNumber));
                setPreviewText(verse?.text || 'Verse not found in this version.');
            } else {
                setPreviewText('Could not resolve verse text.');
            }
        } catch (e) {
            setPreviewText('Preview failed. Check verse reference.');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                verseChapter: parseInt(formData.verseChapter, 10),
                verseNumber: parseInt(formData.verseNumber, 10),
                contentYear: parseInt(formData.date.substring(0, 4), 10),
                verseReference: `${formData.verseBook} ${formData.verseChapter}:${formData.verseNumber}`,
            };

            const url = id ? `/api/admin/daily-content/${id}` : '/api/admin/daily-content';
            const method = id ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (result.success) {
                toast.success('Daily content saved successfully');
                router.push('/admin/content/daily-content');
                router.refresh();
            } else {
                toast.error(result.error || 'Failed to save');
            }
        } catch {
            toast.error('Error saving content');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="p-20 text-center text-gray-500">
                <div className="size-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading...
            </div>
        );
    }

    const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-700";

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 pb-20">
            {/* ── Scheduling ── */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl">
                <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">Scheduling</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Schedule Date</label>
                        <input type="date" value={formData.date} onChange={e => set('date', e.target.value)} className={inputClass} required />
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
                        <input
                            type="checkbox"
                            id="isPublished"
                            checked={formData.isPublished}
                            onChange={e => set('isPublished', e.target.checked)}
                            className="size-5 rounded border-white/10 bg-white/5 accent-blue-500"
                        />
                        <label htmlFor="isPublished" className="text-white font-medium cursor-pointer">Publish immediately</label>
                    </div>
                </div>
            </div>

            {/* ── Daily Verse ── */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
                <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">📖 Daily Verse Reference</h3>
                <p className="text-gray-500 text-sm">Enter the structured reference. The verse text will be resolved dynamically per user's Bible version.</p>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Book Name</label>
                        <input type="text" value={formData.verseBook} onChange={e => set('verseBook', e.target.value)} className={inputClass} placeholder="e.g. Psalms" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Chapter</label>
                        <input type="number" min="1" value={formData.verseChapter} onChange={e => set('verseChapter', e.target.value)} className={inputClass} placeholder="23" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Verse</label>
                        <input type="number" min="1" value={formData.verseNumber} onChange={e => set('verseNumber', e.target.value)} className={inputClass} placeholder="1" required />
                    </div>
                </div>

                {/* Preview */}
                <div className="flex items-center gap-3">
                    <select
                        value={previewVersion}
                        onChange={e => setPreviewVersion(e.target.value)}
                        className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none"
                    >
                        {['KJV', 'NIV', 'ESV', 'HINBSI', 'TELBSI'].map(v => <option key={v}>{v}</option>)}
                    </select>
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={previewing || !formData.verseBook || !formData.verseChapter || !formData.verseNumber}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                    >
                        {previewing ? <Loader className="size-4 animate-spin" /> : <Eye className="size-4" />}
                        Preview Verse Text
                    </button>
                </div>

                {previewText && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-5 py-4">
                        <p className="text-xs text-blue-400 font-bold uppercase mb-2">{previewVersion} Translation</p>
                        <p className="text-white italic leading-relaxed">"{previewText}"</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Verse Background Image URL (Optional)</label>
                    <input type="url" value={formData.backgroundImage} onChange={e => set('backgroundImage', e.target.value)} className={inputClass} placeholder="https://... or /uploads/daily-content/bg.jpg" />
                </div>
            </div>

            {/* ── Devotional ── */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
                <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">🙏 Daily Devotional</h3>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Key Verse Reference <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.devotionalVerseRef} onChange={e => set('devotionalVerseRef', e.target.value)} className={inputClass} placeholder="e.g. Romans 8:28" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Devotional Title</label>
                    <input type="text" value={formData.devotionalTitle} onChange={e => set('devotionalTitle', e.target.value)} className={inputClass} placeholder="Enter title..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Devotional Content</label>
                    <textarea value={formData.devotionalContent} onChange={e => set('devotionalContent', e.target.value)} className={`${inputClass} h-48 resize-none`} placeholder="Write the devotional content here..." />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Devotional Background Image URL (Optional)</label>
                    <input type="url" value={formData.devotionalBackgroundImage} onChange={e => set('devotionalBackgroundImage', e.target.value)} className={inputClass} placeholder="https://... or /uploads/daily-content/bg.jpg" />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-2">
                <Link href="/admin/content/daily-content" className="px-6 py-3 text-gray-400 hover:text-white font-bold transition-colors">
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
                <Link href="/admin/content/daily-content" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
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
