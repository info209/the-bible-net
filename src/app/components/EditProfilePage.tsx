'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Languages, Book, Camera, ChevronLeft, Check, Lock, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';
import {
    SUPPORTED_COUNTRIES,
    SUPPORTED_LANGUAGES,
    normalizeCountry,
    normalizeLanguage,
    normalizeBibleVersion,
} from '@/constants/profile';

interface EditProfilePageProps {
    onBack?: () => void;
    onSaveSuccess?: () => void;
    isInsideDrawer?: boolean;
}

export default function EditProfilePage({ onBack, onSaveSuccess }: EditProfilePageProps) {
    const { data: session, update: updateSession } = useSession();

    const [formData, setFormData] = useState({
        firstName: session?.user?.firstName || '',
        lastName: session?.user?.lastName || '',
        email: session?.user?.email || '',
        country: normalizeCountry(session?.user?.country),
        preferredLanguage: normalizeLanguage(session?.user?.preferredLanguage),
        preferredBibleVersion: normalizeBibleVersion(session?.user?.preferredBibleVersion),
    });
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [bibleVersions, setBibleVersions] = useState<string[]>(['NKJV', 'KJV', 'NIV', 'ESV']);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await fetch('/api/user/profile');
                if (res.ok) {
                    const json = await res.json();
                    if (json.success && json.data) {
                        const dbUser = json.data;
                        setFormData(prev => ({
                            firstName: dbUser.firstName && dbUser.firstName !== 'Unknown' ? dbUser.firstName : prev.firstName,
                            lastName: dbUser.lastName && dbUser.lastName !== 'Unknown' ? dbUser.lastName : prev.lastName,
                            email: dbUser.email || prev.email,
                            country: normalizeCountry(dbUser.country || prev.country),
                            preferredLanguage: normalizeLanguage(dbUser.preferredLanguage || prev.preferredLanguage),
                            preferredBibleVersion: normalizeBibleVersion(dbUser.preferredBibleVersion || prev.preferredBibleVersion),
                        }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch user profile:', err);
            }
        };

        fetchUserProfile();
    }, []);

    useEffect(() => {
        if (session?.user) {
            const u = session.user as any;
            const nameParts = (u.name || '').trim().split(' ');
            const derivedFirstName = u.firstName || nameParts[0] || '';
            const derivedLastName = u.lastName || nameParts.slice(1).join(' ') || '';

            setFormData(prev => ({
                ...prev,
                firstName: prev.firstName && prev.firstName !== 'Unknown' ? prev.firstName : (derivedFirstName || prev.firstName),
                lastName: prev.lastName && prev.lastName !== 'Unknown' ? prev.lastName : (derivedLastName || prev.lastName),
                email: prev.email || u.email || '',
                country: normalizeCountry(prev.country || u.country),
                preferredLanguage: normalizeLanguage(prev.preferredLanguage || u.preferredLanguage),
                preferredBibleVersion: normalizeBibleVersion(prev.preferredBibleVersion || u.preferredBibleVersion),
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

        const normalizedCountry = normalizeCountry(formData.country);
        const normalizedLang = normalizeLanguage(formData.preferredLanguage);
        const normalizedVersion = normalizeBibleVersion(formData.preferredBibleVersion);

        try {
            if (formData.firstName.trim().length < 2) {
                const friendlyMsg = getFriendlyErrorMessage('First name must be at least 2 characters', 'profile');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
                setLoading(false);
                return;
            }
            if (!formData.lastName.trim()) {
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
                    firstName: formData.firstName.trim(),
                    lastName: formData.lastName.trim(),
                    country: normalizedCountry,
                    preferredLanguage: normalizedLang,
                    preferredBibleVersion: normalizedVersion,
                    onboardingCompleted: true,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                if (updateSession) {
                    await updateSession({ 
                        user: { 
                            ...session?.user,
                            firstName: formData.firstName.trim(),
                            lastName: formData.lastName.trim(),
                            country: normalizedCountry,
                            preferredLanguage: normalizedLang,
                            preferredBibleVersion: normalizedVersion,
                            onboardingCompleted: true 
                        } 
                    });
                }
                toast.success('Profile updated successfully!');
                onSaveSuccess?.();
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
        <div className="p-4 space-y-5 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/[0.08] sticky top-0 bg-[#F4F8F8] dark:bg-[#0D0D0D] z-30 -mx-4 px-4 pt-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium text-sm transition-colors cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Edit Profile</h2>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-teal)] text-white text-xs font-bold shadow-sm hover:bg-[var(--color-primary-teal-dark)] transition-all disabled:opacity-50 cursor-pointer"
                >
                    {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                        </>
                    )}
                </button>
            </div>

            {/* Profile Header Avatar Card */}
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-5 shadow-2xs border border-gray-100 dark:border-white/[0.08] flex flex-col items-center text-center relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10" />

                <div className="relative mt-1">
                    {user?.image ? (
                        <img
                            src={user.image}
                            alt={fullName}
                            className="w-20 h-20 rounded-full border-3 border-white dark:border-[#1c1c1e] shadow-md object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full border-3 border-white dark:border-[#1c1c1e] shadow-md bg-[#f0d6e8] flex items-center justify-center">
                            <span className="text-[#6d2c5e] text-2xl font-bold tracking-wide">{userInitials}</span>
                        </div>
                    )}

                    <input
                        type="file"
                        id="profile-avatar-upload-drawer"
                        className="hidden"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={isUploading}
                    />
                    <button
                        type="button"
                        onClick={() => document.getElementById('profile-avatar-upload-drawer')?.click()}
                        disabled={isUploading}
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[var(--color-primary-teal)] text-white border-2 border-white dark:border-[#1c1c1e] shadow flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        title="Change photo"
                    >
                        {isUploading ? (
                            <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Camera className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>

                <h3 className="mt-2.5 text-base font-bold text-gray-900 dark:text-white">{fullName}</h3>
                <p className="text-xs font-medium text-gray-400 mt-0.5">{formData.email}</p>
            </div>

            {error && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl text-xs font-semibold">
                    {error}
                </div>
            )}

            {/* Card 1: Personal Information */}
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 shadow-2xs border border-gray-100 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.06] pb-2.5">
                    <User className="w-4 h-4 text-[var(--color-primary-teal)]" />
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Personal Information</h4>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-0.5">First name</label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/[0.08] focus:border-[var(--color-primary-teal)] rounded-xl py-2.5 px-3 outline-none font-medium text-gray-800 dark:text-gray-100 transition-all text-sm"
                            placeholder="First name"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-0.5">Last name</label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/[0.08] focus:border-[var(--color-primary-teal)] rounded-xl py-2.5 px-3 outline-none font-medium text-gray-800 dark:text-gray-100 transition-all text-sm"
                            placeholder="Last name"
                        />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between ml-0.5">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-300">Email address</label>
                            <span className="text-[10px] font-semibold text-gray-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Read-only
                            </span>
                        </div>
                        <input
                            type="email"
                            value={formData.email}
                            readOnly
                            className="w-full bg-gray-100/70 dark:bg-[#111111] border border-gray-200 dark:border-white/[0.06] rounded-xl py-2.5 px-3 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium text-sm"
                            title="Email address cannot be changed"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-0.5">Country</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: normalizeCountry(e.target.value) })}
                                className="w-full bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/[0.08] focus:border-[var(--color-primary-teal)] rounded-xl py-2.5 pl-9 pr-4 outline-none font-semibold text-gray-800 dark:text-gray-100 transition-all text-sm appearance-none cursor-pointer"
                            >
                                {SUPPORTED_COUNTRIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card 2: Reading Preferences */}
            <div className="bg-white dark:bg-[#151515] rounded-2xl p-4 shadow-2xs border border-gray-100 dark:border-white/[0.08] space-y-3.5">
                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/[0.06] pb-2.5">
                    <Book className="w-4 h-4 text-[var(--color-primary-teal)]" />
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Reading Preferences</h4>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-0.5">Preferred language</label>
                        <div className="relative">
                            <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={formData.preferredLanguage}
                                onChange={(e) => setFormData({ ...formData, preferredLanguage: normalizeLanguage(e.target.value) })}
                                className="w-full bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/[0.08] focus:border-[var(--color-primary-teal)] rounded-xl py-2.5 pl-9 pr-4 outline-none font-semibold text-gray-800 dark:text-gray-100 transition-all text-sm appearance-none cursor-pointer"
                            >
                                {SUPPORTED_LANGUAGES.map((l) => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 ml-0.5">Preferred Bible version</label>
                        <div className="relative">
                            <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <select
                                value={formData.preferredBibleVersion}
                                onChange={(e) => setFormData({ ...formData, preferredBibleVersion: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/[0.08] focus:border-[var(--color-primary-teal)] rounded-xl py-2.5 pl-9 pr-4 outline-none font-semibold text-gray-800 dark:text-gray-100 transition-all text-sm appearance-none cursor-pointer"
                            >
                                {bibleVersions.map((v) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-1">
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-3 rounded-xl shadow-md shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50"
                >
                    {loading ? (
                        <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                        <span>Save Changes</span>
                    )}
                </button>
            </div>
        </div>
    );
}
