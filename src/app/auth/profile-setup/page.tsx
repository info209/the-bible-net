'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, Languages, Book, ArrowRight, UserCircle2 } from 'lucide-react';
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
    const [error, setError] = useState('');
    const [bibleVersions, setBibleVersions] = useState<string[]>(['NKJV', 'KJV', 'NIV', 'ESV']); // Default fallback

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
        // Fetch dynamic bible versions
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

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate basic fields
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
                // Refresh session to reflect changes
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
                toast.success('Profile saved successfully!');
                router.push('/auth/success?type=profile');
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

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md glass-ios border-none p-8 space-y-8 relative overflow-hidden shadow-2xl"
        >
            <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-[var(--color-primary-teal)]/10 rounded-full flex items-center justify-center shadow-inner">
                    <UserCircle2 className="w-10 h-10 text-[var(--color-primary-teal)]" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter font-sans leading-tight">Personalize</h1>
                <p className="text-slate-500/80 font-medium px-4 leading-relaxed">
                    Set up your preferences for a tailored Bible reading experience
                </p>
            </div>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-bold shadow-sm"
                >
                    {error}
                </motion.div>
            )}

            <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">First name</label>
                        <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all font-medium placeholder:text-gray-400"
                            placeholder="John"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Last name</label>
                        <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all font-medium placeholder:text-gray-400"
                            placeholder="Doe"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email address</label>
                    <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full bg-slate-200/50 border-none rounded-2xl py-3.5 px-4 outline-none text-slate-500 cursor-not-allowed font-medium opacity-60"
                        title="Email cannot be changed"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Country</label>
                    <div className="relative group">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-teal)] transition-colors" />
                        <select
                            value={formData.country}
                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all appearance-none font-bold text-slate-700"
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

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Preferred language</label>
                    <div className="relative group">
                        <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-teal)] transition-colors" />
                        <select
                            value={formData.preferredLanguage}
                            onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all appearance-none font-bold text-slate-700"
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
                    <label className="text-sm font-bold text-slate-700 ml-1">Preferred Bible version</label>
                    <div className="relative group">
                        <Book className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-teal)] transition-colors" />
                        <select
                            value={formData.preferredBibleVersion}
                            onChange={(e) => setFormData({ ...formData, preferredBibleVersion: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all appearance-none font-bold text-slate-700"
                        >
                            {bibleVersions.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-5 pt-4">
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-[var(--color-primary-teal)] hover:bg-[var(--color-primary-teal-dark)] text-white font-black py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg tracking-tight"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            {(session?.user as any)?.onboardingCompleted ? 'Update changes' : 'Get started'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </>
                    )}
                </button>
                
                <button 
                    onClick={() => router.push('/home?profile=true')}
                    className="w-full text-slate-400 font-extrabold py-2 hover:text-slate-600 transition-colors text-s"
                >
                    Skip for now
                </button>
            </div>
        </motion.div>
    );
}

export default function ProfileSetup() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileSetupContent />
        </Suspense>
    );
}
