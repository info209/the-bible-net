"use client";

import { useState, useEffect, useCallback } from 'react';
import { Music, Upload, Check, X, Loader, Trash2, Play, Pause, AlertCircle } from 'lucide-react';
import { useAmbientMusicStore, AmbientMusicTrack } from '@/stores/useAmbientMusicStore';
import { AMBIENT_MUSIC_CONFIG } from '@/config/ambientMusic.config';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

export default function MediaGalleryPage() {
    const supabase = createClient();
    const [tracks, setTracks] = useState<AmbientMusicTrack[]>([]);
    const [loadingTracks, setLoadingTracks] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [label, setLabel] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
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

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!label.trim()) {
            setError('Track label/title is mandatory.');
            return;
        }
        if (!file) {
            setError('Please select or drop a music file.');
            return;
        }

        // Validate local duplicates
        const isDuplicate = tracks.some(t => t.label.toLowerCase() === label.trim().toLowerCase());
        if (isDuplicate) {
            setError('A track with this label already exists.');
            return;
        }

        // Validate limit
        if (tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS) {
            setError(`Maximum limit of ${AMBIENT_MUSIC_CONFIG.MAX_TRACKS} tracks reached.`);
            return;
        }

        setUploading(true);
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        const cleanBase = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '').replace(/_+/g, '_');
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 8);
        const filePath = `ambient-music/${timestamp}-${randomId}-${cleanBase}${ext}`;

        try {
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('ambient-music')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) {
                throw new Error(uploadError.message || 'Supabase storage upload failed.');
            }

            const res = await fetch('/api/admin/ambient-music', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    label: label.trim(),
                    file_path: filePath
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Ambient track uploaded successfully!');
                setLabel('');
                setFile(null);
                fetchTracks();
            } else {
                await supabase.storage.from('ambient-music').remove([filePath]);
                setError(data.error || 'Upload failed.');
            }
        } catch (e: any) {
            setError(e.message || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, trackLabel: string) => {
        if (!confirm(`Are you sure you want to delete "${trackLabel}"?`)) return;

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
                        <h2 className="text-lg font-bold text-white mb-4">Upload New Track</h2>

                        {tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? (
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
                                    disabled={uploading || tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1.5">Audio File (Mandatory)</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                                        ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/50 hover:bg-white/[0.02]'}
                                        ${uploading || tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS ? 'cursor-not-allowed opacity-60' : ''}`}
                                    onClick={() => !uploading && tracks.length < AMBIENT_MUSIC_CONFIG.MAX_TRACKS && document.getElementById('music-upload-input')?.click()}
                                >
                                    <input
                                        id="music-upload-input"
                                        type="file"
                                        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/ogg,application/ogg,audio/x-m4a,audio/m4a,audio/mp4,.mp3,.wav,.ogg,.m4a"
                                        className="hidden"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileChange(f); e.target.value = ''; }}
                                        disabled={uploading || tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS}
                                    />

                                    <div className="flex flex-col items-center space-y-3">
                                        {uploading ? (
                                            <Loader className="size-10 text-blue-400 animate-spin" />
                                        ) : (
                                            <div className={`p-3.5 rounded-xl transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                                                <Upload className={`size-6 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-white text-sm font-semibold">
                                                {file ? file.name : 'Drop audio file or click to browse'}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1">
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

                            <button
                                type="submit"
                                disabled={uploading || tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS || !label.trim() || !file}
                                className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all
                                    ${uploading || tracks.length >= AMBIENT_MUSIC_CONFIG.MAX_TRACKS || !label.trim() || !file
                                        ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/15 active:scale-95'
                                    }`}
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="size-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    'Upload Track'
                                )}
                            </button>
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
                                                    className={`size-10 rounded-xl flex items-center justify-center transition-all ${
                                                        isCurrentPlaying 
                                                            ? 'bg-blue-600 text-white' 
                                                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                                                    }`}
                                                >
                                                    {isCurrentPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                                                </button>

                                                <div className="min-w-0">
                                                    <p className={`font-semibold truncate ${isCurrentPlaying ? 'text-blue-400 font-bold' : 'text-white'}`}>
                                                        {track.label}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                        File: {track.file_path.split('/').pop()}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleDelete(track.id, track.label)}
                                                className="size-9 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 flex items-center justify-center transition-colors"
                                                title="Delete track"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
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
