"use client";

import { useState, useEffect, useCallback } from 'react';
import { Music, Upload, Check, X, Loader, Trash2, Play, Pause, AlertCircle, Edit, Image as ImageIcon } from 'lucide-react';
import { useAmbientMusicStore, AmbientMusicTrack } from '@/stores/useAmbientMusicStore';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';
import { toast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

export default function MediaGalleryPage() {
    const confirm = useConfirm();
    const [tracks, setTracks] = useState<AmbientMusicTrack[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [label, setLabel] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [isDraggingThumbnail, setIsDraggingThumbnail] = useState(false);
    const [editingTrack, setEditingTrack] = useState<AmbientMusicTrack | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Global audio player hooks for live previews in dashboard
    const { 
        currentTrack, 
        isPlaying: ambientPlaying, 
        togglePlay: toggleAmbientPlay,
        stop: stopAmbient
    } = useAmbientMusicStore();

    const fetchTracks = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/ambient-music');
            const data = await res.json();
            if (data.success) {
                setTracks(data.data || []);
            } else {
                toast.error(data.error || 'Failed to load tracks.');
            }
        } catch (e) {
            console.error('Failed to load tracks', e);
            toast.error('Failed to load tracks.');
        } finally {
            setLoadingTracks(false);
        }
    }, []);

    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    const handleFileChange = (selectedFile: File) => {
        setError(null);
        const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
        if (!AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.includes(ext)) {
            setError(`Unsupported file format. Allowed types: ${AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.join(', ')}`);
            setFile(null);
            return;
        }
        if (selectedFile.size > AMBIENT_MUSIC_CONFIG.MAX_FILE_SIZE) {
            setError(`File size exceeds limit of ${AMBIENT_MUSIC_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB.`);
            setFile(null);
            return;
        }
        setFile(selectedFile);
    };

    const handleThumbnailChange = (selectedFile: File) => {
        setError(null);
        const allowedExt = AMBIENT_MUSIC_CONFIG.IMAGE_SUPPORTED_EXTENSIONS || ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));
        if (!allowedExt.includes(ext)) {
            setError(`Unsupported image format. Allowed types: ${allowedExt.join(', ')}`);
            setThumbnailFile(null);
            return;
        }
        const maxImgSize = AMBIENT_MUSIC_CONFIG.IMAGE_MAX_FILE_SIZE || 5 * 1024 * 1024;
        if (selectedFile.size > maxImgSize) {
            setError(`Image size exceeds limit of ${maxImgSize / (1024 * 1024)}MB.`);
            setThumbnailFile(null);
            return;
        }
        setThumbnailFile(selectedFile);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!label.trim()) {
            setError('Track label/title is mandatory.');
            return;
        }

        // Validate that thumbnail is present (either selected as file, or existing thumbnail is present during edit)
        const hasExistingThumbnail = editingTrack && editingTrack.thumbnail_url;
        if (!thumbnailFile && !hasExistingThumbnail) {
            setError('Please select or drop a thumbnail image.');
            return;
        }

        // Audio file is mandatory only for creation. For edit, it's optional.
        if (!editingTrack && !file) {
            setError('Please select or drop a music file.');
            return;
        }

        // Validate local duplicate label (excluding the track we are editing)
        const isDuplicate = tracks.some(t => 
            t.label.toLowerCase() === label.trim().toLowerCase() && 
            (!editingTrack || t.id !== editingTrack.id)
        );
        if (isDuplicate) {
            setError('A track with this label already exists.');
            return;
        }

        // Validate limit (only for creation)
        if (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) {
            setError(`Maximum limit of ${AMBIENT_MUSIC_CONFIG.MAX_TRACKS} tracks reached.`);
            return;
        }

        setUploading(true);
        try {
            let finalFilePath = editingTrack ? editingTrack.file_path : '';
            let finalThumbnailPath = editingTrack ? editingTrack.thumbnail_path || '' : '';

            // 1. Upload audio file if selected
            if (file) {
                const urlRes = await fetch('/api/admin/ambient-music/upload-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        contentType: file.type,
                        fileType: 'music'
                    }),
                });

                const urlData = await urlRes.json();
                if (!urlData.success) {
                    throw new Error(urlData.error || 'Failed to generate signed upload URL for audio.');
                }

                const { signedUrl, filePath } = urlData;

                const uploadRes = await fetch(signedUrl, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': file.type,
                    },
                });

                if (!uploadRes.ok) {
                    const errText = await uploadRes.text();
                    throw new Error(errText || 'Failed to upload audio file to storage.');
                }

                finalFilePath = filePath;
            }

            // 2. Upload thumbnail file if selected
            if (thumbnailFile) {
                const urlRes = await fetch('/api/admin/ambient-music/upload-url', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        filename: thumbnailFile.name,
                        contentType: thumbnailFile.type,
                        fileType: 'thumbnail'
                    }),
                });

                const urlData = await urlRes.json();
                if (!urlData.success) {
                    throw new Error(urlData.error || 'Failed to generate signed upload URL for thumbnail.');
                }

                const { signedUrl, filePath } = urlData;

                const uploadRes = await fetch(signedUrl, {
                    method: 'PUT',
                    body: thumbnailFile,
                    headers: {
                        'Content-Type': thumbnailFile.type,
                    },
                });

                if (!uploadRes.ok) {
                    const errText = await uploadRes.text();
                    throw new Error(errText || 'Failed to upload thumbnail image to storage.');
                }

                finalThumbnailPath = filePath;
            }

            // 3. Register or Update metadata in Database
            const endpoint = '/api/admin/ambient-music';
            const method = editingTrack ? 'PUT' : 'POST';
            const payload = editingTrack 
                ? {
                    id: editingTrack.id,
                    label: label.trim(),
                    file_path: finalFilePath,
                    thumbnail_path: finalThumbnailPath
                  }
                : {
                    label: label.trim(),
                    file_path: finalFilePath,
                    thumbnail_path: finalThumbnailPath
                  };

            const res = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                toast.success(editingTrack ? 'Ambient track updated successfully!' : 'Ambient track uploaded successfully!');
                setLabel('');
                setFile(null);
                setThumbnailFile(null);
                setEditingTrack(null);
                fetchTracks();
            } else {
                setError(data.error || 'Operation failed.');
            }
        } catch (e: any) {
            setError(e.message || 'Operation failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleStartEdit = (track: AmbientMusicTrack) => {
        setError(null);
        setEditingTrack(track);
        setLabel(track.label);
        setFile(null);
        setThumbnailFile(null);
    };

    const handleCancelEdit = () => {
        setError(null);
        setEditingTrack(null);
        setLabel('');
        setFile(null);
        setThumbnailFile(null);
    };

    const handleDelete = async (id: string, trackLabel: string) => {
        const confirmed = await confirm({
            title: 'Delete Track',
            message: `Are you sure you want to delete "${trackLabel}"?`,
            destructive: true
        });
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/admin/ambient-music?id=${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Track deleted successfully.');
                
                // If the currently playing track is deleted, stop the global audio
                if (currentTrack?.id === id) {
                    stopAmbient();
                }

                fetchTracks();
            } else {
                toast.error(data.error || 'Failed to delete track.');
            }
        } catch (e) {
            console.error('Delete error:', e);
            toast.error('Failed to delete track.');
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileChange(droppedFile);
    };

    const handleThumbnailDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingThumbnail(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleThumbnailChange(droppedFile);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        <Music className="size-8 text-blue-500" />
                        Ambient Music Gallery
                    </h1>
                    <p className="text-gray-400 mt-1">Manage immersive background music for the Bible Reading page</p>
                </div>
                
                {/* Upload Count Badge */}
                <div className="bg-[#111] border border-white/5 rounded-xl px-4 py-2.5 flex items-center gap-2.5 self-start md:self-auto">
                    <span className="text-sm text-gray-400">Total Uploads:</span>
                    <span className={`text-base font-bold ${tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? 'text-red-500' : 'text-blue-500'}`}>
                        {tracks.length} / {AMBIENT_MUSIC_CONFIG.MAX_TRACKS}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Upload Form Section */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">
                            {editingTrack ? `Edit Track: ${editingTrack.label}` : 'Upload New Track'}
                        </h2>

                        {!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl p-4 flex gap-3 mb-4">
                                <AlertCircle className="size-5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold">Upload limit reached</p>
                                    <p className="text-xs text-gray-400 mt-0.5">Please delete one of the existing tracks to upload a new file.</p>
                                </div>
                            </div>
                        ) : null}

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Label / Title (Mandatory)</label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g. Peaceful Rain, Piano Worship"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                                    disabled={uploading || (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Thumbnail Image {editingTrack && editingTrack.thumbnail_url ? '(Optional to change)' : '(Mandatory)'}
                                </label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDraggingThumbnail(true); }}
                                    onDragLeave={() => setIsDraggingThumbnail(false)}
                                    onDrop={handleThumbnailDrop}
                                    className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200
                                        ${isDraggingThumbnail ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]'}
                                        ${uploading || (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) ? 'cursor-not-allowed opacity-60' : ''}`}
                                    onClick={() => !uploading && (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? false : document.getElementById('thumbnail-upload-input')?.click())}
                                >
                                    <input
                                        id="thumbnail-upload-input"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                                        className="hidden"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailChange(f); e.target.value = ''; }}
                                        disabled={uploading || (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS)}
                                    />

                                    <div className="flex items-center gap-4">
                                        <div className="size-16 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                            {thumbnailFile ? (
                                                <img src={URL.createObjectURL(thumbnailFile)} alt="Preview" className="w-full h-full object-cover" />
                                            ) : editingTrack && editingTrack.thumbnail_url ? (
                                                <img src={editingTrack.thumbnail_url} alt="Current Thumbnail" className="w-full h-full object-cover" />
                                            ) : (
                                                <ImageIcon className="size-6 text-gray-500" />
                                            )}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-white text-sm font-semibold">
                                                {thumbnailFile ? thumbnailFile.name : 'Drop image or click to browse'}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                JPG · PNG · WEBP · Max 5MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                                    Audio File {editingTrack ? '(Optional to change)' : '(Mandatory)'}
                                </label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
                                        ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]'}
                                        ${uploading || (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) ? 'cursor-not-allowed opacity-60' : ''}`}
                                    onClick={() => !uploading && (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? false : document.getElementById('music-upload-input')?.click())}
                                >
                                    <input
                                        id="music-upload-input"
                                        type="file"
                                        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,application/ogg,audio/x-m4a,audio/m4a,audio/mp4,.mp3,.wav,.ogg,.m4a"
                                        className="hidden"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); e.target.value = ''; }}
                                        disabled={uploading || (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS)}
                                    />

                                    <div className="flex flex-col items-center space-y-2">
                                        {uploading ? (
                                            <Loader className="size-8 text-blue-400 animate-spin" />
                                        ) : (
                                            <div className={`p-2 rounded-lg transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                                                <Upload className={`size-5 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-white text-sm font-semibold truncate max-w-[280px]">
                                                {file ? file.name : editingTrack ? 'Keep current audio file or browse to replace' : 'Drop audio file or click to browse'}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                {AMBIENT_MUSIC_CONFIG.SUPPORTED_EXTENSIONS.join(' · ').toUpperCase()} · Max 15MB
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">
                                    <X className="size-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {editingTrack && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-white/5 hover:bg-white/10 text-white text-sm transition-all active:scale-95 animate-in fade-in zoom-in duration-200"
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={
                                        uploading || 
                                        (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) || 
                                        !label.trim() || 
                                        (!editingTrack && !file) ||
                                        (!thumbnailFile && (!editingTrack || !editingTrack.thumbnail_url))
                                    }
                                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all
                                        ${editingTrack ? 'flex-1' : 'w-full'}
                                        ${
                                            uploading || 
                                            (!editingTrack && tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) || 
                                            !label.trim() || 
                                            (!editingTrack && !file) ||
                                            (!thumbnailFile && (!editingTrack || !editingTrack.thumbnail_url))
                                                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/15 active:scale-95'
                                        }`}
                                >
                                    {uploading ? (
                                        <>
                                            <Loader className="size-4 animate-spin" />
                                            {editingTrack ? 'Saving...' : 'Uploading...'}
                                        </>
                                    ) : (
                                        editingTrack ? 'Save Changes' : 'Upload Track'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Track List Section */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                        <h2 className="text-lg font-bold text-white mb-4">Current Ambient Playlist</h2>

                        {loadingTracks ? (
                            <div className="text-center py-12 text-gray-500">
                                <Loader className="size-8 animate-spin mx-auto mb-2 text-blue-500" />
                                Loading playlist...
                            </div>
                        ) : tracks.length === 0 ? (
                            <div className="text-center py-16 text-gray-500 border border-dashed border-white/5 rounded-xl">
                                <Music className="size-12 mx-auto mb-3 opacity-25 text-gray-400" />
                                <p className="font-semibold text-white">No tracks uploaded yet</p>
                                <p className="text-sm text-gray-500 mt-1">Use the upload form to add ambient audio tracks.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {tracks.map((track) => {
                                    const isCurrentPlaying = currentTrack?.id === track.id && ambientPlaying;
                                    return (
                                        <div key={track.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                {/* Preview Play/Pause button */}
                                                <button
                                                    onClick={() => toggleAmbientPlay(track)}
                                                    className={`size-10 rounded-xl flex items-shrink-0 items-center justify-center transition-all ${
                                                        isCurrentPlaying 
                                                            ? 'bg-blue-600 text-white' 
                                                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                                    }`}
                                                >
                                                    {isCurrentPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                                                </button>

                                                {/* Thumbnail preview in list */}
                                                <div className="size-10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10">
                                                    {track.thumbnail_url ? (
                                                        <img src={track.thumbnail_url} alt={track.label} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Music className="size-4 text-gray-500" />
                                                    )}
                                                </div>

                                                <div className="min-w-0">
                                                    <p className={`font-semibold truncate ${isCurrentPlaying ? 'text-blue-400 font-bold' : 'text-white'}`}>
                                                        {track.label}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                        File: {track.file_path.split('/').pop()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <button
                                                    onClick={() => handleStartEdit(track)}
                                                    className="size-9 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                                                    title="Edit track"
                                                    disabled={uploading}
                                                >
                                                    <Edit className="size-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(track.id, track.label)}
                                                    className="size-9 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors"
                                                    title="Delete track"
                                                    disabled={uploading}
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
