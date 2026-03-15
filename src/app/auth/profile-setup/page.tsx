'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Globe, Languages, Book, ArrowRight, UserCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

function ProfileSetupContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId');
    const { data: session, update } = useSession();

    const [formData, setFormData] = useState({
        country: 'New Zealand',
        preferredLanguage: 'English',
        preferredBibleVersion: 'NKJV',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/auth/profile-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, ...formData }),
            });

            if (res.ok) {
                if (session) {
                    await update({ user: { ...session.user, onboardingCompleted: true } });
                }
                router.push('/auth/success?type=profile');
            } else {
                alert('Failed to save profile. You can skip for now.');
            }
        } catch (err) {
            console.error(err);
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

                <div className="space-y-6">
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
                        onClick={() => router.push('/auth/success?type=account')}
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
