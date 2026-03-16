'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, Languages, Book, ArrowRight, UserCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

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

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate basic fields
            if (formData.firstName.length < 2) {
                setError('First name must be at least 2 characters');
                setLoading(false);
                return;
            }
            if (!formData.lastName) {
                setError('Last name is required');
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
                router.push('/auth/success?type=profile');
            } else {
                setError(data.error || 'Failed to save profile');
            }
        } catch (err) {
            console.error(err);
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md apple-nav-floating p-8 space-y-8"
            >
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-[#41ADB0]/10 rounded-full flex items-center justify-center">
                        <UserCircle2 className="w-8 h-8 text-[#41ADB0]" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Complete your profile</h1>
                    <p className="text-slate-500 font-medium px-4">
                        Help us personalize your Bible reading experience
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-medium">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all"
                                placeholder="John"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-700">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all"
                                placeholder="Doe"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            readOnly
                            className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3 px-4 outline-none text-slate-500 cursor-not-allowed"
                            title="Email cannot be changed"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Country</label>
                        <div className="relative group">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <select
                                value={formData.country}
                                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all appearance-none"
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

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Preferred Language</label>
                        <div className="relative group">
                            <Languages className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <select
                                value={formData.preferredLanguage}
                                onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all appearance-none"
                            >
                                <option>English</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>Hindi</option>
                                <option>Telugu</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-slate-700">Preferred Bible Version</label>
                        <div className="relative group">
                            <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#41ADB0] transition-colors" />
                            <select
                                value={formData.preferredBibleVersion}
                                onChange={(e) => setFormData({ ...formData, preferredBibleVersion: e.target.value })}
                                className="w-full bg-white/50 border border-slate-200 rounded-2xl py-3 pl-10 pr-4 outline-none focus:border-[#41ADB0] focus:ring-4 focus:ring-[#41ADB0]/10 transition-all appearance-none"
                            >
                                <option>NKJV</option>
                                <option>KJV</option>
                                <option>NIV</option>
                                <option>ESV</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-[#41ADB0] hover:bg-[#369294] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#41ADB0]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : (
                            <>
                                Complete Profile <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                    
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full text-slate-400 font-bold py-2 hover:text-slate-600 transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ProfileSetup() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileSetupContent />
        </Suspense>
    );
}
