"use client";

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';

interface ImportError {
    row: number;
    date?: string;
    reference?: string;
    reason: string;
}

interface UploadResult {
    total: number;
    imported: number;
    skipped?: number;
    errorCount: number;
    errors: ImportError[];
    failedRowsCsv?: string;
}

interface UploadResultModalProps {
    result: UploadResult | null;
    onClose: () => void;
    type?: 'verse' | 'devotional';
}

export function UploadResultModal({ result, onClose, type = 'verse' }: UploadResultModalProps) {
    const [showErrors, setShowErrors] = useState(false);

    if (!result) return null;

    const handleDownloadFailed = () => {
        if (!result.failedRowsCsv) return;
        const blob = new Blob([result.failedRowsCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `failed-${type}-rows.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isSuccess = result.imported > 0;
    const hasErrors = result.errorCount > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 flex items-start justify-between ${isSuccess ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/5' : 'bg-gradient-to-r from-red-500/10 to-rose-500/5'}`}>
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Upload Complete</p>
                        <h2 className="text-white text-xl font-bold">Import Results</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="size-5 text-gray-400" />
                    </button>
                </div>

                {/* Stats */}
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
                            <CheckCircle className="size-6 text-green-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-green-400">{result.imported}</p>
                            <p className="text-xs text-gray-400 mt-1">Imported</p>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                            <AlertTriangle className="size-6 text-amber-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-amber-400">{result.skipped || 0}</p>
                            <p className="text-xs text-gray-400 mt-1">Skipped</p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                            <XCircle className="size-6 text-red-400 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-red-400">{result.errorCount}</p>
                            <p className="text-xs text-gray-400 mt-1">Errors</p>
                        </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-400">
                        <span className="text-white font-medium">{result.total}</span> total rows processed
                    </div>

                    {/* Error list */}
                    {hasErrors && (
                        <div className="border border-white/10 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setShowErrors(!showErrors)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-red-400 text-sm font-medium flex items-center gap-2">
                                    <XCircle className="size-4" />
                                    View {result.errorCount} error{result.errorCount !== 1 ? 's' : ''}
                                </span>
                                {showErrors ? <ChevronUp className="size-4 text-gray-500" /> : <ChevronDown className="size-4 text-gray-500" />}
                            </button>

                            {showErrors && (
                                <div className="max-h-52 overflow-y-auto border-t border-white/10 divide-y divide-white/5">
                                    {result.errors.map((err, i) => (
                                        <div key={i} className="px-4 py-3 text-xs">
                                            <div className="flex items-start gap-2">
                                                <span className="text-gray-500 shrink-0">Row {err.row}</span>
                                                {err.date && <span className="text-gray-400 shrink-0">{err.date}</span>}
                                                {err.reference && <span className="text-blue-400 shrink-0">{err.reference}</span>}
                                            </div>
                                            <p className="text-red-400 mt-1">{err.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        {hasErrors && result.failedRowsCsv && (
                            <button
                                onClick={handleDownloadFailed}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                <Download className="size-4" />
                                Download Failed Rows
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`${hasErrors && result.failedRowsCsv ? 'flex-1' : 'w-full'} px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-colors`}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
