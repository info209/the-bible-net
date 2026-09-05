'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, ArrowRight, ChevronLeft, IdCard, Contact } from 'lucide-react';
import { PasswordInput } from '@/components/ui/password-input';
import { LegalModal } from '@/components/LegalModal';
import { toast } from '@/context/ToastContext';
import { getFriendlyErrorMessage } from '@/utils/errorMapper';


export default function RegisterStep1() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
    });
    const [tncAccepted, setTncAccepted] = useState(false);
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
                // Success - go to step 2 (OTP)
                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('temp_register_email', formData.email);
                    sessionStorage.setItem('temp_register_password', formData.password);
                }
                router.push(`/auth/verify-otp?userId=${data.data.userId}&email=${encodeURIComponent(data.data.email)}`);
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
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
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-sans px-10">Join The Bible</h1>
                </div>
                <p className="text-slate-500/80 font-medium">Step 1 of 3: Basic details</p>
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
                    <div className="flex items-center h-5 mt-0.5">
                        <input
                            type="checkbox"
                            id="tnc"
                            required
                            checked={tncAccepted}
                            onChange={(e) => setTncAccepted(e.target.checked)}
                            className="w-5 h-5 rounded-[6px] border-slate-300 text-[var(--color-primary-teal)] focus:ring-[var(--color-primary-teal)] accent-[var(--color-primary-teal)] cursor-pointer"
                        />
                    </div>
                    <label htmlFor="tnc" className="text-sm text-slate-600 font-medium cursor-pointer leading-relaxed">
                        I agree to the <button type="button" onClick={() => setLegalModal({ isOpen: true, type: 'terms' })} className="text-[var(--color-primary-teal)] font-bold hover:underline bg-transparent border-none p-0">Terms & conditions</button>.
                    </label>

                </div>

                <button
                    type="submit"
                    disabled={loading || !tncAccepted || !formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim() || formData.password.length < 8}
                    className="w-full bg-[var(--color-primary-teal)] disabled:bg-slate-300 hover:bg-[var(--color-primary-teal-dark)] text-white font-bold py-4 rounded-2xl shadow-xl shadow-[var(--color-primary-teal)]/20 disabled:shadow-none transition-all active:scale-[0.98] disabled:active:scale-100 flex items-center justify-center gap-3 group text-lg"
                >
                    {loading ? (
                        <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Get started <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
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
