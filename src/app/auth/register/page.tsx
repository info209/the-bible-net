'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Lock, AlertCircle, ArrowRight, ChevronLeft,
    Globe, Languages, BookOpen, Check, Sparkles
} from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { LegalModal } from '@/components/LegalModal';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';
import { useAuth } from '@/context/AuthContext';
import {
    SUPPORTED_COUNTRIES,
    SUPPORTED_LANGUAGES,
    normalizeCountry,
    normalizeLanguage,
    normalizeBibleVersion,
} from '@/constants/profile';

// ==========================================
// STEP 1: Basic Details
// ==========================================
interface Step1Props {
    onSuccess: (userId: string, email: string) => void;
}

function RegisterStep1View({ onSuccess }: Step1Props) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: 'terms' | 'privacy' }>({
        isOpen: false,
        type: 'terms',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const offlineMsg = 'Creating an account requires an internet connection.';
            toast.info(offlineMsg);
            setError(offlineMsg);
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                const friendlyMsg = getFriendlyErrorMessage(data.error || data.message || 'Registration failed', 'register');
                toast.error(friendlyMsg);
                setError(friendlyMsg);
            } else {
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('temp_register_email', formData.email);
                    sessionStorage.setItem('temp_register_password', formData.password);
                    sessionStorage.setItem('temp_register_firstName', formData.firstName);
                    sessionStorage.setItem('temp_register_lastName', formData.lastName);
                }
                onSuccess(data.data.userId, data.data.email);
            }
        } catch (err: any) {
            const friendlyMsg = getFriendlyErrorMessage(err, 'register');
            toast.error(friendlyMsg);
            setError(friendlyMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            key="step-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-none sm:max-w-md min-h-screen sm:min-h-0 bg-white/95 sm:glass-ios border-none p-6 sm:p-8 space-y-6 sm:space-y-8 relative overflow-y-auto rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl flex flex-col justify-center"
        >
            <div className="text-center space-y-3">
                <div className="relative flex items-center justify-center">
                    <motion.button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        whileHover={{ x: -2, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => router.back()}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-100/80 text-slate-600 hover:text-[var(--color-primary-teal)] hover:bg-slate-200/80 transition-all outline-none cursor-pointer"
                        title="Go back"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans px-10">Create your account</h1>
                </div>
                <p className="text-slate-500/80 font-medium">Join The Bible Net and grow in God's Word</p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                        <span>Step 1 of 3: Basic details</span>
                        <span>33%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary-teal)] rounded-full transition-all duration-500" style={{ width: '33%' }} />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">First name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type="text"
                                required
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="John"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Last name</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                            <input
                                type="text"
                                required
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                                placeholder="Doe"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Email address</label>
                    <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors" />
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                            placeholder="example@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-accent-rose)] transition-colors z-10" />
                        <PasswordInput
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-12 outline-none focus:ring-2 focus:ring-[var(--color-accent-rose)]/20 transition-all placeholder:text-gray-400 font-medium"
                            placeholder="Min. 8 characters"
                            buttonClassName="hover:text-[var(--color-primary-teal)]"
                        />
                    </div>
                </div>

                <div className="flex items-start gap-3 px-1">
                    <label htmlFor="tnc" className="text-sm text-slate-600 font-medium cursor-pointer leading-relaxed">
                        By signing up, you agree to the{' '}
                        <button type="button" onClick={() => setLegalModal({ isOpen: true, type: 'terms' })} className="text-[var(--color-primary-teal)] font-bold hover:underline bg-transparent border-none p-0">
                            Terms of Service
                        </button>{' '}
                        and{' '}
                        <button type="button" onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })} className="text-[var(--color-primary-teal)] font-bold hover:underline bg-transparent border-none p-0">
                            Privacy Policy
                        </button>.
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || formData.password.length < 8}
                    className="w-full bg-[var(--color-primary-teal)] disabled:bg-slate-300 hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 disabled:shadow-none transition-all active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-3 group text-lg"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>

            <div className="text-center pt-2">
                <p className="text-slate-500 text-sm font-medium">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-[var(--color-primary-teal)] font-extrabold hover:underline underline-offset-4 font-sans">
                        Sign in
                    </Link>
                </p>
            </div>

            <LegalModal
                isOpen={legalModal.isOpen}
                onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
                type={legalModal.type}
            />
        </motion.div>
    );
}

// ==========================================
// STEP 2: Language & Region
// ==========================================
interface Step2Props {
    onNext: () => void;
}

