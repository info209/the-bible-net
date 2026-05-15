"use client";

import { useCallback, useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react';

interface BulkUploadZoneProps {
    onUpload: (file: File) => void;
    uploading: boolean;
    accept?: string;
    label?: string;
    description?: string;
}

export function BulkUploadZone({
    onUpload,
    uploading,
    accept = '.csv,.xlsx,.xls',
    label = 'Drop your CSV or XLSX file here',
    description = 'Supports CSV and XLSX formats · Max 10MB',
}: BulkUploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragError, setDragError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): string | null => {
        const allowed = ['.csv', '.xlsx', '.xls', 'text/csv', 'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        const ext = file.name.toLowerCase();
        const isAllowed = allowed.some(a => ext.endsWith(a.replace('.', '.')) || file.type === a || ext.endsWith(a));
        if (!isAllowed) return 'Only CSV and XLSX files are supported.';
        if (file.size > 10 * 1024 * 1024) return 'File exceeds 10MB limit.';
        return null;
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setDragError(null);

        const file = e.dataTransfer.files[0];
        if (!file) return;

        const error = validateFile(file);
        if (error) { setDragError(error); return; }
        onUpload(file);
    }, [onUpload]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const error = validateFile(file);
        if (error) { setDragError(error); return; }
        setDragError(null);
        onUpload(file);
        e.target.value = '';
    };

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group
                ${isDragging ? 'border-blue-400 bg-blue-500/10 scale-[1.01]' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]'}
                ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
            />

            <div className="flex flex-col items-center space-y-3">
                {uploading ? (
                    <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-white/5 group-hover:bg-blue-500/10'}`}>
                        <Upload className={`size-8 transition-colors ${isDragging ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                    </div>
                )}

                <div>
                    <p className="text-white font-semibold text-base mb-1">
                        {uploading ? 'Processing file...' : label}
                    </p>
                    <p className="text-gray-500 text-sm">{description}</p>
                </div>

                {!uploading && (
                    <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400">
                            <FileText className="size-3.5" />
                            CSV
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-xs text-gray-400">
                            <FileText className="size-3.5" />
                            XLSX
                        </div>
                    </div>
                )}
            </div>

            {dragError && (
                <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
                    <AlertCircle className="size-4 flex-shrink-0" />
                    {dragError}
                </div>
            )}
        </div>
    );
}
