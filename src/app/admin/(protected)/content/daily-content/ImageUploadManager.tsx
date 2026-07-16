"use client";

import { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, Upload, Copy, Check, X, Loader, Trash2 } from 'lucide-react';

interface UploadedImage {
    filename: string;
    url: string;
    size: number;
    uploadedAt: string;
}

export function ImageUploadManager() {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingImages, setLoadingImages] = useState(true);

    const fetchImages = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/daily-content/image-upload');
            const data = await res.json();
            if (data.success) setImages(data.data || []);
        } catch (e) {
            console.error('Failed to load images', e);
        } finally {
            setLoadingImages(false);
        }
    }, []);

    useEffect(() => { fetchImages(); }, [fetchImages]);

    const handleUpload = async (file: File) => {
        setError(null);
        setUploadedUrl(null);

        const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
        if (!allowedExt.includes(ext)) {
            setError('Only JPG, PNG, WEBP, and SVG images are supported.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('Image size exceeds 10MB limit.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/admin/daily-content/image-upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setUploadedUrl(data.url);
                fetchImages();
            } else {
                setError(data.error || 'Upload failed.');
            }
        } catch (e) {
            setError('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleCopy = async (url: string) => {
        await navigator.clipboard.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
                    ${isDragging ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 hover:border-purple-500/50 hover:bg-white/[0.02]'}
                    ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
                onClick={() => !uploading && document.getElementById('image-upload-input')?.click()}
            >
                <input
                    id="image-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg,.jpg,.jpeg,.png,.webp,.svg"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
                    disabled={uploading}
                />

                <div className="flex flex-col items-center space-y-3">
                    {uploading ? (
                        <Loader className="size-10 text-purple-400 animate-spin" />
                    ) : (
                        <div className={`p-4 rounded-2xl transition-colors ${isDragging ? 'bg-purple-500/20' : 'bg-white/5'}`}>
                            <ImageIcon className={`size-8 ${isDragging ? 'text-purple-400' : 'text-gray-400'}`} />
                        </div>
                    )}
                    <div>
                        <p className="text-white font-semibold">
                            {uploading ? 'Uploading image...' : 'Drop your image here or click to browse'}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">JPG · PNG · WEBP · SVG · Max 10MB</p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
                        <X className="size-4" />
                        {error}
                    </div>
                )}
            </div>

            {/* Success Result */}
            {uploadedUrl && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Check className="size-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-green-400 font-bold">Image Uploaded Successfully</p>
                            <p className="text-gray-500 text-xs">Your image is ready to use</p>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="mb-4 rounded-xl overflow-hidden bg-white/5 max-h-48 flex items-center justify-center">
                        <img src={uploadedUrl} alt="Uploaded" className="max-h-48 object-contain" />
                    </div>

                    {/* URL + Copy */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-300 text-sm font-mono truncate">
                            {uploadedUrl}
                        </div>
                        <button
                            onClick={() => handleCopy(uploadedUrl)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                copied === uploadedUrl
                                    ? 'bg-green-500 text-white'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                            }`}
                        >
                            {copied === uploadedUrl ? <Check className="size-4" /> : <Copy className="size-4" />}
                            {copied === uploadedUrl ? 'Copied!' : 'Copy URL'}
                        </button>
                    </div>
                </div>
            )}

            {/* Uploaded Images Gallery */}
            <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <ImageIcon className="size-4 text-purple-400" />
                    Recently Uploaded ({images.length})
                </h3>

                {loadingImages ? (
                    <div className="text-center py-8 text-gray-500">
                        <Loader className="size-6 animate-spin mx-auto mb-2" />
                        Loading images...
                    </div>
                ) : images.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white/[0.02] rounded-2xl border border-white/5">
                        <ImageIcon className="size-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No images uploaded yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {images.map((img) => (
                            <div key={img.filename} className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all">
                                <div className="aspect-video bg-black/20 flex items-center justify-center overflow-hidden">
                                    <img
                                        src={img.url}
                                        alt={img.filename}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                                <div className="p-2">
                                    <p className="text-xs text-gray-400 truncate">{img.filename}</p>
                                    <p className="text-xs text-gray-600">{formatSize(img.size)}</p>
                                </div>
                                {/* Copy overlay */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={() => handleCopy(img.url)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                                            copied === img.url ? 'bg-green-500 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                                        }`}
                                    >
                                        {copied === img.url ? <Check className="size-3" /> : <Copy className="size-3" />}
                                        {copied === img.url ? 'Copied!' : 'Copy URL'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
