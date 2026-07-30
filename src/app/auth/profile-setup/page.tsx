'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, Languages, Book, Camera, ChevronLeft, Check, Lock, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';

function ProfileSetupContent() {
    const router = useRouter();
    const { data: session, update: updateSession } = useSession();

    const [formData, setFormData] = useState({
        firstName: session?.user?.firstName || '',
        lastName: session?.user?.lastName || '',
        email: session?.user?.email || '',
        country: 'New Zealand',
        preferredLanguage: 'English',
        preferredBibleVersion: 'NKJV',
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [bibleVersions, setBibleVersions] = useState<string[]>(['NKJV', 'KJV', 'NIV', 'ESV']);

    useEffect(() => {
        if (session?.user) {
            setFormData(prev => ({
                ...prev,
                firstName: prev.firstName || (session.user as any).firstName || '',
                lastName: prev.lastName || (session.user as any).lastName || '',
                email: prev.email || session.user.email || '',
                country: prev.country === 'New Zealand' ? ((session.user as any).country || 'New Zealand') : prev.country,
                preferredLanguage: prev.preferredLanguage === 'English' ? ((session.user as any).preferredLanguage || 'English') : prev.preferredLanguage,
                preferredBibleVersion: prev.preferredBibleVersion === 'NKJV' ? ((session.user as any).preferredBibleVersion || 'NKJV') : prev.preferredBibleVersion,
            }));
        }
    }, [session]);

    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const res = await fetch('/api/v1/bible/versions');
                const json = await res.json();
                if (json.success && json.data) {
                    const versionsArray = Array.isArray(json.data) ? json.data : json.data.versions;
                    if (versionsArray && versionsArray.length > 0) {
                        setBibleVersions(versionsArray.map((v: any) => v.abbreviation));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch Bible versions', err);
            }
        };
        fetchVersions();
    }, []);

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Avatar image size must be less than 5MB');
            return;
        }

        setIsUploading(true);
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('file', file);
            formDataUpload.append('isPrivate', 'false');

            const uploadRes = await fetch('/api/v1/upload', {
                method: 'POST',
                body: formDataUpload,
            });
            const uploadData = await uploadRes.json();

            if (!uploadRes.ok || !uploadData.success) {
                throw new Error(uploadData.error || 'Failed to upload image');
            }

            const imageUrl = uploadData.url;

            const profileRes = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageUrl }),
            });
            const profileData = await profileRes.json();

            if (!profileRes.ok || !profileData.success) {
                throw new Error(profileData.error || 'Failed to update avatar');
            }

            if (updateSession) {
                await updateSession({
                    user: {
                        ...session?.user,
                        image: imageUrl,
                    },
                });
            }
            toast.success('Profile photo updated');
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            const friendlyMsg = getFriendlyErrorMessage(err, 'profile');
            toast.error(friendlyMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (formData.firstName.length < 2) {
                const friendlyMsg = getFriendlyErrorMessage('First name must be at least 2 characters', 'profile');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
                setLoading(false);
                return;
            }
            if (!formData.lastName) {
                const friendlyMsg = getFriendlyErrorMessage('Last name is required', 'profile');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
                setLoading(false);
                return;
            }

            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    country: formData.country,
                    preferredLanguage: formData.preferredLanguage,
                    preferredBibleVersion: formData.preferredBibleVersion,
                    onboardingCompleted: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                await updateSession({ 
                    user: { 
                        ...session?.user,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        country: formData.country,
                        preferredLanguage: formData.preferredLanguage,
                        preferredBibleVersion: formData.preferredBibleVersion,
                        onboardingCompleted: true 
                    } 
                });
                toast.success('Profile updated successfully!');
                router.back();
            } else {
                const friendlyMsg = getFriendlyErrorMessage(data.error || data.message || 'Failed to save profile', 'profile');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
            }
        } catch (err) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'profile');
            toast.error(friendlyMsg);
            setError(friendlyMsg);
        } finally {
            setLoading(false);
        }
    };

    const user = session?.user;
    const fullName = `${formData.firstName} ${formData.lastName}`.trim() || user?.name || user?.email || 'User Profile';
    const userInitials = (formData.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase();

    return (
        <div className="min-h-screen bg-slate-50/60 py-6 sm:py-10 px-4 sm:px-6">
            <motion.div 
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-xl mx-auto space-y-6"
            >
                {/* Top Header */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-[var(--color-primary-teal)] hover:border-[var(--color-primary-teal)]/30 text-sm font-semibold shadow-sm transition-all outline-none cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">Edit Profile</h1>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[var(--color-primary-teal)] text-white text-sm font-bold shadow-md shadow-[var(--color-primary-teal)]/20 hover:bg-[var(--color-primary-teal-dark)] transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Profile Header Avatar Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10" />

                    <div className="relative mt-2">
                        {user?.image ? (
                            <img
                                src={user.image}
                                alt={fullName}
                                className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-[#f0d6e8] flex items-center justify-center">
                                <span className="text-[#6d2c5e] text-3xl font-bold tracking-wide">{userInitials}</span>
                            </div>
                        )}

                        <input
                            type="file"
                            id="profile-avatar-upload"
                            className="hidden"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            disabled={isUploading}
                        />
                        <button
                            type="button"
                            onClick={() => document.getElementById('profile-avatar-upload')?.click()}
                            disabled={isUploading}
                            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--color-primary-teal)] text-white border-2 border-white shadow flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            title="Change photo"
                        >
                            {isUploading ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Camera className="w-4 h-4" />
                            )}
                        </button>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-slate-900">{fullName}</h2>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">{formData.email}</p>
                </div>

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-semibold"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Card 1: Personal Information */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <User className="w-4 h-4 text-[var(--color-primary-teal)]" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Information</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">First name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[var(--color-primary-teal)] rounded-xl py-3 px-3.5 outline-none font-medium text-slate-800 transition-all text-sm"
                                placeholder="First name"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Last name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[var(--color-primary-teal)] rounded-xl py-3 px-3.5 outline-none font-medium text-slate-800 transition-all text-sm"
                                placeholder="Last name"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-xs font-bold text-slate-600">Email address</label>
                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Read-only
                            </span>
                        </div>
                        <input
                            type="email"
                            value={formData.email}
                            readOnly
                            className="w-full bg-slate-100/70 border border-slate-200 rounded-xl py-3 px-3.5 text-slate-500 cursor-not-allowed font-medium text-sm"
                            title="Email address cannot be changed"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Country</label>
                        <div className="relative">
                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[var(--color-primary-teal)] rounded-xl py-3 pl-10 pr-4 outline-none font-semibold text-slate-800 transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option>New Zealand</option>
                                <option>United States</option>
                                <option>United Kingdom</option>
                                <option>India</option>
                                <option>Australia</option>
                                <option>Canada</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Card 2: Reading Preferences */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Book className="w-4 h-4 text-[var(--color-primary-teal)]" />
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Reading Preferences</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Preferred language</label>
                        <div className="relative">
                            <Languages className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={formData.preferredLanguage}
                                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[var(--color-primary-teal)] rounded-xl py-3 pl-10 pr-4 outline-none font-semibold text-slate-800 transition-all text-sm appearance-none cursor-pointer"
                            >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>Hindi</option>
                                <option>Telugu</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Preferred Bible version</label>
                        <div className="relative">
                            <Book className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <select
                                value={formData.preferredBibleVersion}
                                onChange={(e) => setFormData({ ...formData, preferredBibleVersion: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-[var(--color-primary-teal)] rounded-xl py-3 pl-10 pr-4 outline-none font-semibold text-slate-800 transition-all text-sm appearance-none cursor-pointer"
                            >
                                {bibleVersions.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Primary Action Button */}
                <div className="pt-2">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-[var(--color-primary-teal)]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base cursor-pointer disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="h-5 w-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ProfileSetup() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 font-medium">Loading profile...</div>}>
            <ProfileSetupContent />
        </Suspense>
    );
}