function RegisterStep2View({ onNext }: Step2Props) {
    const { user, updateSession } = useAuth();
    const [country, setCountry] = useState(normalizeCountry(user?.country));
    const [preferredLanguage, setPreferredLanguage] = useState(normalizeLanguage(user?.preferredLanguage));
    const [loading, setLoading] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 2,
                    country,
                    preferredLanguage,
                    skipped: false,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save preferences');
            }

            if (updateSession) {
                await updateSession({
                    user: {
                        ...user,
                        country,
                        preferredLanguage,
                        onboardingStep: 3,
                    },
                });
            }

            toast.success('Preferences saved!');
            onNext();
        } catch (err: any) {
            const msg = getFriendlyErrorMessage(err, 'profile');
            toast.error(msg);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        setSkipping(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 2,
                    skipped: true,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to skip step');
            }

            if (updateSession) {
                await updateSession({
                    user: {
                        ...user,
                        onboardingStep: 3,
                    },
                });
            }

            onNext();
        } catch (err: any) {
            console.error('Skip step 2 error:', err);
            // Even if network blips, allow client progression to step 3
            onNext();
        } finally {
            setSkipping(false);
        }
    };

    return (
        <motion.div
            key="step-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-none sm:max-w-md min-h-screen sm:min-h-0 bg-white/95 sm:glass-ios border-none p-6 sm:p-8 space-y-6 sm:space-y-8 relative overflow-y-auto rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl flex flex-col justify-center"
        >
            <div className="text-center space-y-3">
                <div className="mx-auto w-16 h-16 bg-[var(--color-primary-teal)]/10 rounded-full flex items-center justify-center shadow-inner">
                    <Globe className="w-8 h-8 text-[var(--color-primary-teal)]" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Language & Region</h1>
                <p className="text-slate-500/80 font-medium leading-relaxed">
                    Help us personalize your reading and devotion experience
                </p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                        <span>Step 2 of 3: Language & Region</span>
                        <span>66%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary-teal)] rounded-full transition-all duration-500" style={{ width: '66%' }} />
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Country</label>
                        <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-teal)] transition-colors" />
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value as any)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all appearance-none font-semibold text-slate-700 cursor-pointer"
                            >
                                {SUPPORTED_COUNTRIES.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700 ml-1">Preferred Language</label>
                        <div className="relative group">
                            <Languages className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[var(--color-primary-teal)] transition-colors" />
                            <select
                                value={preferredLanguage}
                                onChange={(e) => setPreferredLanguage(e.target.value as any)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all appearance-none font-semibold text-slate-700 cursor-pointer"
                            >
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <option key={lang} value={lang}>
                                        {lang}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading || skipping}
                        className="w-full bg-[var(--color-primary-teal)] disabled:bg-slate-300 hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                    >
                        {loading ? (
                            <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Continue <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={loading || skipping}
                        className="w-full text-slate-400 hover:text-slate-600 font-extrabold py-2.5 transition-colors text-sm tracking-wide"
                    >
                        {skipping ? 'Skipping...' : 'Skip for now'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

// ==========================================
// STEP 3: Bible Translation
// ==========================================
interface Step3Props {
    onBack: () => void;
    onFinish: () => void;
}

function RegisterStep3View({ onBack, onFinish }: Step3Props) {
    const { user, updateSession } = useAuth();
    const [preferredVersion, setPreferredVersion] = useState(normalizeBibleVersion(user?.preferredBibleVersion));
    const [availableVersions, setAvailableVersions] = useState<string[]>(['NKJV', 'KJV', 'NIV', 'ESV']);
    const [loading, setLoading] = useState(false);
    const [skipping, setSkipping] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchVersions = async () => {
            try {
                const res = await fetch('/api/v1/bible/versions');
                const json = await res.json();
                if (json.success && json.data) {
                    const versionsArray = Array.isArray(json.data) ? json.data : json.data.versions;
                    if (versionsArray && versionsArray.length > 0) {
                        const abbrs = versionsArray.map((v: any) => v.abbreviation || v.name).filter(Boolean);
                        if (abbrs.length > 0) {
                            setAvailableVersions(Array.from(new Set([...abbrs, 'NKJV', 'KJV', 'NIV', 'ESV'])));
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch versions:', err);
            }
        };
        fetchVersions();
    }, []);

    const handleFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 3,
                    preferredBibleVersion: preferredVersion,
                    skipped: false,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to finalize registration');
            }

            if (updateSession) {
                await updateSession({
                    user: {
                        ...user,
                        preferredBibleVersion: preferredVersion,
                        onboardingCompleted: true,
                        onboardingStep: 4,
                    },
                });
            }

            toast.success('Registration complete! Welcome to The Bible Net.');
            onFinish();
        } catch (err: any) {
            const msg = getFriendlyErrorMessage(err, 'profile');
            toast.error(msg);
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        setSkipping(true);
        setError('');

        try {
            const res = await fetch('/api/auth/register/step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    step: 3,
                    skipped: true,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to complete registration');
            }

            if (updateSession) {
                await updateSession({
                    user: {
                        ...user,
                        onboardingCompleted: true,
                        onboardingStep: 4,
                    },
                });
            }

            toast.success('Welcome to The Bible Net!');
            onFinish();
        } catch (err: any) {
            console.error('Skip step 3 error:', err);
            onFinish();
        } finally {
            setSkipping(false);
        }
    };

    return (
        <motion.div
            key="step-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-none sm:max-w-md min-h-screen sm:min-h-0 bg-white/95 sm:glass-ios border-none p-6 sm:p-8 space-y-6 sm:space-y-8 relative overflow-y-auto rounded-none sm:rounded-3xl shadow-none sm:shadow-2xl flex flex-col justify-center"
        >
            <div className="text-center space-y-3">
                <div className="relative flex items-center justify-center">
                    <motion.button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        whileHover={{ x: -2, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onBack}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-100/80 text-slate-600 hover:text-[var(--color-primary-teal)] hover:bg-slate-200/80 transition-all outline-none cursor-pointer"
                        title="Back to Step 2"
                        aria-label="Back to Step 2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </motion.button>
                    <div className="mx-auto w-16 h-16 bg-[var(--color-primary-teal)]/10 rounded-full flex items-center justify-center shadow-inner">
                        <BookOpen className="w-8 h-8 text-[var(--color-primary-teal)]" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans">Bible Translation</h1>
                <p className="text-slate-500/80 font-medium leading-relaxed">
                    Choose your default translation. You can switch translations anytime in the reader.
                </p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                        <span>Step 3 of 3: Bible Translation</span>
                        <span>100%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--color-primary-teal)] rounded-full transition-all duration-500" style={{ width: '100%' }} />
                    </div>
                </div>
            </div>

            <form onSubmit={handleFinish} className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 ml-1">Select Translation</label>
                    <div className="grid grid-cols-2 gap-2.5">
                        {availableVersions.slice(0, 6).map((version) => {
                            const isSelected = preferredVersion === version;
                            return (
                                <button
                                    key={version}
                                    type="button"
                                    onClick={() => setPreferredVersion(version)}
                                    className={`p-3.5 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                                        isSelected
                                            ? 'border-[var(--color-primary-teal)] bg-[var(--color-primary-teal)]/10 text-slate-900 shadow-sm'
                                            : 'border-slate-100 bg-gray-50/50 hover:bg-gray-100/50 text-slate-600'
                                    }`}
                                >
                                    <span className="font-bold">{version}</span>
                                    {isSelected && <Check className="w-4 h-4 text-[var(--color-primary-teal)]" />}
                                </button>
                            );
                        })}
                    </div>

                    {availableVersions.length > 6 && (
                        <div className="pt-2">
                            <label className="text-xs font-semibold text-slate-500 ml-1 mb-1 block">Or select from full list:</label>
                            <select
                                value={preferredVersion}
                                onChange={(e) => setPreferredVersion(e.target.value)}
                                className="w-full bg-gray-100/50 border-none rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-[var(--color-primary-teal)]/20 transition-all font-medium text-slate-700 cursor-pointer"
                            >
                                {availableVersions.map((v) => (
                                    <option key={v} value={v}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading || skipping}
                        className="w-full bg-[var(--color-primary-teal)] disabled:bg-slate-300 hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 disabled:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
                    >
                        {loading ? (
                            <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Complete Registration <Sparkles className="w-5 h-5" />
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleSkip}
                        disabled={loading || skipping}
                        className="w-full text-slate-400 hover:text-slate-600 font-extrabold py-2.5 transition-colors text-sm tracking-wide"
                    >
                        {skipping ? 'Finishing...' : 'Skip for now'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
}

// ==========================================
// Central Registration Page Container
// ==========================================
function RegisterContainer() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const stepParam = searchParams.get('step');
    const { status, user, isAuthenticated, isLoading } = useAuth();

    // Route guard effect
    useEffect(() => {
        if (isLoading) return;

        if (isAuthenticated && user) {
            // Already fully onboarded
            if (user.onboardingCompleted) {
                router.replace('/home');
                return;
            }

            // Incomplete onboarding: ensure on correct step
            const pendingStep = (user.onboardingStep ?? 2) >= 3 ? 3 : 2;
            if (stepParam !== String(pendingStep)) {
                router.replace(`/auth/register?step=${pendingStep}`);
            }
            return;
        }

        // Unauthenticated users cannot jump to step 2 or 3
        if (!isAuthenticated && status !== 'loading') {
            if (stepParam === '2' || stepParam === '3') {
                router.replace('/auth/register');
            }
        }
    }, [isLoading, isAuthenticated, user, stepParam, status, router]);

    // Show clean spinner while auth resolves or pending redirect
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 border-3 border-[var(--color-primary-teal)]/30 border-t-[var(--color-primary-teal)] rounded-full animate-spin" />
            </div>
        );
    }

    // Determine active view
    if (isAuthenticated && user && !user.onboardingCompleted) {
        if (stepParam === '3') {
            return (
                <RegisterStep3View
                    onBack={() => router.push('/auth/register?step=2')}
                    onFinish={() => {
                        router.push('/home');
                        router.refresh();
                    }}
                />
            );
        }

        return (
            <RegisterStep2View
                onNext={() => router.push('/auth/register?step=3')}
            />
        );
    }

    // Default: Step 1 (unauthenticated)
    return (
        <RegisterStep1View
            onSuccess={(userId, email) => {
                router.push(`/auth/verify-otp?userId=${userId}&email=${encodeURIComponent(email)}`);
            }}
        />
    );
}

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center">
                    <div className="h-8 w-8 border-3 border-[var(--color-primary-teal)]/30 border-t-[var(--color-primary-teal)] rounded-full animate-spin" />
                </div>
            }
        >
            <RegisterContainer />
        </Suspense>
    );
}
