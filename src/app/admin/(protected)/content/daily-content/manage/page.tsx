"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/context/ToastContext';
import Link from 'next/link';
import { ArrowLeft, Eye, Loader, Plus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { parseSingleReference, formatSingleRef } from '@/utils/verseReferenceParser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
    _id?: string;
    date: string;
    // Dynamic list of daily verse reference inputs
    verseRefLines: string[];
    verseBook: string;
    verseChapter: string;
    verseNumber: string;
    verseReference?: string;
    devotionalTitle: string;
    devotionalContent: string;
    // Dynamic list of devotional verse reference inputs
    devotionalVerseRefLines: string[];
    backgroundImage: string;
    devotionalBackgroundImage: string;
    prayerTitle: string;
    prayerContent: string;
    isPublished: boolean;
}

// ─── Verse Reference Input List ───────────────────────────────────────────────

interface VerseRefInputListProps {
    lines: string[];
    onChange: (lines: string[]) => void;
    idPrefix?: string;
}

function VerseRefInputList({ lines, onChange, idPrefix = 'verse-ref' }: VerseRefInputListProps) {
    const inputClass =
        'flex-1 bg-white/5 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder:text-gray-700';

    const handleChange = (index: number, value: string) => {
        const updated = [...lines];
        updated[index] = value;
        onChange(updated);
    };

    const handleAdd = () => {
        onChange([...lines, '']);
    };

    const handleRemove = (index: number) => {
        if (lines.length <= 1) {
            onChange(['']);
            return;
        }
        onChange(lines.filter((_, i) => i !== index));
    };

    return (
        <div className="flex flex-col gap-2">
            {lines.map((line, i) => {
                // Per-field real-time validation
                const trimmed = line.trim();
                let fieldError: string | null = null;
                let fieldValid = false;

                if (trimmed) {
                    const result = parseSingleReference(trimmed);
                    if (result.errors.length > 0) {
                        fieldError = result.errors[0];
                    } else if (result.refs.length > 0) {
                        fieldValid = true;
                    }
                }

                return (
                    <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={line}
                                onChange={e => handleChange(i, e.target.value)}
                                placeholder={
                                    i === 0
                                        ? 'e.g. John 3:16  or  Genesis 1:13-17  or  Genesis 1:13-17,20,22'
                                        : 'e.g. Romans 8:28'
                                }
                                className={`${inputClass} ${
                                    trimmed && fieldError
                                        ? 'border-red-500/60 focus:border-red-500'
                                        : trimmed && fieldValid
                                        ? 'border-emerald-500/50 focus:border-emerald-500'
                                        : 'border-white/10 focus:border-blue-500'
                                }`}
                                autoComplete="off"
                                spellCheck={false}
                                id={`${idPrefix}-${i}`}
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(i)}
                                title="Remove this reference"
                                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Per-field feedback */}
                        {trimmed && fieldError && (
                            <p className="flex items-center gap-1.5 text-xs text-red-400 pl-1">
                                <AlertCircle className="size-3 flex-shrink-0" />
                                {fieldError}
                            </p>
                        )}
                        {trimmed && fieldValid && (
                            <p className="flex items-center gap-1.5 text-xs text-emerald-400 pl-1">
                                <CheckCircle2 className="size-3 flex-shrink-0" />
                                {parseSingleReference(trimmed).refs.map(r => formatSingleRef(r)).join(', ')}
                            </p>
                        )}
                    </div>
                );
            })}

            {/* Add another reference */}
            <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2.5 w-full mt-1 rounded-xl border border-dashed border-white/15 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-sm font-medium"
                id={`add-${idPrefix}-btn`}
            >
                <Plus className="size-4" />
                Add another reference
            </button>
        </div>
    );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

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
        verseRefLines: [''],
        verseBook: '',
        verseChapter: '',
        verseNumber: '',
        devotionalTitle: '',
        devotionalContent: '',
        devotionalVerseRefLines: [''],
        backgroundImage: '',
        devotionalBackgroundImage: '',
        prayerTitle: '',
        prayerContent: '',
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

                        // Reconstruct Daily Verse ref lines:
                        let dailyRefLines: string[] = [''];
                        const { formatSingleRef: fmt } = require('@/utils/verseReferenceParser');
                        if (d.verseRefs && d.verseRefs.length > 0) {
                            dailyRefLines = d.verseRefs.map((r: any) => fmt(r));
                        } else if (d.verseReference) {
                            dailyRefLines = d.verseReference
                                .split(',')
                                .map((l: string) => l.trim())
                                .filter(Boolean);
                            if (dailyRefLines.length === 0) dailyRefLines = [''];
                        } else if (d.verseBook) {
                            dailyRefLines = [`${d.verseBook} ${d.verseChapter}:${d.verseNumber}`];
                        }

                        // Reconstruct Devotional verse ref lines:
                        let devRefLines: string[] = [''];
                        if (d.devotionalVerseRefs && d.devotionalVerseRefs.length > 0) {
                            devRefLines = d.devotionalVerseRefs.map((r: any) => fmt(r));
                        } else if (d.devotionalVerseRef) {
                            devRefLines = d.devotionalVerseRef
                                .split('\n')
                                .map((l: string) => l.trim())
                                .filter(Boolean);
                            if (devRefLines.length === 0) devRefLines = [''];
                        }

                        setFormData({
                            _id: d._id,
                            date: d.date,
                            verseRefLines: dailyRefLines,
                            verseBook: d.verseBook || '',
                            verseChapter: String(d.verseChapter || ''),
                            verseNumber: String(d.verseNumber || ''),
                            devotionalTitle: d.devotionalTitle || '',
                            devotionalContent: d.devotionalContent || '',
                            devotionalVerseRefLines: devRefLines,
                            backgroundImage: d.backgroundImage || '',
                            devotionalBackgroundImage: d.devotionalBackgroundImage || '',
                            prayerTitle: d.prayerTitle || '',
                            prayerContent: d.prayerContent || '',
                            isPublished: d.isPublished ?? true,
                        });
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handlePreview = async () => {
        const activeLines = formData.verseRefLines.map(l => l.trim()).filter(Boolean);
        if (activeLines.length === 0 && (!formData.verseBook || !formData.verseChapter || !formData.verseNumber)) return;
        setPreviewing(true);
        setPreviewText(null);

        try {
            const { parseSingleReference: parseOne } = await import('@/utils/verseReferenceParser');
            const previewRefs: any[] = [];
            for (const line of activeLines) {
                const res = parseOne(line);
                if (res.refs.length > 0) previewRefs.push(...res.refs);
            }

            if (previewRefs.length === 0 && formData.verseBook) {
                previewRefs.push({
                    book: formData.verseBook,
                    chapter: parseInt(formData.verseChapter || '1', 10),
                    startVerse: parseInt(formData.verseNumber || '1', 10),
                    endVerse: parseInt(formData.verseNumber || '1', 10),
                });
            }

            if (previewRefs.length === 0) {
                setPreviewText('Please enter at least one valid verse reference.');
                return;
            }

            const texts: string[] = [];
            for (const ref of previewRefs) {
                const bibleRes = await fetch(
                    `/api/v1/bible/${previewVersion}/${encodeURIComponent(ref.book)}/${ref.chapter}`
                );
                const data = await bibleRes.json();
                if (data.verses) {
                    const matching = data.verses.filter(
                        (v: any) => v.number >= ref.startVerse && v.number <= ref.endVerse
                    );
                    if (matching.length > 0) {
                        texts.push(matching.map((v: any) => v.text).join(' '));
                    }
                }
            }

            if (texts.length > 0) {
                setPreviewText(texts.join(' '));
            } else {
                setPreviewText('Verse text not found for the given reference(s).');
            }
        } catch {
            setPreviewText('Preview failed. Check verse reference.');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const { parseSingleReference: parseOne, formatRefs: fmtRefs } = await import('@/utils/verseReferenceParser');

            // 1. Parse Daily Verse references
            const dailyVerseRefs: any[] = [];
            const dailyVerseErrors: string[] = [];
            for (const line of formData.verseRefLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const result = parseOne(trimmed);
                if (result.errors.length > 0) {
                    dailyVerseErrors.push(...result.errors);
                } else {
                    dailyVerseRefs.push(...result.refs);
                }
            }

            if (dailyVerseErrors.length > 0) {
                toast.error(`Invalid Daily Verse reference: ${dailyVerseErrors[0]}`);
                setSubmitting(false);
                return;
            }

            // 2. Parse Devotional Verse references
            const rawDevRefString = formData.devotionalVerseRefLines
                .map(l => l.trim())
                .filter(Boolean)
                .join('\n');

            const devVerseRefs: any[] = [];
            const devRefErrors: string[] = [];

            for (const line of formData.devotionalVerseRefLines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                const result = parseOne(trimmed);
                if (result.errors.length > 0) {
                    devRefErrors.push(...result.errors);
                } else {
                    devVerseRefs.push(...result.refs);
                }
            }

            if (rawDevRefString && devRefErrors.length > 0) {
                toast.error(`Invalid devotional reference: ${devRefErrors[0]}`);
                setSubmitting(false);
                return;
            }

            const firstDailyRef = dailyVerseRefs[0];

            const payload: any = {
                ...formData,
                contentYear: parseInt(formData.date.substring(0, 4), 10),
                // Daily Verse fields: multi-ref array + formatted reference string + primary ref
                verseRefs: dailyVerseRefs,
                verseReference: dailyVerseRefs.length > 0 ? fmtRefs(dailyVerseRefs) : undefined,
                verseBook: firstDailyRef ? firstDailyRef.book : formData.verseBook || undefined,
                verseChapter: firstDailyRef ? firstDailyRef.chapter : (formData.verseChapter ? parseInt(formData.verseChapter, 10) : undefined),
                verseNumber: firstDailyRef ? firstDailyRef.startVerse : (formData.verseNumber ? parseInt(formData.verseNumber, 10) : undefined),
                // Devotional verse refs — both formats for compat
                devotionalVerseRef: rawDevRefString,
                devotionalVerseRefs: devVerseRefs,
            };

            // Remove UI-only fields before sending
            delete payload.verseRefLines;
            delete payload.devotionalVerseRefLines;

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
                <p className="text-gray-500 text-sm">Add one or more verse references in the order they should appear as a continuous passage. Verse text will be resolved dynamically per user's Bible version.</p>

                <VerseRefInputList
                    lines={formData.verseRefLines}
                    onChange={lines => set('verseRefLines', lines)}
                    idPrefix="daily-verse-ref"
                />

                {/* Preview */}
                <div className="flex items-center gap-3 pt-2">
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
                        disabled={previewing || formData.verseRefLines.every(l => !l.trim())}
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

                {/* Multi-ref verse input list */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                        Verse References <span className="text-red-400">*</span>
                    </label>
                    <p className="text-gray-600 text-xs mb-3">
                        Add one reference per field. Each can be a single verse, range, or comma-shorthand within one chapter.
                        <br />
                        Examples: <span className="font-mono text-gray-500">John 3:16</span> · <span className="font-mono text-gray-500">Genesis 1:13-17</span> · <span className="font-mono text-gray-500">Genesis 1:13-17,20,22</span>
                    </p>
                    <VerseRefInputList
                        lines={formData.devotionalVerseRefLines}
                        onChange={lines => set('devotionalVerseRefLines', lines)}
                    />
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

            {/* ── Prayer (Optional) ── */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 space-y-5 shadow-xl">
                <h3 className="text-white font-bold text-base border-b border-white/5 pb-3">🕊️ Daily Prayer <span className="text-gray-600 font-normal text-sm">(Optional)</span></h3>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Prayer Title</label>
                    <input type="text" value={formData.prayerTitle} onChange={e => set('prayerTitle', e.target.value)} className={inputClass} placeholder="e.g. A Prayer for Strength" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Prayer Content</label>
                    <textarea value={formData.prayerContent} onChange={e => set('prayerContent', e.target.value)} className={`${inputClass} h-32 resize-none`} placeholder="Write the prayer here..." />
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
